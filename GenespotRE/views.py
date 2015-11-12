import sys
import logging
import json
import collections
import io
import time
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
from django.contrib.auth.models import User
from django.conf import settings
from django.template import RequestContext

from google_helpers.genomics_service import get_genomics_resource
from visualizations.models import SavedViz, Viz_Perms
from cohorts.models import Cohort, Cohort_Perms
from accounts.models import NIH_User


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


def convert(data):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data


def _decode_list(data):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
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
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
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
Returns the genespot-re-demo which is just a CSS demo and skin
'''
def genespotre(request):
    return render(request, 'GenespotRE/genespot-re-demo.html', {})

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
    ## CURRENT_VERSION_ID unavailable in mvm...
    ## can use "BACKEND_ID"? e.g. 'mvm:20151016t222058'
    ## Below uses the current local time, not deployment time PT,...
    version = { 'version': modules.get_current_version_name(),
                'date': time.strftime("%d/%m/%y %X")}
    return render(request, 'GenespotRE/landing.html',
                  {'request': request,
                   'version': version})
    # version = {}
    #version['version'] = request.environ["CURRENT_VERSION_ID"].split('.')[0]
    #version_id = request.environ["CURRENT_VERSION_ID"].split('.')[1]
    # timestamp = long(version_id) / pow(2,28)
    # update_time = datetime.fromtimestamp(timestamp) - timedelta(hours=7)
    # version['date'] = update_time.strftime("%d/%m/%y %X")


'''
Returns css_test page used to test css for general ui elements
'''
def css_test(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    return render(request, 'GenespotRE/css_test.html', {'request': request})


'''
Returns page that lists users
'''
@login_required
def user_list(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    url = USER_API_URL + '/users'
    result = urlfetch.fetch(url, deadline=60)
    users = json.loads(str(result.content))
    return render(request, 'GenespotRE/user_list.html', {'request': request,
                                                          'users': users})

from allauth.socialaccount.models import SocialAccount
from django.core.exceptions import MultipleObjectsReturned, ObjectDoesNotExist

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
            print nih_user
            user_details['NIH_username'] = nih_user.NIH_username
            user_details['NIH_assertion_expiration'] = nih_user.NIH_assertion_expiration
            user_details['dbGaP_authorized'] = nih_user.dbGaP_authorized
            user_details['NIH_active'] = nih_user.active
        except (MultipleObjectsReturned, ObjectDoesNotExist), e:
            logger.debug("Error when retrieving nih_user with user_id {}. {}".format(str(user_id), str(e)))

        nih_login_redirect_url = settings.BASE_URL + '/accounts/nih_login/'

        eRA_login_url = ERA_LOGIN_URL.strip('/') + '/?sso&redirect_url=' + nih_login_redirect_url

        return render(request, 'GenespotRE/user_detail.html',
                      {'request': request,
                       'user_details': user_details,
                       'eRA_login_url': eRA_login_url
                       })
    else:
        return render(request, '500.html')


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

    viz_perms = Viz_Perms.objects.filter(user=request.user).values_list('visualization', flat=True)
    visualizations = SavedViz.objects.filter(id__in=viz_perms, active=True).order_by('-last_date_saved')
    for item in visualizations:
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
def feature_test(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    return render(request, 'GenespotRE/feature_test.html', {'request': request})

@login_required
def taskq_test(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    deferred.defer(run_cluster)
    # deferred.defer(run_task, "test 2")
    # deferred.defer(run_task, "test 3")
    # deferred.defer(run_task, "test 4")
    # deferred.defer(run_task, "test 5")

    return render(request, 'GenespotRE/taskq_test.html', {'request': request})

@login_required
def bucket_access_test(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    credentials = GoogleCredentials.get_application_default()
    service = discovery.build('storage', 'v1', credentials=credentials)

    media = http.MediaIoBaseUpload(io.BytesIO('test data'), 'text/plain')
    # print '\n\n', media
    filename = 'test-' + str(datetime.now().replace(microsecond=0).isoformat())
    # print filename
    req = service.objects().insert(bucket='isb-cgc-dev',
                             name=filename,
                             media_body=media,
                             )
    req.execute()

    req = service.objects().list(bucket='isb-cgc-dev')
    resp = req.execute()
    # print resp['items']
    # for item in resp['items']:
    #     print json.dumps(item, indent=2)

    return render(request, 'GenespotRE/bucket_test.html', {'request': request})


@login_required
def igv(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    service, http_auth = get_genomics_resource()
    datasets = convert(service.datasets().list(projectNumber=settings.PROJECT_ID).execute())

    dataset_ids = []
    dataset_objs = []

    if NIH_User.objects.get(user_id=request.user.id).dbGaP_authorized is True:
        for dataset in datasets['datasets']:
            dataset_ids.append(dataset['id'])
            dataset_objs.append({'id': dataset['id'], 'name': dataset['name']})
    else:
        for dataset in datasets['datasets']:
            if 'isPublic' in dataset and dataset['isPublic'] is True:
                dataset_ids.append(dataset['id'])
                dataset_objs.append({'id': dataset['id'], 'name': dataset['name']})

    content = convert(service.readgroupsets().search(body={'datasetIds':dataset_ids}).execute())
    read_group_set_ids = []
    for rgset in content['readGroupSets']:
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

    return render(request, 'GenespotRE/igv.html', {'request': request,
                                                    'datasets': dataset_objs})

def health_check(request):
#    print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    return HttpResponse('')

#------------------------------------
# Blink Views -----------------------
#------------------------------------
def help_page(request):
    print request.user
    return render(request, 'GenespotRE/help.html')

def about_page(request):
    return render(request, 'GenespotRE/about.html', {'request': request, 'data': 'data'})

@login_required
def dashboard_page(request):
    return render(request, 'GenespotRE/dashboard.html', {'request': request, 'data': 'data'})