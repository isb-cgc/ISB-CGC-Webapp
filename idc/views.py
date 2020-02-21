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
from past.builtins import basestring
import collections
import json
import logging
import sys
import re
import datetime

# import requests

from bisect import bisect_left
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
from idc_collections.models import Program
from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponse, JsonResponse
from .metadata_utils import get_collex_metadata
from .metadata_utils import getWithNullGuard

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
def explore_data(request):
    context = {}
    try:
        # These are example filters; typically they will be reconstituted from the request
        filters = {"vital_status": ["Alive", "Dead"], "age_at_diagnosis_btw": [15,40], "bmi": "underweight", "race": "BLACK OR AFRICAN AMERICAN"}
        # These are the actual data fields to display in the expanding table; again this is just an example
        # set that should be properly supplied in the reuqest
        fields = ["BodyPartExamined", "Modality", "StudyDescription", "StudyInstanceUID", "SeriesInstanceUID"]

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
        social_account = SocialAccount.objects.get(user_id=user_id, provider='google')

        user_details = {
            'date_joined':  user.date_joined,
            'email':        user.email,
            'extra_data':   social_account.extra_data,
            'first_name':   user.first_name,
            'id':           user.id,
            'last_login':   user.last_login,
            'last_name':    user.last_name
        }

        forced_logout = 'dcfForcedLogout' in request.session

        return render(request, 'idc/user_detail.html',
                      {'request': request,
                       'user': user,
                       'user_details': user_details
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

    return redirect(reverse('dashboard'))


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
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-last_date_saved').annotate(num_cases=Count('samples__case_barcode'))

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

    return render(request, 'idc/user_landing.html', {'request': request,
                                                            'cohorts': cohorts,
                                                            'user_list': users,
                                                            'cohorts_listing': cohort_listing,
                                                            'visualizations': visualizations,
                                                            'seqpeek_list': seqpeek_viz,
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

def get_filtered_idc_cohort(request):

    ageRng = [0,20,30,40,50,60,70,80]
    bmiRng = [18.5,25,30]

    fields = ["project_short_name", "case_barcode", "race", "vital_status", "ethnicity", "bmi", "age_at_diagnosis", "gender", "disease_code",
               "StudyInstanceUID", "StudyDescription", "StudyDate", "SeriesInstanceUID", "SeriesDescription", "SeriesNumber", "BodyPartExamined", "Modality"]
    filters = {"vital_status": ["Alive","Dead","None"]}
    #filters = {}
    try:
        # for a version which isn't current, or for a user cohort
        facets_and_lists = get_collex_metadata(filters, fields, record_limit=50000, counts_only=False)


    except Exception as e:
        logger.error("[ERROR] In get_filtered_idc_cohort_data:")
        logger.exception(e)

    imageDataA=facets_and_lists['docs']

    ret={}
    ret['projects'] = []
    ret['projectIndex'] = {}
    ret['projectA'] = []
    ret['patientIndex'] = {}
    ret['patientProject'] = {}
    ret['studyIndex'] = {}
    ret['studyPatient'] = {}
    ret['seriesIndex'] = {}
    ret['seriesStudy'] = {}
    ret['diseaseCodeH'] = {}
    ret['raceH'] = {}
    ret['ethnicityH'] = {}

    for i in range(len(imageDataA)):
        curRow=imageDataA[i]
        projectId= curRow['project_short_name'];
        patientId = curRow['case_barcode']
        studyId = curRow['StudyInstanceUID'];
        seriesId = curRow['SeriesInstanceUID'];

        curProject={}
        if not (projectId in ret['projectIndex']):
            ret['projectIndex'][projectId]=len(ret['projects'])
            ret['projectA'].append(projectId)
            curProject['id']=projectId
            curProject['patients'] = []
            curProject['isActive']=True
            curProject['numActivePatients']=0
            curProject['reasonsInActive']={}
            ret['projects'].append(curProject)

        else:
            curProject = ret['projects'][ret['projectIndex'][projectId]]

        curPatient = {}
        if not (patientId in ret['patientIndex']):
            curProject['numActivePatients'] = curProject['numActivePatients']+1
            ret['patientIndex'][patientId] = len(curProject['patients'])
            ret['patientProject'][patientId] = curProject['id']
            curPatient['id'] = patientId
            curPatient['isActive'] = True
            curPatient['numActiveStudies'] = 0
            curPatient['reasonsInActive'] = {}
            curPatient['studies'] = []
            curProject['patients'].append(curPatient)


        else:
            curPatient = curProject['patients'][ret['patientIndex'][patientId]]

        curStudy = {}

        if not(studyId in ret['studyIndex']):
            curPatient['numActiveStudies'] = curPatient['numActiveStudies'] + 1
            ret['studyIndex'][studyId] = len(curPatient['studies'])
            ret['studyPatient'][studyId] = curPatient['id']
            curStudy['id'] = studyId
            curStudy['isActive'] = True
            curStudy['reasonsInActive'] = {}
            curStudy['numActiveSeries'] = 0
            curStudy['seg'] = False
            curStudy['StudyDescription'] = getWithNullGuard(curRow,'StudyDescription','none')
            curStudy['StudyDate'] = getWithNullGuard(curRow, 'StudyDate', 'none')
            curStudy['series'] = []
            curPatient['studies'].append(curStudy)

        else:
            curStudy = curPatient['studies'][ret['studyIndex'][studyId]]

        curSeries = {}
        if not(seriesId in ret['seriesIndex']):
            ret['seriesIndex'][seriesId] = len(curStudy['series'])
            ret['seriesStudy'][seriesId] = curStudy['id']
            curStudy['numActiveSeries'] = curStudy['numActiveSeries'] +1;
            curSeries['id'] = seriesId
            curSeries['isActive'] =  True
            curSeries['reasonsInActive'] = {}
            curSeries['Modality'] = getWithNullGuard(curRow, 'Modality', 'none')
            curSeries['BodyPartExamined'] = getWithNullGuard(curRow, 'BodyPartExamined', 'none')
            curSeries['SeriesNumber'] = getWithNullGuard(curRow, 'SeriesNumber', 'none')
            curStudy['series'].append(curSeries)


    ret['clinical'] =  {}
    ret['clinical']['vital_status'] = facets_and_lists['clinical']['facets']['vital_status']
    ret['clinical']['disease_code'] = facets_and_lists['clinical']['facets']['disease_code']
    ret['clinical']['race'] = facets_and_lists['clinical']['facets']['race']
    ret['clinical']['gender'] = facets_and_lists['clinical']['facets']['gender']
    ret['clinical']['ethnicity']  = facets_and_lists['clinical']['facets']['ethnicity']

    ret['clinical']['age'] = []
    for i in range(len(ageRng)-1):
        rng = str(ageRng[i])+"-"+str(ageRng[i+1]-1)
        ret['clinical']['age'].append([rng,0])
    rng = "over "+str(ageRng[len(ageRng)-1])
    ret['clinical']['age'].append([rng,0])
    ret['clinical']['age'].append(['None',0])
    for ageSet in facets_and_lists['clinical']['facets']['age_at_diagnosis']:
        if not(ageSet == 'None'):
            pos = bisect_left(ageRng, ageSet)
            ret['clinical']['age'][pos][1] = ret['clinical']['age'][pos][1] + facets_and_lists['clinical']['facets']['age_at_diagnosis'][ageSet]

    ret['clinical']['age'][len(ret['clinical']['age'])-1][1] = facets_and_lists['clinical']['facets']['age_at_diagnosis']['None']

    ret['clinical']['bmi'] = []
    ret['clinical']['bmi'].append(["Underweight: BMI less than "+str(bmiRng[0]), 0])
    ret['clinical']['bmi'].append(["Normal weight: BMI greater than or equal to " + str(bmiRng[0])+ " and less than "+str(bmiRng[1]),0])
    ret['clinical']['bmi'].append(["Overweight: BMI greater than or equal to " + str(bmiRng[1]) + " and less than " + str(bmiRng[2]), 0])
    ret['clinical']['bmi'].append(["Obese: BMI greater than " + str(bmiRng[2]), 0])
    ret['clinical']['bmi'].append(["None", 0])

    for bmiSet in facets_and_lists['clinical']['facets']['bmi']:
        if not (bmiSet == 'None'):
            pos = bisect_left(bmiRng, bmiSet)
            ret['clinical']['bmi'][pos][1] = ret['clinical']['bmi'][pos][1] + facets_and_lists['clinical']['facets']['bmi'][bmiSet]

    ret['clinical']['bmi'][len(ret['clinical']['bmi']) - 1][1] = facets_and_lists['clinical']['facets']['bmi']['None']



    return JsonResponse(ret)






def search_page(request):
    return render(request, 'idc/search.html', {'request':request})

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
    return render(request, 'idc/warn.html')


def about_page(request):
    return render(request, 'idc/about.html',{'request': request})


def vid_tutorials_page(request):
    return render(request, 'idc/video_tutorials.html',{'request': request})


@login_required
def dashboard_page(request):

    # Cohort List
    idc_superuser = User.objects.get(username='idc')
    public_cohorts = Cohort_Perms.objects.filter(user=idc_superuser,perm=Cohort_Perms.OWNER).values_list('cohort', flat=True)
    cohort_perms = list(set(Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True).exclude(cohort__id__in=public_cohorts)))
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-last_date_saved')

    # Program List
    ownedPrograms = request.user.program_set.filter(active=True)
    sharedPrograms = Program.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
    programs = ownedPrograms | sharedPrograms
    programs = programs.distinct().order_by('-last_date_saved')

    return render(request, 'idc/dashboard.html', {
        'request'  : request,
        'cohorts'  : cohorts,
        'programs' : programs
    })
