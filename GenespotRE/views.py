"""
Copyright 2015-2018, Institute for Systems Biology
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

import collections
import json
import logging
import sys
import re
from time import sleep
import requests

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.contrib.auth.models import User
from django.db.models import Count
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.utils import formats
from django.contrib import messages
from googleapiclient import discovery
from oauth2client.client import GoogleCredentials

from google_helpers.directory_service import get_directory_resource
from google_helpers.bigquery.bq_support import BigQuerySupport
from cohorts.metadata_helpers import get_sample_metadata
from googleapiclient.errors import HttpError
from visualizations.models import SavedViz
from cohorts.models import Cohort, Cohort_Perms
from projects.models import Program
from workbooks.models import Workbook
from accounts.models import GoogleProject
from accounts.sa_utils import get_nih_user_details

from allauth.socialaccount.models import SocialAccount

from django.http import HttpResponse, JsonResponse

debug = settings.DEBUG
logger = logging.getLogger('main_logger')

ERA_LOGIN_URL = settings.ERA_LOGIN_URL
OPEN_ACL_GOOGLE_GROUP = settings.OPEN_ACL_GOOGLE_GROUP
BQ_ATTEMPT_MAX = 10


def convert(data):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data


def _decode_list(data):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    rv = []
    for item in data:
        if isinstance(item, unicode):
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
    for key, value in data.iteritems():
        if isinstance(key, unicode):
            key = key.encode('utf-8')
        if isinstance(value, unicode):
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
    return render(request, 'GenespotRE/landing.html', {'request': request, })

'''
Returns css_test page used to test css for general ui elements
'''
def css_test(request):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    return render(request, 'GenespotRE/css_test.html', {'request': request})


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

        user_details['gcp_list'] = len(GoogleProject.objects.filter(user=user))

        forced_logout = 'dcfForcedLogout' in request.session
        nih_details = get_nih_user_details(user_id, forced_logout)
        for key in nih_details.keys():
            user_details[key] = nih_details[key]

        return render(request, 'GenespotRE/user_detail.html',
                      {'request': request,
                       'user': user,
                       'user_details': user_details,
                       'NIH_AUTH_ON': settings.NIH_AUTH_ON,
                       'ERA_LOGIN_URL': settings.ERA_LOGIN_URL
                       })
    else:
        return render(request, '403.html')

@login_required
def bucket_object_list(request):
    if debug: logger.debug('Called '+sys._getframe().f_code.co_name)
    credentials = GoogleCredentials.get_application_default()
    service = discovery.build('storage', 'v1', credentials=credentials, cache_discovery=False)

    req = service.objects().list(bucket='isb-cgc-dev')
    resp = req.execute()
    object_list = None
    if 'items' in resp:
        object_list = json.dumps(resp['items'])

        return HttpResponse(object_list)

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

    except HttpError, e:
        logger.info(e)

    if debug: logger.debug('Called '+sys._getframe().f_code.co_name)
    # check to see if user has read access to 'All TCGA Data' cohort
    isb_superuser = User.objects.get(username='isb')
    superuser_perm = Cohort_Perms.objects.get(user=isb_superuser)
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

    return render(request, 'GenespotRE/user_landing.html', {'request': request,
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
    if debug: logger.debug('Called '+sys._getframe().f_code.co_name)
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
    slide_barcode = None
    if request.GET:
        slide_barcode = request.GET.get('slide_barcode',None)
    elif request.POST:
        slide_barcode = request.POST.get('slide_barcode',None)

    if slide_barcode:
        slide_barcode = (None if re.compile(ur'[^A-Za-z0-9\-]').search(slide_barcode) else slide_barcode)

    return get_image_data(request, slide_barcode)

# Given a slide_barcode, returns image metadata in JSON format
def get_image_data(request, slide_barcode):
    status=200
    result = {}

    if not slide_barcode:
        status=503
        result = {
            'message': "There was an error while processing this request: a valid slide_barcode was not supplied."
        }
    else:
        try:
            img_data_query = """
                SELECT slide_barcode, level_0__width AS width, level_0__height AS height, mpp_x, mpp_y, GCSurl, sample_barcode, case_barcode
                FROM [isb-cgc:metadata.TCGA_slide_images]
                WHERE slide_barcode = '{}';
            """

            query_results = BigQuerySupport.execute_query_and_fetch_results(img_data_query.format(slide_barcode))

            if query_results and len(query_results) > 0:
                result = {
                    'Width': query_results[0]['f'][1]['v'],
                    'Height': query_results[0]['f'][2]['v'],
                    'MPP-X': query_results[0]['f'][3]['v'],
                    'MPP-Y': query_results[0]['f'][4]['v'],
                    'FileLocation': re.sub(r'isb-cgc-open/.*_image', 'imaging-west', query_results[0]['f'][5]['v']),
                    'TissueID': query_results[0]['f'][0]['v'],
                    'sample-barcode': query_results[0]['f'][6]['v'],
                    'case-barcode': query_results[0]['f'][7]['v'],
                    'img-type': ('Diagnostic Image' if slide_barcode.split("-")[-1].startswith("DX") else 'Tissue Slide Image' if slide_barcode.split("-")[-1].startswith("TS") else "N/A")
                }

                sample_metadata = get_sample_metadata(result['sample-barcode'])
                result['disease-code'] = sample_metadata['disease_code']
                result['project'] = sample_metadata['project']

            else:
                result = {
                    'msg': 'Slide barcode {} was not found.'.format(slide_barcode)
                }

        except Exception as e:
            logger.error("[ERROR] While attempting to retrieve image data for {}:".format(slide_barcode))
            logger.exception(e)
            status = '503'
            result = {
                'message': "There was an error while processing this request."
            }

    return JsonResponse(result, status=status)


@login_required
def dicom(request, study_uid=None):
    template = 'GenespotRE/dicom.html'

    context = {
        'dcm4chee_id': study_uid,
        'dicom_viewer': settings.DCM4CHEE_VIEWER
    }
    return render(request, template, context)


@login_required
def camic(request, slide_barcode=None):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)
    context = {}

    if not slide_barcode:
        messages.error("Error while attempting to display this pathology image: a slide barcode was not provided.")
        return redirect(reverse('cohort_list'))

    images = [{'barcode': slide_barcode, 'thumb': '', 'type': ''}]
    template = 'GenespotRE/camic_single.html'

    context['barcodes'] = images
    context['camic_viewer'] = settings.CAMIC_VIEWER
    context['img_thumb_url'] = settings.IMG_THUMBS_URL

    return render(request, template, context)


@login_required
def igv(request, sample_barcode=None, readgroupset_id=None):
    if debug: logger.debug('Called '+sys._getframe().f_code.co_name)

    readgroupset_list = []
    bam_list = []

    checked_list = json.loads(request.POST.__getitem__('checked_list'))
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
        'service_account': settings.WEB_CLIENT_ID,
        'build': build,
    }

    return render(request, 'GenespotRE/igv.html', context)


# Because the match for vm_ is always done regardless of its presense in the URL
# we must always provide an argument slot for it
#
def health_check(request, match):
    return HttpResponse('')


def help_page(request):
    return render(request, 'GenespotRE/help.html')


def about_page(request):
    return render(request, 'GenespotRE/about.html')

def vid_tutorials_page(request):
    return render(request, 'GenespotRE/video_tutorials.html')

@login_required
def dashboard_page(request):

    # Cohort List
    isb_superuser = User.objects.get(username='isb')
    public_cohorts = Cohort_Perms.objects.filter(user=isb_superuser,perm=Cohort_Perms.OWNER).values_list('cohort', flat=True)
    cohort_perms = list(set(Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True).exclude(cohort__id__in=public_cohorts)))
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

    # Gene & miRNA Favorites
    genefaves = request.user.genefavorite_set.filter(active=True)

    # Variable Favorites
    varfaves = request.user.variablefavorite_set.filter(active=True)

    return render(request, 'GenespotRE/dashboard.html', {
        'request'  : request,
        'cohorts'  : cohorts,
        'programs' : programs,
        'workbooks': workbooks,
        'genefaves': genefaves,
        'varfaves' : varfaves
    })