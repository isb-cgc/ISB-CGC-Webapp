"""
Copyright 2015-2019, Institute for Systems Biology
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
   http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

from builtins import str
from builtins import map
from past.builtins import basestring
import collections
import json
import logging
import sys
import re
import datetime

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.contrib.auth.models import User
from django.db.models import Count
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils import formats
from django.core.exceptions import ObjectDoesNotExist
# from django.core.mail import send_mail
from sharing.service import send_email_message
from django.contrib import messages
from googleapiclient import discovery
from oauth2client.client import GoogleCredentials

from google_helpers.directory_service import get_directory_resource
from google_helpers.bigquery.bq_support import BigQuerySupport
from google_helpers.stackdriver import StackDriverLogger
from cohorts.metadata_helpers import get_sample_metadata
from googleapiclient.errors import HttpError
from visualizations.models import SavedViz
from cohorts.models import Cohort, Cohort_Perms
from projects.models import Program
from workbooks.models import Workbook
from accounts.models import GoogleProject, UserOptInStatus
from accounts.sa_utils import get_nih_user_details
# from notebooks.notebook_vm import check_vm_stat
from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponse, JsonResponse
from django.template.loader import get_template
from google_helpers.bigquery.service import get_bigquery_service
from google_helpers.bigquery.feedback_support import BigQueryFeedbackSupport

import requests

debug = settings.DEBUG
logger = logging.getLogger('main_logger')

OPEN_ACL_GOOGLE_GROUP = settings.OPEN_ACL_GOOGLE_GROUP
BQ_ATTEMPT_MAX = 10
WEBAPP_LOGIN_LOG_NAME = settings.WEBAPP_LOGIN_LOG_NAME
BQ_ECOSYS_BUCKET = settings.BQ_ECOSYS_STATIC_URL


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


'''
Handles login and user creation for new users.
Returns user to landing page.
'''


@never_cache
def landing_page(request):
    logger.info("[STATUS] Received landing page view request at {}".format(datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    return render(request, 'isb_cgc/landing.html', {'request': request, })


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
def user_detail(request, user_id):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)

    if int(request.user.id) == int(user_id):

        user = User.objects.get(id=user_id)
        social_account = SocialAccount.objects.get(user_id=user_id, provider='google')

        user_status_obj = UserOptInStatus.objects.filter(user=user).first()
        if user_status_obj and user_status_obj.opt_in_status == UserOptInStatus.NEW:
            user_status_obj.opt_in_status = UserOptInStatus.NOT_SEEN
            user_status_obj.save()
        if user_status_obj and user_status_obj.opt_in_status == UserOptInStatus.YES:
            user_opt_in_status = "Opted-In"
        elif user_status_obj and user_status_obj.opt_in_status == UserOptInStatus.NO:
            user_opt_in_status = "Opted-Out"
        else:
            user_opt_in_status = "N/A"

        user_details = {
            'date_joined': user.date_joined,
            'email': user.email,
            'extra_data': social_account.extra_data,
            'first_name': user.first_name,
            'id': user.id,
            'last_login': user.last_login,
            'last_name': user.last_name,
            'user_opt_in_status': user_opt_in_status
        }

        user_details['gcp_list'] = len(GoogleProject.objects.filter(user=user))

        forced_logout = 'dcfForcedLogout' in request.session
        nih_details = get_nih_user_details(user_id, forced_logout)
        for key in list(nih_details.keys()):
            user_details[key] = nih_details[key]

        return render(request, 'isb_cgc/user_detail.html',
                      {'request': request,
                       'user': user,
                       'user_details': user_details
                       })
    else:
        return render(request, '403.html')


@login_required
def bucket_object_list(request):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)
    credentials = GoogleCredentials.get_application_default()
    service = discovery.build('storage', 'v1', credentials=credentials, cache_discovery=False)

    req = service.objects().list(bucket='isb-cgc-dev')
    resp = req.execute()
    object_list = None
    if 'items' in resp:
        object_list = json.dumps(resp['items'])

        return HttpResponse(object_list)


# Extended login view so we can track user logins
def extended_login_view(request):
    redirect_to = 'dashboard'
    if request.COOKIES and request.COOKIES.get('login_from', '') == 'new_cohort':
        redirect_to = 'cohort'
    try:
        # Write log entry
        st_logger = StackDriverLogger.build_from_django_settings()
        log_name = WEBAPP_LOGIN_LOG_NAME
        user = User.objects.get(id=request.user.id)
        st_logger.write_text_log_entry(
            log_name,
            "[WEBAPP LOGIN] User {} logged in to the web application at {}".format(user.email,
                                                                                   datetime.datetime.utcnow())
        )

        # If user logs in for the second time, or user has not completed the survey, opt-in status changes to NOT_SEEN
        user_opt_in_stat_obj = UserOptInStatus.objects.filter(user=user).first()
        if user_opt_in_stat_obj and \
                (user_opt_in_stat_obj.opt_in_status == UserOptInStatus.NEW or user_opt_in_stat_obj.opt_in_status == UserOptInStatus.SEEN):
            user_opt_in_stat_obj.opt_in_status = UserOptInStatus.NOT_SEEN
            user_opt_in_stat_obj.save()

    except Exception as e:
        logger.exception(e)

    return redirect(reverse(redirect_to))


'''
Returns page users see after signing in
'''


@login_required
def user_landing(request):
    directory_service, http_auth = get_directory_resource()
    user_email = User.objects.get(id=request.user.id).email
    # add user to isb-cgc-open if they are not already on the group
    try:
        body = {
            "email": user_email,
            "role": "MEMBER"
        }
        directory_service.members().insert(
            groupKey=OPEN_ACL_GOOGLE_GROUP,
            body=body
        ).execute(http=http_auth)

    except HttpError as e:
        logger.info(e)

    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)
    # check to see if user has read access to 'All TCGA Data' cohort
    isb_superuser = User.objects.get(is_staff=True,is_superuser=True,is_active=True)
    superuser_perm = Cohort_Perms.objects.get(user=isb_superuser)
    user_all_data_perm = Cohort_Perms.objects.filter(user=request.user, cohort=superuser_perm.cohort)
    if not user_all_data_perm:
        Cohort_Perms.objects.create(user=request.user, cohort=superuser_perm.cohort, perm=Cohort_Perms.READER)

    # add_data_cohort = Cohort.objects.filter(name='All TCGA Data')

    users = User.objects.filter(is_superuser=0)
    cohort_perms = Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-last_date_saved').annotate(
        num_cases=Count('samples__case_barcode'))

    for item in cohorts:
        item.perm = item.get_perm(request).get_perm_display()
        item.owner = item.get_owner()
        # print local_zone.localize(item.last_date_saved)

    # viz_perms = Viz_Perms.objects.filter(user=request.user).values_list('visualization', flat=True)
    visualizations = SavedViz.objects.generic_viz_only(request).order_by('-last_date_saved')
    for item in visualizations:
        item.perm = item.get_perm(request).get_perm_display()
        item.owner = item.get_owner()

    seqpeek_viz = SavedViz.objects.seqpeek_only(request).order_by('-last_date_saved')
    for item in seqpeek_viz:
        item.perm = item.get_perm(request).get_perm_display()
        item.owner = item.get_owner()

    # Used for autocomplete listing
    cohort_listing = Cohort.objects.filter(id__in=cohort_perms, active=True).values('id', 'name')
    for cohort in cohort_listing:
        cohort['value'] = int(cohort['id'])
        cohort['label'] = cohort['name'].encode('utf8')
        del cohort['id']
        del cohort['name']

    return render(request, 'isb_cgc/user_landing.html', {'request': request,
                                                         'cohorts': cohorts,
                                                         'user_list': users,
                                                         'cohorts_listing': cohort_listing,
                                                         'visualizations': visualizations,
                                                         'seqpeek_list': seqpeek_viz,
                                                         'base_url': settings.BASE_URL,
                                                         'base_api_url': settings.BASE_API_URL
                                                         })


'''
DEPRECATED - Returns Results from text search
'''


@login_required
def search_cohorts_viz(request):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)
    q = request.GET.get('q', None)
    result_obj = {
        'q': q
    }
    if q:
        cohort_results = Cohort.objects.search(q)
        list = []
        for cohort in cohort_results:
            list.append({
                'id': cohort.id,
                'name': cohort.name,
                'last_date_saved': formats.date_format(cohort.last_date_saved, 'DATETIME_FORMAT'),
                'owner': cohort.get_owner().email,
                'samples': len(cohort.samples_set.all())
            })
        result_obj['cohorts'] = list
        list = []
        viz_results = SavedViz.objects.search(q)
        for viz in viz_results:
            list.append({
                'id': viz.id,
                'name': viz.name,
                'last_date_saved': formats.date_format(viz.last_date_saved, 'DATETIME_FORMAT'),
                'plots': len(viz.plot_set.all()),
                'owner': viz.get_owner().email
            })
        result_obj['visualizations'] = list
    return HttpResponse(json.dumps(result_obj), status=200)


# get_image_data which allows for URI arguments, falls through to get_image_data(request, slide_barcode)
def get_image_data_args(request):
    file_uuid = None
    if request.GET:
        file_uuid = request.GET.get('file_uuid', None)
    elif request.POST:
        file_uuid = request.POST.get('file_uuid', None)

    if file_uuid:
        file_uuid = (None if re.compile(r'[^A-Za-z0-9\-]').search(file_uuid) else file_uuid)

    return get_image_data(request, file_uuid)


# Given a slide_barcode, returns image metadata in JSON format
def get_image_data(request, file_uuid):
    status = 200
    result = {}

    if not file_uuid:
        status = 503
        result = {
            'message': "There was an error while processing this request: a valid file UUID was not supplied."
        }
    else:
        try:
            img_data_query = """
                SELECT slide_barcode, level_0__width AS width, level_0__height AS height, mpp_x, mpp_y, file_gcs_url, sample_barcode, case_barcode, file_gdc_id
                FROM [isb-cgc:metadata.TCGA_slide_images]
                WHERE file_gdc_id = '{}';
            """

            query_results = BigQuerySupport.execute_query_and_fetch_results(img_data_query.format(file_uuid))

            if query_results and len(query_results) > 0:
                result = {
                    'slide-barcode': query_results[0]['f'][0]['v'],
                    'Width': query_results[0]['f'][1]['v'],
                    'Height': query_results[0]['f'][2]['v'],
                    'MPP-X': query_results[0]['f'][3]['v'],
                    'MPP-Y': query_results[0]['f'][4]['v'],
                    'FileLocation': query_results[0]['f'][5]['v'],
                    'TissueID': query_results[0]['f'][0]['v'],
                    'sample-barcode': query_results[0]['f'][6]['v'],
                    'case-barcode': query_results[0]['f'][7]['v'],
                    'file-uuid': query_results[0]['f'][8]['v'],
                    'img-type': ('Diagnostic Image' if query_results[0]['f'][0]['v'].split("-")[-1].startswith(
                        "DX") else 'Tissue Slide Image' if query_results[0]['f'][0]['v'].split("-")[-1].startswith(
                        "TS") else "N/A")
                }

                sample_metadata = get_sample_metadata(result['sample-barcode'])
                result['disease-code'] = sample_metadata['disease_code']
                result['project'] = sample_metadata['project']

            else:
                result = {
                    'msg': 'File UUID {} was not found.'.format(file_uuid)
                }

        except Exception as e:
            logger.error("[ERROR] While attempting to retrieve image data for {}:".format(file_uuid))
            logger.exception(e)
            status = '503'
            result = {
                'message': "There was an error while processing this request."
            }

    return JsonResponse(result, status=status)


def get_tbl_preview(request, proj_id, dataset_id, table_id):
    status = 200
    MAX_ROW = 8
    if not proj_id or not dataset_id or not table_id:
        status = 503
        result = {
            'message': "There was an error while processing this request: one or more required parameters (project id, dataset_id or table_id) were not supplied."
        }
    else:
        try:
            bq_service = get_bigquery_service()
            response = bq_service.tabledata().list(projectId=proj_id, datasetId=dataset_id, tableId=table_id,
                                                   maxResults=MAX_ROW).execute()
            if response and int(response['totalRows']) > 0:
                result = {
                    'rows': response['rows']
                }
            else:
                result = {
                    'msg': 'No record has been found for table { proj_id }{ dataset_id }{ table_id }.'.format(
                        proj_id=proj_id,
                        dataset_id=dataset_id,
                        table_id=table_id)
                }

        except Exception as e:
            logger.error(
                "[ERROR] While attempting to retrieve preview data for { proj_id }{ dataset_id }{ table_id } table.".format(
                    proj_id=proj_id,
                    dataset_id=dataset_id,
                    table_id=table_id))
            logger.exception(e)
            status = '503'
            result = {
                'message': "There was an error while processing this request."
            }

    return JsonResponse(result, status=status)


@login_required
def dicom(request, study_uid=None):
    template = 'isb_cgc/dicom.html'

    context = {
        'study_uid': study_uid,
        'dicom_viewer': settings.DICOM_VIEWER
    }
    return render(request, template, context)


@login_required
def camic(request, file_uuid=None):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)
    context = {}

    if not file_uuid:
        messages.error("Error while attempting to display this pathology image: a file UUID was not provided.")
        return redirect(reverse('cohort_list'))

    images = [{'file_uuid': file_uuid, 'thumb': '', 'type': ''}]
    template = 'isb_cgc/camic_single.html'

    context['files'] = images
    context['camic_viewer'] = settings.CAMIC_VIEWER
    context['img_thumb_url'] = settings.IMG_THUMBS_URL

    return render(request, template, context)


@login_required
def igv(request, sample_barcode=None, readgroupset_id=None):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)

    readgroupset_list = []
    bam_list = []

    checked_list = json.loads(request.POST.get('checked_list','{}'))
    build = request.POST.__getitem__('build')

    for item in checked_list['gcs_bam']:
        bam_item = checked_list['gcs_bam'][item]
        id_barcode = item.split(',')
        bam_list.append({
            'sample_barcode': id_barcode[1], 'gcs_path': id_barcode[0], 'build': build, 'program': bam_item['program']
        })

    context = {
        'readgroupset_list': readgroupset_list,
        'bam_list': bam_list,
        'base_url': settings.BASE_URL,
        'service_account': settings.OAUTH2_CLIENT_ID,
        'build': build,
    }

    return render(request, 'isb_cgc/igv.html', context)


@login_required
def path_report(request, report_file=None):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)
    context = {}

    try:
        if not path_report:
            messages.error(
                "Error while attempting to display this pathology report: a report file name was not provided.")
            return redirect(reverse('cohort_list'))

        response = requests.get("https://nci-crdc.datacommons.io/user/data/download/{}?protocol=gs".format(report_file))

        if response.status_code != 200:
            logger.warning("[WARNING] From IndexD: {}".format(response.text))
            raise Exception("Received a status code of {} from IndexD.".format(str(response.status_code)))

        anon_signed_uri = response.json()['url']

        template = 'isb_cgc/path-pdf.html'

        context['path_report_file'] = anon_signed_uri
    except Exception as e:
        logger.error("[ERROR] While trying to load Pathology report:")
        logger.exception(e)
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


def vid_tutorials_page(request):
    return render(request, 'isb_cgc/video_tutorials.html')


def bq_meta_search(request):
    bq_filter_file_name = 'bq_meta_filters.json'
    bq_filter_file_path = BQ_ECOSYS_BUCKET + bq_filter_file_name
    bq_filters = requests.get(bq_filter_file_path).json()
    return render(request, 'isb_cgc/bq_meta_search.html', bq_filters)


def bq_meta_data(request):
    bq_meta_data_file_name = 'bq_meta_data.json'
    bq_meta_data_file_path = BQ_ECOSYS_BUCKET + bq_meta_data_file_name
    bq_meta_data = requests.get(bq_meta_data_file_path).json()
    return JsonResponse(bq_meta_data, safe=False)


@login_required
def dashboard_page(request):
    context = {}
    try:
        # Cohort List
        isb_superuser = User.objects.get(is_staff=True, is_superuser=True, is_active=True)
        public_cohorts = Cohort_Perms.objects.filter(user=isb_superuser, perm=Cohort_Perms.OWNER).values_list('cohort',
                                                                                                              flat=True)
        cohort_perms = list(set(Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True).exclude(
            cohort__id__in=public_cohorts)))
        cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-last_date_saved')

        # Program List
        ownedPrograms = request.user.program_set.filter(active=True)
        sharedPrograms = Program.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
        programs = ownedPrograms | sharedPrograms
        programs = programs.distinct().order_by('-last_date_saved')

        # Workbook List
        userWorkbooks = request.user.workbook_set.filter(active=True)
        sharedWorkbooks = Workbook.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
        workbooks = userWorkbooks | sharedWorkbooks
        workbooks = workbooks.distinct().order_by('-last_date_saved')

        # # Notebook VM Instance
        # user_instances = request.user.instance_set.filter(active=True)
        # user = User.objects.get(id=request.user.id)
        # gcp_list = GoogleProject.objects.filter(user=user, active=1)
        # vm_username = request.user.email.split('@')[0]
        # client_ip = get_ip_address_from_request(request)
        # logger.debug('client_ip: '+client_ip)
        # client_ip_range = ', '.join([client_ip])
        #
        # if user_instances:
        #     user_vm = user_instances[0]
        #     machine_name = user_vm.name
        #     project_id = user_vm.gcp.project_id
        #     zone = user_vm.zone
        #     result = check_vm_stat(project_id, zone, machine_name)
        #     status = result['status']
        # else:
        #     # default values to fill in fields in form
        #     project_id = ''
        #     # remove special characters
        #     machine_header = re.sub(r'[^A-Za-z0-9]+', '', vm_username.lower())
        #     machine_name = '{}-jupyter-vm'.format(machine_header)
        #     zone = 'us-central1-c'
        #     status = 'NOT FOUND'
        #
        # notebook_vm = {
        #     'user': vm_username,
        #     'project_id': project_id,
        #     'name': machine_name,
        #     'zone': zone,
        #     'client_ip_range': client_ip_range,
        #     'status': status
        # }

        # Gene & miRNA Favorites
        genefaves = request.user.genefavorite_set.filter(active=True)

        # Variable Favorites
        varfaves = request.user.variablefavorite_set.filter(active=True)

        context = {
            'request': request,
            'cohorts': cohorts,
            'programs': programs,
            'workbooks': workbooks,
            'genefaves': genefaves,
            'varfaves': varfaves,
            # 'optinstatus': opt_in_status
            # 'notebook_vm': notebook_vm,
            # 'gcp_list': gcp_list,
        }

    except Exception as e:
        logger.error("[ERROR] While prepping dashboard:")
        logger.exception(e)
        messages.error(request, "Encountered an error while building the dashboard - please contact the administrator.")

    return render(request, 'isb_cgc/dashboard.html', context)


@login_required
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
def opt_in_update(request):
    # If user logs in for the second time, opt-in status changes to NOT_SEEN
    error_msg = ''
    opt_in_choice = ''
    redirect_url = ''
    if request.POST:
        opt_in_choice = request.POST.get('opt-in-radio')

    try:
        user_opt_in_stat_obj = UserOptInStatus.objects.filter(user=request.user).first()
        feedback_form_link = request.build_absolute_uri(reverse('opt_in_form'))

        if user_opt_in_stat_obj:
            if opt_in_choice == 'opt-out':
                opt_in_status_code = UserOptInStatus.NO
                user_opt_in_stat_obj.opt_in_status = opt_in_status_code
                user_opt_in_stat_obj.save()
            elif user_opt_in_stat_obj.opt_in_status == UserOptInStatus.NOT_SEEN:
                # user chosen Yes or cancel (dismiss) and status is still not_seen
                opt_in_status_code = UserOptInStatus.SEEN
                user_opt_in_stat_obj.opt_in_status = opt_in_status_code
                user_opt_in_stat_obj.save()

        if opt_in_choice.startswith('opt-in-'):
            user_email = request.user.email
            first_name = request.user.first_name
            last_name = request.user.last_name

            if opt_in_choice == 'opt-in-email':
                feedback_form_link_template = feedback_form_link + '?email={email}&first_name={firstName}&last_name={lastName}'
                feedback_form_link_params = feedback_form_link_template.format(email=user_email, firstName=first_name,
                                                                        lastName=last_name)
                resp = send_feedback_form(user_email, first_name, last_name, feedback_form_link_params)
                if resp['status'] == 'error':
                    error_msg = resp['message']
            else:  # opt-in-now
                redirect_url = feedback_form_link

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

def opt_in_form_submitted(request):
    msg = ''
    error_msg = ''
    template = 'isb_cgc/opt_in_form_submitted.html'

    # get values and update optin status
    first_name= request.POST.get('first-name')
    last_name= request.POST.get('last-name')
    email= request.POST.get('email')
    affiliation= request.POST.get('affiliation')
    feedback= request.POST.get('feedback')
    subscribed = (request.POST.get('subscribed') == 'opt-in')

    try:
        users = User.objects.filter(email__iexact=email)
        if len(users) > 0:
            user = users.first()
            user_opt_in_stat_obj = UserOptInStatus.objects.filter(user=user).first()
            if user_opt_in_stat_obj:
                user_opt_in_stat_obj.opt_in_status = UserOptInStatus.YES if subscribed else UserOptInStatus.NO
                user_opt_in_stat_obj.save()
                # record to store in bq table
                feedback_row = {
                    "email": email,
                    "first_name": first_name,
                    "last_name": last_name,
                    "affiliation": affiliation,
                    "subscribed": subscribed,
                    "feedback": feedback,
                    "submitted_time": datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
                }
                BigQueryFeedbackSupport.add_rows_to_table([feedback_row])
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
        logger.error('[Error] Error has occured while sending out feedback notifications to {}.'.format(settings.NOTIFICATION_EMAIL_TO_ADDRESS))
        logger.exception(e)