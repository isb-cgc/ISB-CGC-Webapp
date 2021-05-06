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
from .models import AppInfo
from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.signals import user_login_failed
from django.dispatch import receiver

from django.utils.html import escape

debug = settings.DEBUG
logger = logging.getLogger('main_logger')

BQ_ATTEMPT_MAX = 10
WEBAPP_LOGIN_LOG_NAME = settings.WEBAPP_LOGIN_LOG_NAME




def cohort_detail(request, cohort_id):
    if debug: logger.debug('Called {}'.format(sys._getframe().f_code.co_name))

    try:
        req = request.GET if request.GET else request.POST
        is_dicofdic = (req.get('is_dicofdic', "False").lower() == "true")
        source = req.get('data_source_type', DataSource.SOLR)
        fields = json.loads(req.get('fields', '[]'))
        order_docs = json.loads(req.get('order_docs', '[]'))
        counts_only = (req.get('counts_only', "False").lower() == "true")
        with_related = (req.get('with_clinical', "True").lower() == "true")
        with_derived = (req.get('with_derived', "True").lower() == "true")
        collapse_on = req.get('collapse_on', 'SeriesInstanceUID')

        cohort = Cohort.objects.get(id=cohort_id, active=True)
        cohort.perm = cohort.get_perm(request)
        cohort.owner = cohort.get_owner()

        if not cohort.perm:
            messages.error(request, 'You do not have permission to view that cohort.')
            return redirect('cohort_list')

        shared_with_ids = Cohort_Perms.objects.filter(cohort=cohort, perm=Cohort_Perms.READER).values_list('user', flat=True)
        shared_with_users = User.objects.filter(id__in=shared_with_ids)

        cohort_filters = cohort.get_filters_as_dict()
        cohort_versions = cohort.get_data_versions()
        initial_filters = {}

        template_values = build_explorer_context(is_dicofdic, source, cohort_versions, initial_filters, fields, order_docs, counts_only, with_related, with_derived, collapse_on, False)

        template_values.update({
            'request': request,
            'base_url': settings.BASE_URL,
            'cohort': cohort,
            'shared_with_users': shared_with_users,
            'cohort_filters': cohort_filters,
            'cohort_version': "; ".join(cohort_versions.get_displays()),
            'cohort_id': cohort_id,
            'is_social': bool(len(request.user.socialaccount_set.all()) > 0)
        })

        template = 'cohorts/cohort_details.html'
    except ObjectDoesNotExist as e:
        logger.exception(e)
        messages.error(request, 'The cohort you were looking for does not exist.')
        return redirect('cohort_list')
    except Exception as e:
        logger.error("[ERROR] Exception while trying to view a cohort:")
        logger.exception(e)
        messages.error(request, "There was an error while trying to load that cohort's details page.")
        return redirect('cohort_list')

    return render(request, template, template_values)



def cohort_test(request):

    cohorts=[]
    cohort= { 'id':5, 'shared_with_users':[], 'lastname':'white', 'firstname':'george', 'versionId':1,
              'version':'Imaging Data Commons Data Release Version 2.0 2021-03-03', 'name':'tcga_all','description':'tcga_all' }
    cohorts.append(cohort)

    cohort = {'id':4 , 'shared_with_users': [], 'lastname': 'white', 'firstname': 'george', 'versionId':1,
              'version': 'Imaging Data Commons Data Release Version 2.0 2021-03-03', 'name': 'brca',
              'description': 'brca', 'parentId':''}
    cohorts.append(cohort)
    cohort = {'id': 3, 'shared_with_users': [], 'lastname': 'white', 'firstname': 'george', 'versionId':1,
              'version': 'Imaging Data Commons Data Release Version 2.0 2021-03-03', 'name': 'ispyNew',
              'description': 'ispy', 'parentId':2}
    cohorts.append(cohort)
    cohort = {'id': 2, 'shared_with_users': [], 'lastname': 'white', 'firstname': 'george', 'versionId':0,
              'version': 'Imaging Data Commons Data Release Version 1.0 2020-10-06', 'name': 'ispy',
              'description': 'ispy', 'parentId':''}

    cohorts.append(cohort)
    cohort = {'id':1, 'shared_with_users': [], 'lastname': 'white', 'firstname': 'george', 'versionId':0,
              'version': 'Imaging Data Commons Data Release Version 1.0 2020-10-06', 'name': 'test',
              'description': 'test1', 'parentId':''}
    cohorts.append(cohort)


    return render(request, 'cohorts/cohort_test.html', {'request': request,'cohorts': cohorts})



def explore_demo_page(request):
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
        uniques = json.loads(req.get('uniques', '[]'))
        record_limit = int(req.get('record_limit', '2000'))
        offset = int(req.get('offset', '0'))

        context = build_explorer_context(is_dicofdic, source, versions, filters, fields, order_docs, counts_only,
                                         with_related, with_derived, collapse_on, is_json, uniques=uniques)

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
        context['order'] = {'derived_set': ['dicom_derived_series_v2:segmentation', 'dicom_derived_series_v2:qualitative',
                                            'dicom_derived_series_v2:quantitative']}

        return render(request, 'idc/explore_demo.html', context)
