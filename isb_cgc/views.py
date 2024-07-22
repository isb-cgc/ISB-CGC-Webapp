###
#
# Copyright 2015-2024, Institute for Systems Biology
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#    http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
###

from builtins import str
from builtins import map
from past.builtins import basestring
import collections
import json
import logging
import time
import sys
import re
from datetime import datetime, timezone, timedelta
from functools import partial

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.contrib.auth.models import User
from django.dispatch import Signal
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils import formats
from django.core.exceptions import ObjectDoesNotExist
from sharing.service import send_email_message
from django.contrib import messages
from django.db.models import Prefetch

from google_helpers.stackdriver import StackDriverLogger
from cohorts.models import Cohort, Cohort_Perms
from projects.models import Program
from accounts.models import UserOptInStatus
from accounts.sa_utils import get_nih_user_details
from allauth.socialaccount.models import SocialAccount
from django_otp.plugins.otp_email.models import EmailDevice
from django_otp.decorators import otp_required
from django_otp import login
from django.http import HttpResponse, JsonResponse
from django.template.loader import get_template
from django.views.generic.edit import FormView
from google_helpers.bigquery.feedback_support import BigQueryFeedbackSupport
from solr_helpers import build_solr_query, build_solr_facets
from projects.models import DataVersion, DataSource
from solr_helpers import query_solr_and_format_result
from .forms import CgcOtpTokenForm

import requests

debug = settings.DEBUG
logger = logging.getLogger(__name__)

BQ_ATTEMPT_MAX = 10
WEBAPP_LOGIN_LOG_NAME = settings.WEBAPP_LOGIN_LOG_NAME
CITATIONS_BUCKET = settings.CITATIONS_STATIC_URL
IDP = settings.IDP


def _needs_redirect(request):
    appspot_host = '^.*{}\.appspot\.com.*$'.format(settings.GCLOUD_PROJECT_ID.lower())
    return re.search(appspot_host, request.META.get('HTTP_HOST', '')) and not re.search(appspot_host, settings.BASE_URL)


def convert(data):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(list(map(convert, iter(list(data.items())))))
    elif isinstance(data, collections.Iterable):
        return type(data)(list(map(convert, data)))
    else:
        return data


def _decode_list(data):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    rv = []
    for item in data:
        if isinstance(item, str):
            item = item.encode('utf-8')
        elif isinstance(item, list):
            item = _decode_list(item)
        elif isinstance(item, dict):
            item = _decode_dict(item)
        rv.append(item)
    return rv


def _decode_dict(data):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    rv = {}
    for key, value in list(data.items()):
        if isinstance(key, str):
            key = key.encode('utf-8')
        if isinstance(value, str):
            value = value.encode('utf-8')
        elif isinstance(value, list):
            value = _decode_list(value)
        elif isinstance(value, dict):
            value = _decode_dict(value)
        rv[key] = value
    return rv


@never_cache
def landing_page(request):
    logger.info("[STATUS] Received landing page view request at {}".format(
        datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    return render(request, 'isb_cgc/landing.html',
                  {'bq_search_url': settings.BQ_SEARCH_URL, 'mitelman_url': settings.MITELMAN_URL,
                   'tp53_url': settings.TP53_URL})


# Redirect all requests for the old landing page location to isb-cgc.org
def domain_redirect(request):
    try:
        return redirect(settings.BASE_URL) if _needs_redirect(request) else landing_page(request)
    except Exception as e:
        logger.error("[ERROR] While handling domain redirect:")
        logger.exception(e)

    return landing_page(request)

'''
Displays the privacy policy
'''


@never_cache
def privacy_policy(request):
    return render(request, 'isb_cgc/privacy.html', {'request': request, })


'''
Returns css_test page used to test css for general ui elements
'''


def css_test(request):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    return render(request, 'isb_cgc/css_test.html', {'request': request})


'''
Returns page that has user details
'''
@login_required
@otp_required
def user_detail_login(request):
    user_id = request.user.id
    return user_detail(request, user_id)


@login_required
@otp_required
def user_detail(request, user_id):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)

    try:

        if int(request.user.id) == int(user_id):

            user = User.objects.get(id=user_id)

            try:
                social_account = SocialAccount.objects.get(user_id=user_id, provider='google')
            except Exception as e:
                # This is a local account
                social_account = None

            user_status_obj = UserOptInStatus.objects.filter(user=user).first()
            if user_status_obj and user_status_obj.opt_in_status == UserOptInStatus.YES:
                user_opt_in_status = "Opted-In"
            elif user_status_obj and user_status_obj.opt_in_status == UserOptInStatus.NO:
                user_opt_in_status = "Opted-Out"
            else:
                user_opt_in_status = "N/A"

            user_details = {
                'date_joined': user.date_joined,
                'email': user.email,
                'id': user.id,
                'last_login': user.last_login,
                'user_opt_in_status': user_opt_in_status
            }

        forced_logout = 'dcfForcedLogout' in request.session
        nih_details = get_nih_user_details(user_id, forced_logout)
        for key in list(nih_details.keys()):
            user_details[key] = nih_details[key]

            if social_account:
                user_details['extra_data'] = social_account.extra_data if social_account else None
                user_details['first_name'] = user.first_name
                user_details['last_name'] = user.last_name
            else:
                user_details['username'] = user.username

            return render(request, 'isb_cgc/user_detail.html',
                          {'request': request,
                           'idp': IDP,
                           'user': user,
                           'user_details': user_details,
                           'unconnected_local_account': bool(social_account is None),
                           'social_account': bool(social_account is not None)
                           })
        else:
            return render(request, '403.html')

    except Exception as e:
        logger.error("[ERROR] While attempting to view the user details page:")
        logger.exception(e)
        return redirect(reverse("landing_page"))


otp_verification_signal = Signal()


def _handle_otp_verify(sender, request, user, **kwargs):
    """
    Automatically persists an OTP device that was set by an OTP-aware
    AuthenticationForm.
    """
    if hasattr(user, 'otp_device'):
        login(request, user.otp_device)


otp_verification_signal.connect(_handle_otp_verify)


@method_decorator(login_required, name="get")
@method_decorator(login_required, name="post")
@method_decorator(login_required, name="dispatch")
class CgcOtpView(FormView):
    token_form_class = CgcOtpTokenForm
    form_class = None
    template_name = 'isb_cgc/otp_request.html'
    success_url = '/extended_login/'
    next_field = None
    post_request = None

    def _set_next(self, request):
        req = request.GET or request.POST
        self.next_field = req.get("next", None)
        self.success_url = self.success_url + (
            "?next={}".format(self.next_field) if self.next_field else "")

    def get(self, request):
        try:
            EmailDevice.objects.get(user=self.request.user)
        except ObjectDoesNotExist as e:
            EmailDevice.objects.update_or_create(user=self.request.user, name='default', email=self.request.user.email)
        self._set_next(request)
        return super().get(request)

    def post(self, request):
        self._set_next(request)
        self.post_request = request
        return super().post(request)

    def get_form_class(self):
        self.form_class = partial(self.token_form_class, self.request.user, next_field=self.next_field)
        return self.form_class

    def form_valid(self, form):
        result = super().form_valid(form)
        otp_verification_signal.send(sender=self.__class__, request=self.post_request, user=self.post_request.user)
        return result


# Extended login view so we can track user logins
@login_required
@otp_required
def extended_login_view(request):
    redirect_to = 'cohort'
    redirect_url = None
    req = request.GET or request.POST
    print("OTP device: {}".format(request.user.otp_device))
    print(request.session.keys())
    if request.COOKIES and request.COOKIES.get('login_from', None):
        redirect_to = request.COOKIES.get('login_from')
    elif req.get("next", None):
        redirect_to = None
        redirect_url = req.get("next")
    try:
        # Write log entry
        st_logger = StackDriverLogger.build_from_django_settings()
        log_name = WEBAPP_LOGIN_LOG_NAME
        user = User.objects.get(id=request.user.id)
        st_logger.write_text_log_entry(
            log_name,
            "[WEBAPP LOGIN] User {} logged in to the web application at {}".format(user.email,
                                                                                   datetime.utcnow())
        )

        # If user logs in for the second time, or user has not completed the survey, opt-in status changes to NOT_SEEN
        try:
            user_opt_in_stat_obj = UserOptInStatus.objects.get(user=user)
        except ObjectDoesNotExist as e:
            user_opt_in_stat_obj = UserOptInStatus.objects.update_or_create(
                user=user,
                opt_in_status=UserOptInStatus.NEW
            )
        if user_opt_in_stat_obj:
            if user_opt_in_stat_obj.opt_in_status == UserOptInStatus.NEW or \
                    user_opt_in_stat_obj.opt_in_status == UserOptInStatus.SKIP_ONCE:
                user_opt_in_stat_obj.opt_in_status = UserOptInStatus.NOT_SEEN
                user_opt_in_stat_obj.save()
            elif user_opt_in_stat_obj.opt_in_status == UserOptInStatus.SEEN:
                user_opt_in_stat_obj.opt_in_status = UserOptInStatus.SKIP_ONCE
                user_opt_in_stat_obj.save()

    except User.DoesNotExist as e:
        logger.error("[ERROR] User not found! User provided: {}".format(request.user))
    except Exception as e:
        logger.exception(e)

    return redirect(redirect_url or reverse(redirect_to))


# Callback for recording the user's agreement to the warning popup
def warn_page(request):
    request.session['seenWarning'] = True
    return JsonResponse({'warning_status': 'SEEN'}, status=200)


@login_required
@otp_required
def igv(request):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)

    req = request.GET or request.POST
    checked_list = json.loads(req.get('checked_list', '{}'))
    bam_list = []
    build = None

    # This is a POST request with all the information we already need
    if len(checked_list):
        for item in checked_list['gcs_bam']:
            bam_item = checked_list['gcs_bam'][item]
            if not build:
                build = bam_item['build'].lower()
            elif build != bam_item['build'].lower():
                logger.warning("[WARNING] Possible build collision in IGV viewer BAMS: {} vs. {}".format(build,
                                                                                                         bam_item[
                                                                                                             'build'].lower()))
                logger.warning("Dropping any files with build {}".format(bam_item['build'].lower()))
            id_barcode = item.split(',')
            bam_list.append({
                'sample_barcode': id_barcode[1], 'gcs_path': id_barcode[0], 'build': bam_item['build'].lower(),
                'program': bam_item['program']
            })
    # This is a single GET request, we need to get the full file info from Solr first
    else:
        sources = DataSource.objects.filter(source_type=DataSource.SOLR, version=DataVersion.objects.get(
            data_type=DataVersion.FILE_DATA, active=True, build=build))
        gdc_ids = list(set(req.get('gdc_ids', '').split(',')))

        if not len(gdc_ids):
            messages.error(request,
                           "A list of GDC file UUIDs was not provided. Please indicate the files you wish to view.")
        else:
            if len(gdc_ids) > settings.MAX_FILES_IGV:
                messages.warning(request,
                                 "The maximum number of files which can be viewed in IGV at one time is {}.".format(
                                     settings.MAX_FILES_IGV) +
                                 " Only the first {} will be displayed.".format(settings.MAX_FILES_IGV))
                gdc_ids = gdc_ids[:settings.MAX_FILES_IGV]

            for source in sources:
                result = query_solr_and_format_result(
                    {
                        'collection': source.name,
                        'fields': ['sample_barcode', 'file_node_id', 'file_name_key', 'index_file_name_key',
                                   'program_name', 'access'],
                        'query_string': 'file_node_id:("{}") AND data_format:("BAM")'.format('" "'.join(gdc_ids)),
                        'counts_only': False
                    }
                )
                if 'docs' not in result or not len(result['docs']):
                    messages.error(request,
                                   "IGV compatible files corresponding to the following UUIDs were not found: {}.".format(
                                       " ".join(gdc_ids))
                                   + "Note that the default build is HG38; to view HG19 files, you must indicate the build as HG19: &build=hg19")
                else:
                    saw_controlled = False
                    for doc in result['docs']:
                        if doc['access'] == 'controlled':
                            saw_controlled = True
                        bam_list.append({
                            'sample_barcode': doc['sample_barcode'],
                            'gcs_path': "{};{}".format(doc['file_name_key'], doc['index_file_name_key']),
                            'build': build,
                            'program': doc['program_name']
                        })
                    if saw_controlled:
                        messages.info(request,
                                      "Some of the requested files require approved access to controlled data - if you receive a 403 error, double-check your current login status with DCF.")

    context = {
        'bam_list': bam_list,
        'base_url': settings.BASE_URL,
        'oauth_client_id': settings.OAUTH2_CLIENT_ID,
        'build': build,
    }

    return render(request, 'isb_cgc/igv.html', context)


def path_report(request, report_file=None):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)
    context = {}

    try:
        if not path_report:
            messages.error(
                "Error while attempting to display this pathology report: a report file name was not provided.")
            return redirect(reverse('cohort_list'))
        uri = "https://nci-crdc.datacommons.io/user/data/download/{}?protocol=gs".format(report_file)
        response = requests.get(uri)

        if response.status_code != 200:
            logger.warning("[WARNING] From IndexD: {}".format(response.text))
            raise Exception("Received a status code of {} from IndexD.".format(str(response.status_code)))

        anon_signed_uri = response.json()['url']

        template = 'isb_cgc/path-pdf.html'

        context['path_report_file'] = anon_signed_uri
    except Exception as e:
        logger.error("[ERROR] While trying to load Pathology report:")
        logger.exception(e)
        logger.error("Attempted URI: {}".format(uri))
        return render(request, '500.html')

    return render(request, template, context)


# Because the match for vm_ is always done regardless of its presense in the URL
# we must always provide an argument slot for it
#
def health_check(request, match):
    return HttpResponse('')


def help_page(request):
    return render(request, 'isb_cgc/help.html')


def about_page(request):
    return render(request, 'isb_cgc/about.html')


def citations_page(request):
    citations_file_name = 'mendeley_papers.json'
    citations_file_path = CITATIONS_BUCKET + citations_file_name
    citations = requests.get(citations_file_path).json()
    return render(request, 'isb_cgc/citations.html', citations)


def vid_tutorials_page(request):
    return render(request, 'isb_cgc/video_tutorials.html')


def how_to_discover_page(request):
    return render(request, 'how_to_discover_page.html')


def contact_us(request):
    return render(request, 'isb_cgc/contact_us.html')


def bq_meta_search(request, full_table_id=""):
    bq_filter_list = ["status=current"]
    parameter_list = ["projectId", "datasetId", "tableId"]
    bq_filter = ''
    if full_table_id:
        full_table_id_list = full_table_id.split(".")
        for i in range(len(full_table_id_list)):
            if i:
                field_val = '"'+ full_table_id_list[i]+'"'
            else:
                field_val = full_table_id_list[i]
            bq_filter_list.append('{parameter}={field_val}'.format(parameter=parameter_list[i], field_val=field_val))

        bq_filter = 'search?' + ('&'.join(bq_filter_list))
    return redirect(settings.BQ_SEARCH_URL + bq_filter)


def programmatic_access_page(request):
    return render(request, 'isb_cgc/programmatic_access.html')


def workflow_page(request):
    return render(request, 'isb_cgc/workflow.html')


@login_required
@otp_required
def opt_in_check_show(request):
    try:
        obj, created = UserOptInStatus.objects.get_or_create(user=request.user)
        result = (obj.opt_in_status == UserOptInStatus.NOT_SEEN)
    except Exception as e:
        result = False

    return JsonResponse({
        'result': result
    })


@login_required
@otp_required
def opt_in_update(request):
    # If user logs in for the second time, opt-in status changes to NOT_SEEN
    error_msg = ''
    opt_in_selection = ''
    redirect_url = ''
    if request.POST:
        opt_in_selection = request.POST.get('opt-in-selection')

    try:
        user_opt_in_stat_obj = UserOptInStatus.objects.filter(user=request.user).first()
        feedback_form_link = request.build_absolute_uri(reverse('opt_in_form_reg_user'))

        if user_opt_in_stat_obj:
            user_opt_in_stat_obj.opt_in_status = UserOptInStatus.SEEN
            user_opt_in_stat_obj.save()
            if opt_in_selection == 'yes' or opt_in_selection == 'no':
                feedback_form_link_template = feedback_form_link + '?opt_in_selection={opt_in_selection}'
                feedback_form_link_params = feedback_form_link_template.format(opt_in_selection=opt_in_selection)
                redirect_url = feedback_form_link_params

    except Exception as e:
        error_msg = '[Error] There has been an error while updating your subscription status.'
        logger.exception(e)
        logger.error(error_msg)

    return JsonResponse({
        'redirect-url': redirect_url,
        'error_msg': error_msg
    })


def send_feedback_form(user_email, firstName, lastName, formLink):
    status = None
    message = None

    try:
        email_template = get_template('sharing/email_opt_in_form.html')
        ctx = {
            'firstName': firstName,
            'lastName': lastName,
            'formLink': formLink
        }
        message_data = {
            'from': settings.NOTIFICATION_EMAIL_FROM_ADDRESS,
            'to': user_email,
            'subject': 'Join the ISB-CGC community!',
            'text':
                ('Dear {firstName} {lastName},\n\n' +
                 'ISB-CGC is funded by the National Cancer Institute (NCI) to provide cloud-based tools and data to the cancer research community.\n' +
                 'Your feedback is important to the NCI and us.\n' +
                 'Please help us by filling out this form:\n' +
                 '{formLink}\n' +
                 'Thank you.\n\n' +
                 'ISB-CGC team').format(firstName=firstName, lastName=lastName, formLink=formLink),
            'html': email_template.render(ctx)
        }
        send_email_message(message_data)
    except Exception as e:
        status = 'error'
        message = '[Error] There has been an error while trying to send an email to {}.'.format(user_email)
    return {
        'status': status,
        'message': message
    }


@login_required
@otp_required
def form_reg_user(request):
    return opt_in_form(request);


def opt_in_form(request):
    template = 'isb_cgc/opt_in_form.html'
    opt_in_status = 'opt-in'

    if request.user.is_authenticated:
        user = request.user
        first_name = user.first_name
        last_name = user.last_name
        email = user.email
        opt_in_status_obj = UserOptInStatus.objects.filter(user=user).first()
        if opt_in_status_obj and opt_in_status_obj.opt_in_status == UserOptInStatus.NO:
            opt_in_status = 'opt-out'
        selection = request.GET.get('opt_in_selection') if request.GET.get('opt_in_selection') else ''
        if selection == 'yes':
            opt_in_status = 'opt-in'
        elif selection == 'no':
            opt_in_status = 'opt-out'

    else:
        email = request.GET.get('email') if request.GET.get('email') else ''
        first_name = request.GET.get('first_name') if request.GET.get('first_name') else ''
        last_name = request.GET.get('last_name') if request.GET.get('last_name') else ''

    form = {'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'opt_in_status': opt_in_status
            }

    return render(request, template, form)


@csrf_protect
def opt_in_form_submitted(request):
    msg = ''
    error_msg = ''
    template = 'isb_cgc/opt_in_form_submitted.html'

    # get values and update optin status
    first_name = request.POST.get('first-name')
    last_name = request.POST.get('last-name')
    email = request.POST.get('email')
    affiliation = request.POST.get('affiliation')
    feedback = request.POST.get('feedback')
    subscribed = (request.POST.get('subscribed') == 'opt-in')

    try:
        users = User.objects.filter(email__iexact=email)
        if len(users) > 0:
            user = users.first()
            user_opt_in_stat_obj = UserOptInStatus.objects.filter(user=user).first()
            if user_opt_in_stat_obj:
                user_opt_in_stat_obj.opt_in_status = UserOptInStatus.YES if subscribed else UserOptInStatus.NO
                user_opt_in_stat_obj.save()
                feedback_row = {
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "affiliation": affiliation,
                    "subscribed": subscribed,
                    "feedback": feedback,
                    "submitted_time": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                }
                BigQueryFeedbackSupport.add_rows_to_table([feedback_row])
                # send a notification to feedback@isb-cgc.org about the entry
                if settings.IS_UAT or settings.IS_DEV:
                    logger.info("[STATUS] UAT/DEV: sent email for feedback")
                else:
                    # send a notification to feedback@isb-cgc.org about the entry
                    send_feedback_notification(feedback_row)
                msg = 'We thank you for your time and suggestions.'
        else:
            error_msg = 'We were not able to find a user with the given email. Please check with us again later.'
            logger.error(error_msg)
    except Exception as e:
        error_msg = 'We were not able to submit your feedback due to some errors. Please check with us again later.'
        logger.exception(e)
        logger.error(error_msg)

    message = {
        'msg': msg,
        'error_msg': error_msg
    }
    return render(request, template, message)


def send_feedback_notification(feedback_dict):
    try:
        message_data = {
            'from': settings.NOTIFICATION_EMAIL_FROM_ADDRESS,
            'to': settings.NOTIFICATION_EMAIL_TO_ADDRESS,
            'subject': '[ISB-CGC] A user feedback has been submitted.',
            'text':
                ('We have just received a user feedback from ISB-CGC WebApp at {timestamp} (UTC).\n\n' +
                 'Here is what has been received:\n\n---------------------------------------\n' +
                 'First Name: {firstName}\n' +
                 'Last Name: {lastName}\n' +
                 'E-mail: {email}\n' +
                 'Affiliation: {affiliation}\n' +
                 'Subscribed: {subscribed}\n' +
                 'Feedback: {feedback}\n\n---------------------------------------\n' +
                 'Thank you.\n\n' +
                 'ISB-CGC team').format(
                    timestamp=feedback_dict['submitted_time'],
                    firstName=feedback_dict['first_name'],
                    lastName=feedback_dict['last_name'],
                    email=feedback_dict['email'],
                    affiliation=feedback_dict['affiliation'],
                    subscribed=('Yes' if feedback_dict['subscribed'] else 'No'),
                    feedback=feedback_dict['feedback'])}
        send_email_message(message_data)
    except Exception as e:
        logger.error('[Error] Error has occured while sending out feedback notifications to {}.'.format(
            settings.NOTIFICATION_EMAIL_TO_ADDRESS))
        logger.exception(e)
