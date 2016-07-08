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
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.db.models import Count
from django.utils import formats
from django.contrib import messages
from django.contrib.auth.models import User
from django.conf import settings

debug = settings.DEBUG
from google_helpers.genomics_service import get_genomics_resource
from google_helpers.directory_service import get_directory_resource
from google_helpers.resourcemanager_service import get_special_crm_resource
from googleapiclient.errors import HttpError
from visualizations.models import SavedViz, Viz_Perms
from cohorts.models import Cohort, Cohort_Perms
from projects.models import Project
from workbooks.models import Workbook
from accounts.models import NIH_User, GoogleProject, AuthorizedDataset, UserAuthorizedDatasets, ServiceAccount

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
                       'user': user,
                       'user_details': user_details,
                       'NIH_AUTH_ON': settings.NIH_AUTH_ON,
                       'ERA_LOGIN_URL': settings.ERA_LOGIN_URL
                       })
    else:
        return render(request, '403.html')

'''
Returns page that has user Google Cloud Projects
'''
@login_required
def user_gcp_list(request, user_id):
    if int(request.user.id) == int(user_id):

        user = User.objects.get(id=user_id)
        gcp_list = GoogleProject.objects.filter(user=user)
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

        context = {'user': user,
                   'user_details': user_details,
                   'gcp_list': gcp_list}

        return render(request, 'GenespotRE/user_gcp_list.html', context)
    else:
        return render(request, '403.html')
    pass

@login_required
def verify_gcp(request, user_id):
    try:
        gcp_id = request.GET.get('gcp-id', None)
        crm_service = get_special_crm_resource()
        iam_policy = crm_service.projects().getIamPolicy(
            resource=gcp_id, body={}).execute()
        bindings = iam_policy['bindings']
        roles = {}
        for val in bindings:
            role = val['role']
            members = val['members']
            roles[role] = []
            for member in members:
                if member.startswith('user:'):
                    email = member.split(':')[1]
                    registered_user = bool(User.objects.filter(email=email).first())
                    roles[role].append({'email': email,
                                       'registered_user': registered_user})
        return JsonResponse({'roles': roles,
                            'gcp_id': gcp_id}, status='200')
    except HttpError, e:
        return JsonResponse({'message': 'There was an error accessing your project. Please verify that you have entered the correct Google Cloud Project ID and set the permissions correctly.'}, status='403')

@login_required
def register_gcp(request, user_id):
    if request.POST:
        project_id = request.POST.get('gcp_id', None)
        project_name = project_id
        print user_id, project_id, project_name

        register_users = request.POST.getlist('register_users')
        if not user_id or not project_id or not project_name:

            pass
        else:
            new_gcp = GoogleProject.objects.create(user_id=user_id,
                                                     project_name=project_name,
                                                     project_id=project_id,
                                                     big_query_dataset='')
            new_gcp.save()

        for user in register_users:
            user_obj = User.objects.get(email=user)
            try:
                gcp = GoogleProject.objects.get(user_id=user_obj.id, project_id=project_id)
            except GoogleProject.DoesNotExist:
                gcp = GoogleProject.objects.create(user_id=user_obj.id,
                                                     project_name=project_name,
                                                     project_id=project_id,
                                                     big_query_dataset='')
                gcp.save()
        return redirect('user_gcp_list', user_id=request.user.id)
    return render(request, 'GenespotRE/register_gcp.html', {})

@login_required
def register_sa(request, user_id):
    if request.GET.get('gcp_id'):
        authorized_datasets = AuthorizedDataset.objects.all()

        context = {'gcp_id': request.GET.get('gcp_id'),
                   'authorized_datasets': authorized_datasets}
        return render(request, 'GenespotRE/register_sa.html', context)
    else:
        messages.error('There was no Google Cloud Project provided.')
        redirect('user_gcp_list', user_id=user_id)

@login_required
def verify_sa(request, user_id):
    if request.POST.get('gcp_id'):
        gcp_id = request.POST.get('gcp_id')
        user_gcp = GoogleProject.objects.get(project_id=gcp_id)
        user_sa = request.POST.get('user_sa')
        datasets = request.POST.getlist('dataset')
        dataset_objs = AuthorizedDataset.objects.filter(id__in=datasets)

        return_obj = {'user_sa': user_sa}

        '''
        INSERT CODE TO VERIFY USERS AND DATASETS.
        '''


        # 1. GET ALL USERS ON THE PROJECT.
        try:
            crm_service = get_special_crm_resource()
            iam_policy = crm_service.projects().getIamPolicy(
                resource=gcp_id, body={}).execute()
            bindings = iam_policy['bindings']
            roles = {}
            verify_service_account = False
            for val in bindings:
                role = val['role']
                members = val['members']
                roles[role] = []
                for member in members:
                    if member.startswith('user:'):
                        roles[role].append(member.split(':')[1])
                    elif member.startswith('serviceAccount'):
                        if member.find(':'+user_sa) > 0:
                            verify_service_account = True

            # 2. VERIFY SERVICE ACCOUNT IS IN THIS PROJECT
            if not verify_service_account:
                print 'Provided service account does not exist in project.'
                # return error that the service account doesn't exist in this project
                return JsonResponse({'message': 'The provided service account does not exist in the selected project'}, status='400')


            # 3. VERIFY ALL USERS HAVE A LISTING IN NIH_USERS.
            for role, members in roles.items():
                users = User.objects.filter(email__in=members)
                # If not all users have logged into the system.
                if len(users) < len(members):
                    return JsonResponse({'message': 'Some users in your project have not verified their account in the ISB-CGC webapp. Please have them log in to the webapp.'}, status=400)

                NIH_users = NIH_User.objects.filter(user__in=users)

                # If not all users have linked their eRA Commons ID
                if len(NIH_users) < len(users):
                    return JsonResponse({'message': 'Some users in your project have not verified their eRA Commons ID with their ISB-CGC account. Please have them go through the process of linking their eRA Commons ID with their ISB-CGC account.'})

                # Verify dataset access per dataset
                for dataset in dataset_objs:
                    user_authorized_datasets = UserAuthorizedDatasets.objects.filter(nih_user__in=NIH_users, authorized_dataset=dataset)
                    if len(user_authorized_datasets) < NIH_users:
                        return JsonResponse({'message': 'Some users in your project do not have access to this dataset: {0}'.format(dataset.name)}, status=400)

            # 4. VERIFY PI IS ON THE PROJECT

            # 5. VERIFY ALL USERS HAVE ACCESS TO THE PROPOSED DATASETS
        except HttpError, e:
            return JsonResponse({'message': 'There was an error accessing your project. Please verify that you have set the permissions correctly.'}, status='403')

        '''
        3. VERIFY PI IS ON THE PROJECT.
            IF PI IS NOT ON THE PROJECT, RETURN ERROR
        4. VERIFY ALL USERS HAVE ACCESS TO THE PROPOSED DATASETS.
            IF NOT ALL USERS HAVE ACCESS, KEEP LIST OF USERS THAT DO NOT

        RETURN THE LIST OF DATASETS AND WHETHER ALL USERS HAVE ACCESS OR NOT.
        IF NOT ALL USERS HAVE ACCESS TO A DATASET, LIST THE USERS THAT DO NOT.
        '''


        return_obj['user_sa_objs'] = []
        for dataset in dataset_objs:
            user_sa_obj = ServiceAccount.objects.create(google_project=user_gcp,
                                                             service_account=user_sa,
                                                             authorized_dataset=dataset)
            return_obj['user_sa_objs'].append({
                'service_account': user_sa_obj.service_account,
                'google_project': user_sa_obj.google_project.project_name,
                'authorized_dataset': user_sa_obj.authorized_dataset.name
            })
        return JsonResponse(return_obj, status='200')
    else:
        return JsonResponse({'message': 'There was no Google Cloud Project provided.'}, status='404')


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
def igv(request, sample_barcode=None, readgroupset_id=None):
    if debug: print >> sys.stderr, 'Called '+sys._getframe().f_code.co_name

    readgroupset_list = []
    bam_list = []

    checked_list = json.loads(request.POST.__getitem__('checked_list'))

    for item in checked_list['readgroupset_id']:
       id_barcode = item.split(',')
       readgroupset_list.append({'sample_barcode': id_barcode[1],
                                 'readgroupset_id': id_barcode[0]})

    for item in checked_list['gcs_bam']:
        id_barcode = item.split(',')
        bam_list.append({'sample_barcode': id_barcode[1],
                         'gcs_path': id_barcode[0]})

    context = {}
    context['readgroupset_list'] = readgroupset_list
    context['bam_list'] = bam_list
    context['base_url'] = settings.BASE_URL
    context['service_account'] = settings.WEB_CLIENT_ID

    return render(request, 'GenespotRE/igv.html', context)

def health_check(request):
#    print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    return HttpResponse('')

def help_page(request):
    return render(request, 'GenespotRE/help.html')

def about_page(request):
    return render(request, 'GenespotRE/about.html')

@login_required
def dashboard_page(request):

    # Cohort List
    isb_superuser = User.objects.get(username='isb')
    public_cohorts = Cohort_Perms.objects.filter(user=isb_superuser,perm=Cohort_Perms.OWNER).values_list('cohort', flat=True)
    cohort_perms = list(set(Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True).exclude(cohort__id__in=public_cohorts)))
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