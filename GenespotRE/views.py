"""
Copyright 2015, Institute for Systems Biology
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

import logging
import json
import collections
import io
import time
import os
import sys
from datetime import datetime

from oauth2client.client import GoogleCredentials
from google.appengine.api import modules, urlfetch
from google.appengine.ext import deferred
from googleapiclient import discovery, http
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import HttpResponse
from django.db.models import Count
from django.utils import formats
from django.contrib import messages
from django.contrib.auth.models import User
from django.conf import settings

debug = settings.DEBUG
from google_helpers.genomics_service import get_genomics_resource
from google_helpers.directory_service import get_directory_resource
from googleapiclient.errors import HttpError
from visualizations.models import SavedViz, Viz_Perms
from cohorts.models import Cohort, Cohort_Perms
from projects.models import Project
from workbooks.models import Workbook
from accounts.models import NIH_User

from allauth.socialaccount.models import SocialAccount
from django.core.exceptions import MultipleObjectsReturned, ObjectDoesNotExist


debug = settings.DEBUG
logger = logging.getLogger(__name__)

urlfetch.set_default_fetch_deadline(60)

login_expiration_seconds = settings.LOGIN_EXPIRATION_HOURS * 60 * 60
# schedule check_login tasks for 15 minutes after the user's login will expire
COUNTDOWN_SECONDS = login_expiration_seconds + (60 * 15)

USER_API_URL = settings.BASE_API_URL + '/_ah/api/user_api/v1'
ACL_GOOGLE_GROUP = settings.ACL_GOOGLE_GROUP
DBGAP_AUTHENTICATION_LIST_BUCKET = settings.DBGAP_AUTHENTICATION_LIST_BUCKET
ERA_LOGIN_URL = settings.ERA_LOGIN_URL
OPEN_ACL_GOOGLE_GROUP = settings.OPEN_ACL_GOOGLE_GROUP


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
def landing_page(request):
    if debug:
        print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
        print >> sys.stderr,'App Version: '+modules.get_current_version_name()
        try:
            print >> sys.stderr,'App BACKEND_ID: '+os.getenv('BACKEND_ID')
        except:
            print >> sys.stderr,"Printing os.getenv('BACKEND_ID') Failed"

    return render(request, 'GenespotRE/landing.html',
                  {'request': request})

'''
Returns css_test page used to test css for general ui elements
'''
def css_test(request):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    return render(request, 'GenespotRE/css_test.html', {'request': request})


'''
Returns page that lists users
'''
@login_required
def user_list(request):
    # if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    url = USER_API_URL + '/users'
    result = urlfetch.fetch(url, deadline=60)
    users = json.loads(str(result.content))
    return render(request, 'GenespotRE/user_list.html', {'request': request,
                                                          'users': users})


'''
Returns page that has user details
'''
@login_required
def user_detail(request, user_id):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name

    if int(request.user.id) == int(user_id):

        user = User.objects.get(id=user_id)
        social_account = SocialAccount.objects.get(user_id=user_id)

        user_details = {
            'date_joined': user.date_joined,
            'email': user.email,
            'extra_data': social_account.extra_data,
            'first_name': user.first_name,
            'id': user.id,
            'last_login': user.last_login,
            'last_name': user.last_name
        }
        try:
            nih_user = NIH_User.objects.get(user_id=user_id)
            user_details['NIH_username'] = nih_user.NIH_username
            user_details['NIH_assertion_expiration'] = nih_user.NIH_assertion_expiration
            user_details['dbGaP_authorized'] = nih_user.dbGaP_authorized and nih_user.active
            user_details['NIH_active'] = nih_user.active
        except (MultipleObjectsReturned, ObjectDoesNotExist), e:
            if type(e) is MultipleObjectsReturned:
                # in this case there is more than one nih_username linked to the same google identity
                logger.warn("Error when retrieving nih_user with user_id {}. {}".format(str(user_id), str(e)))
                # todo: add code to unlink all accounts?

        return render(request, 'GenespotRE/user_detail.html',
                      {'request': request,
                       'user_details': user_details,
                       'NIH_AUTH_ON': settings.NIH_AUTH_ON,
                       'ERA_LOGIN_URL': settings.ERA_LOGIN_URL
                       })
    else:
        return render(request, '403.html')


@login_required
def bucket_object_list(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    credentials = GoogleCredentials.get_application_default()
    service = discovery.build('storage', 'v1', credentials=credentials)

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

    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    # check to see if user has read access to 'All TCGA Data' cohort
    isb_superuser = User.objects.get(username='isb')
    superuser_perm = Cohort_Perms.objects.get(user=isb_superuser)
    user_all_data_perm = Cohort_Perms.objects.filter(user=request.user, cohort=superuser_perm.cohort)
    if not user_all_data_perm:
        Cohort_Perms.objects.create(user=request.user, cohort=superuser_perm.cohort, perm=Cohort_Perms.READER)

    # add_data_cohort = Cohort.objects.filter(name='All TCGA Data')

    users = User.objects.filter(is_superuser=0)
    cohort_perms = Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-last_date_saved').annotate(num_patients=Count('samples'))

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
Returns Results from text search
'''
@login_required
def search_cohorts_viz(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
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

@login_required
def igv(request, readgroupset_id=None):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    service, http_auth = get_genomics_resource()
    datasets = convert(service.datasets().list(projectNumber=settings.IGV_PROJECT_ID).execute())

    dataset_ids = []
    dataset_objs = []
    nih_user = None

    for dataset in datasets['datasets']:
        if 'isPublic' in dataset and dataset['isPublic'] is True:
            dataset_ids.append(dataset['id'])
            dataset_objs.append({'id': dataset['id'], 'name': dataset['name']})

    try:
        nih_user = NIH_User.objects.get(user_id=request.user.id)
    except (MultipleObjectsReturned, ObjectDoesNotExist), e:
        if type(e) is MultipleObjectsReturned:
            logger.warn("Multiple NIH_User objects for user id {}".format(request.user.id))

    if nih_user is not None:
        if nih_user.dbGaP_authorized is True and nih_user.active is True:
            dataset_ids = []
            dataset_objs = []
            for dataset in datasets['datasets']:
                dataset_ids.append(dataset['id'])
                dataset_objs.append({'id': dataset['id'], 'name': dataset['name']})


    content = convert(service.readgroupsets().search(body={'datasetIds':dataset_ids}).execute())
    read_group_set_ids = []
    selected = {}
    context = {'request': request}
    for rgset in content['readGroupSets']:

        if readgroupset_id and rgset['id'] == readgroupset_id:
            selected['rgs_id'] = rgset['id']
            selected['dataset_id'] = rgset['datasetId']
            context['selected'] = selected

        read_group_set_ids.append({
            'datasetId': rgset['datasetId'],
            'id': rgset['id'],
            'name': rgset['name'],
            'filename': rgset['filename']
        })

    for dataset in dataset_objs:
        rgsets = []
        for rgset in read_group_set_ids:
            if rgset['datasetId'] == dataset['id']:
                rgsets.append(rgset)
        dataset['readGroupSets'] = rgsets
    context['datasets'] = dataset_objs
    if 'selected' not in context and readgroupset_id:
        messages.info(request, 'The selected readgroupset id (%s) does not exist in the available datasets.' % readgroupset_id)
    return render(request, 'GenespotRE/igv.html', context)

def health_check(request):
#    print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    return HttpResponse('')

def help_page(request):
    print request.user
    return render(request, 'GenespotRE/help.html')

def about_page(request):
    return render(request, 'GenespotRE/about.html')

@login_required
def dashboard_page(request):

    # Cohort List
    isb_superuser = User.objects.get(username='isb')
    public_cohorts = Cohort_Perms.objects.filter(user=isb_superuser,perm=Cohort_Perms.OWNER).values_list('cohort', flat=True)
    cohort_perms = Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True).exclude(cohort__id__in=public_cohorts)
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-last_date_saved')

    # Project List
    ownedProjects = request.user.project_set.all().filter(active=True)
    sharedProjects = Project.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
    projects = ownedProjects | sharedProjects
    projects = projects.distinct().order_by('-last_date_saved')

    # Workbook List
    userWorkbooks = request.user.workbook_set.all().filter(active=True)
    sharedWorkbooks = Workbook.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
    workbooks = userWorkbooks | sharedWorkbooks
    workbooks = workbooks.distinct().order_by('-last_date_saved')

    return render(request, 'GenespotRE/dashboard.html', {
        'request'  : request,
        'cohorts'  : cohorts,
        'projects' : projects,
        'workbooks': workbooks,
    })