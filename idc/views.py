###
# Copyright 2015-2020, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

from builtins import str
import time
import json
import logging
import sys
import datetime

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.contrib.auth.models import User
from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib import messages

from google_helpers.stackdriver import StackDriverLogger
from cohorts.models import Cohort, Cohort_Perms
from idc_collections.models import Program, DataSource, Collection, ImagingDataCommonsVersion
from idc_collections.collex_metadata_utils import build_explorer_context
from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.signals import user_login_failed
from django.dispatch import receiver

debug = settings.DEBUG
logger = logging.getLogger('main_logger')

BQ_ATTEMPT_MAX = 10
WEBAPP_LOGIN_LOG_NAME = settings.WEBAPP_LOGIN_LOG_NAME


# The site's homepage
@never_cache
def landing_page(request):
    collex = Collection.objects.filter(active=True, subject_count__gt=6, collection_type=Collection.ORIGINAL_COLLEX).values()

    sapien_counts = {}

    changes = {
        'Renal': 'Kidney',
        'Head-Neck': 'Head and Neck',
        'Colon': 'Colorectal',
        'Rectum': 'Colorectal'
    }

    for collection in collex:
        loc = collection['location']
        if collection['location'] in changes:
            loc = changes[collection['location']]
        if loc not in sapien_counts:
            sapien_counts[loc] = 0
        sapien_counts[loc] += collection['subject_count']

    ex_tooltips = {
        '1.3.6.1.4.1.14519.5.2.1.6279.6001.224985459390356936417021464571': '<p>Patient ID: LIDC-IDRI-0834</p><p>Modality: CT</p>',
        '1.3.6.1.4.1.14519.5.2.1.1706.4001.149500105036523046215258942545': '<p>Patient ID: TCGA-02-0006</p><p>Modality: MR</p>',
        '1.3.6.1.4.1.14519.5.2.1.2744.7002.950936925946327395356711739684': '<p>Patient ID: QIN-HEADNECK-01-0228</p><p>Modality: PET</p>'
    }

    return render(request, 'idc/landing.html', {
        'request': request,
        'case_counts': [{'site': x, 'cases': sapien_counts[x], 'fileCount': 0} for x in sapien_counts.keys()],
        'example_tooltips': ex_tooltips
    })


# Displays the privacy policy
@never_cache
def privacy_policy(request):
    return render(request, 'idc/privacy.html', {'request': request, })


def collaborators(request):
    return render(request, 'idc/collaborators.html', {'request': request, })


# Returns css_test page used to test css for general ui elements
def css_test(request):
    return render(request, 'idc/css_test.html', {'request': request})


# View for testing methods manually
@login_required
def test_methods(request):
    context = {}
    try:
        # These are example filters; typically they will be reconstituted from the request
        filters = {"vital_status": ["Alive"], "disease_code": ["READ", "BRCA"]}
        # These are the actual data fields to display in the expanding table; again this is just an example
        # set that should be properly supplied in the reuqest
        fields = ["BodyPartExamined", "Modality", "StudyDescription", "StudyInstanceUID", "SeriesInstanceUID",
                  "case_barcode", "disease_code", "sample_type"]

        # get_collex_metadata will eventually branch into 'from BQ' and 'from Solr' depending on if there's a request
        # for a version which isn't current, or for a user cohort
        facets_and_lists = get_collex_metadata(filters, fields)

        if facets_and_lists:
            context = {
                'collex_attr_counts': facets_and_lists['clinical'],
                'cross_collex_attr_counts': facets_and_lists['facets']['cross_collex'],
                'listings': facets_and_lists['docs']
            }

    except Exception as e:
        logger.error("[ERROR] In explore_data:")
        logger.exception(e)

    return render(request, 'idc/explore.html', {'request': request, 'context': context})


# User details page
@login_required
def user_detail(request, user_id):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)

    if int(request.user.id) == int(user_id):

        user = User.objects.get(id=user_id)
        try:
            social_account = SocialAccount.objects.get(user_id=user_id, provider='google')
        except Exception as e:
            # This is a local account
            social_account = None
        user_details = {
            'date_joined':  user.date_joined,
            'email':        user.email,
            'id':           user.id,
            'last_login':   user.last_login
        }

        if social_account:
            user_details['extra_data'] = social_account.extra_data if social_account else None
            user_details['first_name'] = user.first_name
            user_details['last_name'] = user.last_name
        else:
            user_details['username'] = user.username

        return render(request, 'idc/user_detail.html',
                      {'request': request,
                       'user': user,
                       'user_details': user_details,
                       'local_account': bool(social_account is None)
                       })
    else:
        return render(request, '403.html')


@receiver(user_login_failed)
def user_login_failed_callback(sender, credentials, **kwargs):
    try:
        # Write log entry
        st_logger = StackDriverLogger.build_from_django_settings()
        log_name = WEBAPP_LOGIN_LOG_NAME
        st_logger.write_text_log_entry(
            log_name,
            '[WEBAPP LOGIN] Login FAILED for: {credentials}'.format(credentials=credentials)
        )

    except Exception as e:
        logger.exception(e)


# Extended login view so we can track user logins, redirects to data exploration page
def extended_login_view(request):
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

    except Exception as e:
        logger.exception(e)

    return redirect(reverse('explore_data'))


# Health check callback
#
# Because the match for vm_ is always done regardless of its presense in the URL
# we must always provide an argument slot for it
def health_check(request, match):
    return HttpResponse('')


# Returns the basic help page (will direct to contact info and readthedocs
def help_page(request):
    return render(request, 'idc/help.html', {'request': request})


def quota_page(request):
    return render(request, 'idc/quota.html', {'request': request, 'quota': settings.IMG_QUOTA})


# Data exploration and cohort creation page
def explore_data_page(request):
    attr_by_source = {}
    attr_sets = {}
    context = {'request': request}
    is_json = False

    try:
        req = request.GET if request.GET else request.POST
        is_dicofdic = (req.get('is_dicofdic', "False").lower() == "true")
        source = req.get('data_source_type', DataSource.SOLR)
        versions = json.loads(req.get('versions', '[]'))
        filters = json.loads(req.get('filters', '{}'))

        fields = json.loads(req.get('fields', '[]'))
        order_docs = json.loads(req.get('order_docs', '[]'))
        counts_only = (req.get('counts_only', "False").lower() == "true")
        with_related = (req.get('with_clinical', "True").lower() == "true")
        with_derived = (req.get('with_derived', "True").lower() == "true")
        collapse_on = req.get('collapse_on', 'SeriesInstanceUID')
        is_json = (req.get('is_json', "False").lower() == "true")

        context = build_explorer_context(is_dicofdic, source, versions, filters, fields, order_docs, counts_only,
                                         with_related, with_derived, collapse_on, is_json)

    except Exception as e:
        logger.error("[ERROR] While attempting to load the search page:")
        logger.exception(e)
        messages.error(request,
                       "Encountered an error when attempting to load the page - please contact the administrator.")

    if is_json:
        # In the case of is_json=True, the 'context' is simply attr_by_source
        return JsonResponse(context)
    else:
        # These are filters to be loaded *after* a page render
        context['filters_for_load'] = json.loads(req.get('filters_for_load', '{}'))
        context['order'] = {'derived_set': ['dicom_derived_all:segmentation', 'dicom_derived_all:qualitative',
                                            'dicom_derived_all:quantitative']}

        return render(request, 'idc/explore.html', context)


# Callback for recording the user's agreement to the warning popup
def warn_page(request):
    request.session['seenWarning'] = True;
    return JsonResponse({'warning_status': 'SEEN'}, status=200)


# About page
def about_page(request):
    return render(request, 'idc/about.html', {'request': request})


# User dashboard, where saved cohorts (and, in the future, uploaded/indexed data) are listed
@login_required
def dashboard_page(request):
    context = {'request': request}

    try:
        # Cohort List
        cohort_perms = list(set(Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)))
        # TODO: Add in 'date created' and sort on that
        context['cohorts'] = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-name')

        # Program List
        ownedPrograms = request.user.program_set.filter(active=True)
        sharedPrograms = Program.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
        programs = ownedPrograms | sharedPrograms
        context['programs'] = programs.distinct().order_by('-last_date_saved')

    except Exception as e:
        logger.error("[ERROR] While attempting to load the dashboard:")
        logger.exception(e)

    return render(request, 'idc/dashboard.html', context)
