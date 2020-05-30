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
from builtins import map
import time
from past.builtins import basestring
import collections
import json
import logging
import sys
import re
import datetime

# import requests

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.contrib.auth.models import User
from django.db.models import Count
from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils import formats
from django.contrib import messages
from googleapiclient import discovery
from oauth2client.client import GoogleCredentials

from adminrestrict.middleware import get_ip_address_from_request

from google_helpers.directory_service import get_directory_resource
from google_helpers.bigquery.bq_support import BigQuerySupport
from google_helpers.stackdriver import StackDriverLogger
from googleapiclient.errors import HttpError
from cohorts.models import Cohort, Cohort_Perms
from idc_collections.models import Program, Attribute, Attribute_Display_Values, DataSource, DataVersion
from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponse, JsonResponse
from .metadata_utils import get_collex_metadata
from idc_collections.collex_metadata_utils import get_bq_metadata, get_bq_string, get_bq_facet_counts

debug = settings.DEBUG
logger = logging.getLogger('main_logger')

BQ_ATTEMPT_MAX = 10
WEBAPP_LOGIN_LOG_NAME = settings.WEBAPP_LOGIN_LOG_NAME


def convert(data):
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(list(map(convert, iter(list(data.items())))))
    elif isinstance(data, collections.Iterable):
        return type(data)(list(map(convert, data)))
    else:
        return data


def _decode_list(data):
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
    return render(request, 'idc/landing.html', {'request': request, })

# Displays the privacy policy
@never_cache
def privacy_policy(request):
    return render(request, 'idc/privacy.html', {'request': request, })


# Returns css_test page used to test css for general ui elements
def css_test(request):
    return render(request, 'idc/css_test.html', {'request': request})


# Returns the data exploration and filtering page, which also allows for cohort creation
@login_required
def test_methods(request):
    context = {}
    try:
        # These are example filters; typically they will be reconstituted from the request
        filters = {"vital_status": ["Alive"], "disease_code": ["READ", "BRCA"]}
        # These are the actual data fields to display in the expanding table; again this is just an example
        # set that should be properly supplied in the reuqest
        fields = ["BodyPartExamined", "Modality", "StudyDescription", "StudyInstanceUID", "SeriesInstanceUID", "case_barcode", "disease_code", "sample_type"]

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


'''
Returns page that has user details
'''
@login_required
def user_detail(request, user_id):
    if debug: logger.debug('Called '+sys._getframe().f_code.co_name)

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


@login_required
def bucket_object_list(request):
    if debug: logger.debug('Called '+sys._getframe().f_code.co_name)
    credentials = GoogleCredentials.get_application_default()
    service = discovery.build('storage', 'v1', credentials=credentials, cache_discovery=False)

    req = service.objects().list(bucket='idc-dev')
    resp = req.execute()
    object_list = None
    if 'items' in resp:
        object_list = json.dumps(resp['items'])

        return HttpResponse(object_list)


# Extended login view so we can track user logins
def extended_login_view(request):

    try:
        # Write log entry
        st_logger = StackDriverLogger.build_from_django_settings()
        log_name = WEBAPP_LOGIN_LOG_NAME
        user = User.objects.get(id=request.user.id)
        st_logger.write_text_log_entry(
            log_name,
            "[WEBAPP LOGIN] User {} logged in to the web application at {}".format(user.email, datetime.datetime.utcnow())
        )

    except Exception as e:
        logger.exception(e)

    return redirect(reverse('explore_data'))


'''
Returns page users see after signing in
'''
@login_required
def user_landing(request):

    directory_service, http_auth = get_directory_resource()
    user_email = User.objects.get(id=request.user.id).email

    if debug: logger.debug('Called '+sys._getframe().f_code.co_name)
    # check to see if user has read access to 'All TCGA Data' cohort
    idc_superuser = User.objects.get(username='idc')
    superuser_perm = Cohort_Perms.objects.get(user=idc_superuser)
    user_all_data_perm = Cohort_Perms.objects.filter(user=request.user, cohort=superuser_perm.cohort)
    if not user_all_data_perm:
        Cohort_Perms.objects.create(user=request.user, cohort=superuser_perm.cohort, perm=Cohort_Perms.READER)

    # add_data_cohort = Cohort.objects.filter(name='All TCGA Data')

    users = User.objects.filter(is_superuser=0)
    cohort_perms = Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)
    # TODO: Make date_created column and sort on that
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-name').annotate(num_cases=Count('samples__case_barcode'))

    for item in cohorts:
        item.perm = item.get_perm(request).get_perm_display()
        item.owner = item.get_owner()
        # print local_zone.localize(item.last_date_saved)

    # Used for autocomplete listing
    cohort_listing = Cohort.objects.filter(id__in=cohort_perms, active=True).values('id', 'name')
    for cohort in cohort_listing:
        cohort['value'] = int(cohort['id'])
        cohort['label'] = cohort['name'].encode('utf8')
        del cohort['id']
        del cohort['name']

    return render(request, 'idc/user_landing.html', {'request': request,
                                                            'cohorts': cohorts,
                                                            'user_list': users,
                                                            'cohorts_listing': cohort_listing,
                                                            'base_url': settings.BASE_URL,
                                                            'base_api_url': settings.BASE_API_URL
                                                            })


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
    status=200
    result = {}

    if not file_uuid:
        status=503
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
                    'img-type': ('Diagnostic Image' if query_results[0]['f'][0]['v'].split("-")[-1].startswith("DX") else 'Tissue Slide Image' if query_results[0]['f'][0]['v'].split("-")[-1].startswith("TS") else "N/A")
                }

                sample_metadata = {}
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


@login_required
def dicom(request, study_uid=None):
    template = 'idc/dicom.html'

    context = {
        'study_uid': study_uid,
        'dicom_viewer': settings.DICOM_VIEWER
    }
    return render(request, template, context)


# Because the match for vm_ is always done regardless of its presense in the URL
# we must always provide an argument slot for it
#
def health_check(request, match):
    return HttpResponse('')


def help_page(request):
    return render(request, 'idc/help.html',{'request': request})


@login_required
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
        collapse_on = req.get('collapse_on', 'PatientID')
        is_json = (req.get('is_json', "False").lower() == "true")

        versions = DataVersion.objects.filter(name__in=versions) if len(versions) else DataVersion.objects.filter(active=True)
        sources = DataSource.objects.select_related('version').filter(version__in=versions, source_type=source)

        # For now we're only allowing TCGA
        # TODO: REMOVE THIS ONCE WE'RE ALLOWING MORE
        tcga_in_tcia = Program.objects.get(short_name="TCGA").collection_set.all()

        for source in sources:
            is_origin = bool(source.version.data_type == DataVersion.IMAGE_DATA)
            # If a field list wasn't provided, work from a default set
            if is_origin and not len(fields):
                fields = source.get_collection_attr(for_faceting=False).filter(default_ui_display=True).values_list('name', flat=True)

            if is_origin or \
             (bool(source.version.data_type == DataVersion.ANCILLARY_DATA) and with_related) or \
             (bool(source.version.data_type == DataVersion.DERIVED_DATA) and with_derived):
                if source.version.get_set_type() not in attr_by_source:
                    attr_by_source[source.version.get_set_type()] = {}

                attrs = source.get_collection_attr(for_ui=True)
                if 'attributes' not in attr_by_source[source.version.get_set_type()]:
                    attr_by_source[source.version.get_set_type()]['attributes'] = {}
                    attr_sets[source.version.get_set_type()] = attrs
                else:
                    attr_sets[source.version.get_set_type()] = attr_sets[source.version.get_set_type()] | attrs

                attr_by_source[source.version.get_set_type()]['attributes'].update(
                    {attr.name: {'source': source.id, 'obj': attr, 'vals': None, 'id': attr.id} for attr in attrs}
                )

        start = time.time()

        source_metadata = get_collex_metadata(
            filters, fields, record_limit=5000, counts_only=counts_only, with_ancillary = with_related,
            collapse_on = collapse_on, order_docs = order_docs, sources = sources, versions = versions
        )
        stop = time.time()
        logger.debug("[STATUS] Benchmarking: Time to collect metadata for source type {}: {}s".format(
            "BigQuery" if sources.first().source_type == DataSource.BIGQUERY else "Solr",
            str((stop-start))
        ))

        for set_name in [DataVersion.SET_TYPES[DataVersion.DERIVED_DATA], DataVersion.SET_TYPES[DataVersion.ANCILLARY_DATA]]:
            if set_name in source_metadata['facets']:
                attr_display_vals = Attribute_Display_Values.objects.filter(
                    attribute__id__in=attr_sets[set_name]).to_dict()
                for source in source_metadata['facets'][set_name]:
                    facet_set = source_metadata['facets'][set_name][source]['facets']
                    for attr in facet_set:
                        this_attr = attr_by_source[set_name]['attributes'][attr]['obj']
                        values = []
                        for val in source_metadata['facets'][set_name][source]['facets'][attr]:
                            displ_val = val if this_attr.preformatted_values else attr_display_vals.get(this_attr.id, {}).get(val, None)
                            values.append({
                                'value': val,
                                'display_value': displ_val,
                                'count': facet_set[attr][val] if val in facet_set[attr] else 0
                            })
                        if attr == 'bmi':
                            sortDic = {'underweight': 0, 'normal weight': 1, 'overweight': 2, 'obese': 3, 'none': 4}
                            attr_by_source[set_name]['attributes'][attr]['vals'] = sorted(values, key=lambda x: sortDic[x['value']])
                        else:
                            attr_by_source[set_name]['attributes'][attr]['vals'] = sorted(values, key=lambda x: x['value'])

        set_name = DataVersion.SET_TYPES[DataVersion.IMAGE_DATA]
        attr_display_vals = Attribute_Display_Values.objects.filter(attribute__id__in=attr_sets[set_name]).to_dict()
        for source in source_metadata['facets'][set_name]:
            facet_set = source_metadata['facets'][set_name][source]['facets']
            for attr in facet_set:
                this_attr = attr_by_source[set_name]['attributes'][attr]['obj']
                values = []
                for val in facet_set[attr]:
                    displ_val = val if this_attr.preformatted_values else attr_display_vals.get(this_attr.id, {}).get(val, None)
                    values.append({
                        'value': val,
                        'display_value': displ_val,
                        'count': facet_set[attr][val] if val in facet_set[attr] else 0
                    })
                attr_by_source[set_name]['attributes'][attr]['vals'] = sorted(values, key=lambda x: x['value'])

        for set in attr_by_source:
            if is_dicofdic:
                for x in list(attr_by_source[set]['attributes'].keys()):
                    if (isinstance(attr_by_source[set]['attributes'][x]['vals'],list) and (len(attr_by_source[set]['attributes'][x]['vals']) > 0)):
                        attr_by_source[set]['attributes'][x] = {y['value']: {'display_value': y['display_value'], 'count': y['count']} for y in attr_by_source[set]['attributes'][x]['vals']}
                    else:
                        attr_by_source[set]['attributes'][x] = {}
                if set == 'origin_set':
                    context['collections'] = {a: attr_by_source[set]['attributes']['collection_id'][a]['count'] for a in attr_by_source[set]['attributes']['collection_id']}
                    context['collections']['All'] = source_metadata['total']
            else:
                attr_by_source[set]['attributes'] = [{
                    'name': x,
                    'id': attr_by_source[set]['attributes'][x]['obj'].id,
                    'display_name': attr_by_source[set]['attributes'][x]['obj'].display_name,
                    'values': attr_by_source[set]['attributes'][x]['vals']
                } for x in attr_by_source[set]['attributes']]
                if set == 'origin_set':
                    context['collections'] = {b['value']: b['count'] for a in attr_by_source[set]['attributes'] for
                                              b in a['values'] if a['name'] == 'collection_id' }
                    context['collections']['All'] = source_metadata['total']
            if not counts_only:
                attr_by_source[set]['docs'] = source_metadata['docs']

        attr_by_source['total'] = source_metadata['total']

        context['set_attributes'] = attr_by_source
        context['filters'] = filters

        if with_related:
            context['tcga_collections'] = tcga_in_tcia

    except Exception as e:
        logger.error("[ERROR] While attempting to load the search page:")
        logger.exception(e)
        messages.error(request, "Encountered an error when attempting to load the page - please contact the administrator.")

    if is_json:
        return JsonResponse(attr_by_source)
    else:
        return render(request, 'idc/explore.html', context)

@login_required
def ohif_test_page(request):
    request.session['last_path']=request.get_full_path()
    return render(request, 'idc/ohif.html',{'request': request})

@login_required
def ohif_viewer_page(request):
    request.session['last_path'] = request.get_full_path()
    return render(request, 'idc/ohif.html',{'request': request})

@login_required
def ohif_callback_page(request):
    return render(request,'idc/ohif.html',{'request': request})

@login_required
def ohif_projects_page(request):
    request.session['last_ohif_path'] = request.get_full_path()
    return render(request, 'idc/ohif.html',{'request': request})

def ohif_page(request):
    request.session['last_path'] = request.get_full_path()
    return render(request, 'idc/ohif.html',{'request': request})

def warn_page(request):
    request.session['seenWarning']=True;
    return JsonResponse({'warning_status': 'SEEN'}, status=200)

def about_page(request):
    return render(request, 'idc/about.html',{'request': request})



def vid_tutorials_page(request):
    return render(request, 'idc/video_tutorials.html',{'request': request})

@login_required
def dashboard_page(request):

    context = {'request'  : request}

    try:
        # Cohort List
        idc_superuser = User.objects.get(username='idc')
        public_cohorts = Cohort_Perms.objects.filter(user=idc_superuser,perm=Cohort_Perms.OWNER).values_list('cohort', flat=True)
        cohort_perms = list(set(Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True).exclude(cohort__id__in=public_cohorts)))
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
