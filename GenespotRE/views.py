from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.db.models import Count
from django.utils import formats
import json
import collections
from visualizations.models import SavedViz, Viz_Perms
from cohorts.models import Cohort, Cohort_Perms
from datetime import timedelta
from google.appengine.api import urlfetch
from google.appengine.ext import deferred
from scripts.clusterTest import run_cluster
from django.conf import settings
from googleapiclient import discovery
from googleapiclient import http
from googleapiclient.errors import HttpError
from oauth2client.client import GoogleCredentials
from google.appengine.api.taskqueue import Task
import cloudstorage as gcs
from threading import Thread
import datetime
import io
import os
from pytz.gae import pytz
from django.utils import timezone
import logging

from accounts.models import NIH_User
from django.contrib.auth.models import User

from google_helpers.directory_service import get_directory_resource
from google_helpers.storage_service import get_storage_resource
from google_helpers.genomics_service import get_genomics_resource

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
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data


def _decode_list(data):
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
    version = {}
    version['version'] = request.environ["CURRENT_VERSION_ID"].split('.')[0]
    version_id = request.environ["CURRENT_VERSION_ID"].split('.')[1]
    timestamp = long(version_id) / pow(2,28)
    update_time = datetime.datetime.fromtimestamp(timestamp) - timedelta(hours=7)
    version['date'] = update_time.strftime("%d/%m/%y %X")

    return render(request, 'GenespotRE/landing.html',
        {'request': request,
         'version': version})

'''
Returns css_test page used to test css for general ui elements
'''
def css_test(request):
    return render(request, 'GenespotRE/css_test.html', {'request': request})


'''
Returns page that lists users
'''
@login_required
def user_list(request):
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
            user_details['dbGaP_authorized'] = nih_user.dbGaP_authorized
        except (MultipleObjectsReturned, ObjectDoesNotExist), e:
            logger.debug("Error when retrieving nih_user with user_id {}. {}".format(str(user_id), str(e)))

        nih_login_redirect_url = settings.BASE_URL + '/nih_login/'

        eRA_login_url = ERA_LOGIN_URL.strip('/') + '/?sso&redirect_url=' + nih_login_redirect_url

        return render(request, 'GenespotRE/user_detail.html',
                      {'request': request,
                       'user_details': user_details,
                       'eRA_login_url': eRA_login_url
                       })
    else:
        return render(request, '500.html')

'''
Returns page users see after signing in
'''
@login_required
def user_landing(request):

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
    return render(request, 'GenespotRE/feature_test.html', {'request': request})

@login_required
def igv(request):

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
                                                    'datasets': dataset_objs

                                                    })


@login_required
def nih_login(request):
    guid = request.GET.get('guid', None)

    if guid:
        if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine'):
            # read eRA commons identity info from DBGAP_AUTHENTICATION_LIST_BUCKET bucket and delete it
            contents = retrieve_expirable_object_contents_and_delete(
                DBGAP_AUTHENTICATION_LIST_BUCKET,
                str(guid),
                expiration_seconds=60000)
        # for development only
        else:
            storage_client = get_storage_resource()
            req = storage_client.objects().get_media(bucket=DBGAP_AUTHENTICATION_LIST_BUCKET, object=str(guid))
            contents = req.execute()
            # delete object
            req = storage_client.objects().delete(bucket=DBGAP_AUTHENTICATION_LIST_BUCKET, object=str(guid))
            resp = req.execute()

        if contents:
            contents_json = json.loads(contents)

            NIH_username = None if 'NIH_username' not in contents_json else contents_json['NIH_username']
            NIH_assertion = None if 'NIH_assertion' not in contents_json else contents_json['NIH_assertion']
            NIH_assertion_expiration = datetime.datetime.now() + datetime.timedelta(days=1)
            NIH_assertion_expiration = pytz.utc.localize(NIH_assertion_expiration)
            is_dbGaP_authorized = False if 'is_dbGaP_authorized' not in contents_json else contents_json['is_dbGaP_authorized']

            updated_values = {
                'NIH_assertion': NIH_assertion,
                'NIH_assertion_expiration': NIH_assertion_expiration,
                'dbGaP_authorized': is_dbGaP_authorized,
                'user_id': request.user.id
            }

            directory_service, http_auth = get_directory_resource()

            # if there is a preexisting entry in NIH_User
            # that maps google identity user_a@gmail.com to nih_username nih_username_a
            # but later user_b@gmail.com authenticates through NIH with the same nih_username_a
            # then 1) user_a@gmail.com needs to be removed from the google group
            check_google_group_for_preexisting_email_linked_to_NIH_username_and_delete(NIH_username, request.user.id, directory_service, http_auth)

            # and 2) the NIH_User table entry needs to be updated with the new user_id, NIH_assertion, etc.
            nih_user, created = NIH_User.objects.update_or_create(
                NIH_username=NIH_username,
                defaults=updated_values
            )

            user_email = User.objects.get(id=request.user.id).email
            try:
                result = directory_service.members().get(groupKey=ACL_GOOGLE_GROUP,
                                                         memberKey=user_email).execute(http=http_auth)
                # if the user is in the google group but isn't dbGaP authorized, delete member from group
                if len(result) and not is_dbGaP_authorized:
                    directory_service.members().delete(groupKey=ACL_GOOGLE_GROUP,
                                                       memberKey=user_email).execute(http=http_auth)
            # if the member doesn't yet exist in the google group...
            except HttpError:
                # ...but the member is dbGaP authorized...
                if is_dbGaP_authorized:
                    body = {
                        "email": user_email,
                        "role": "MEMBER"
                    }
                    # ...then insert the member into the google group
                    directory_service.members().insert(
                        groupKey=ACL_GOOGLE_GROUP,
                        body=body
                    ).execute(http=http_auth)

            # put task in queue to delete NIH_User entry after NIH_assertion_expiration has passed
            task = Task(url='/tasks/check_user_login', params={'user_id': request.user.id}, countdown=COUNTDOWN_SECONDS)
            task.add(queue_name='logout-worker')
            print('enqueued check_login task for user, {}, for {} hours from now'.format(
                request.user.id, COUNTDOWN_SECONDS / (60*60)))

        else:
            # if there's nothing in the object, or if the object doesn't exist
            # then the nih login should have succeeded
            # but the identity information wasn't written to the bucket
            pass

    else:
        # if guid was not returned, there was an error with the nih login
        pass

    # redirect to user detail page
    return redirect('/users/' + str(request.user.id))


def check_google_group_for_preexisting_email_linked_to_NIH_username_and_delete(
        NIH_username, user_id, directory_service, http_auth):
    try:
        preexisting_nih_user_id = NIH_User.objects.get(NIH_username=NIH_username).user_id
        if user_id != preexisting_nih_user_id:
            preexisting_nih_user_email = User.objects.get(id=preexisting_nih_user_id).email
            try:
                directory_service.members().delete(groupKey=ACL_GOOGLE_GROUP,
                                                   memberKey=preexisting_nih_user_email).execute(http=http_auth)
            except HttpError:
                return
    except NIH_User.DoesNotExist:
        return



# Exception subclass to indicate a specific scenario: an 'expirable' GCS object
# has been succecssfully retrieved, but it is deemed to be expired (this is to
# distinguish between other error cases, such as when an object is simply not
# found, or an irrecoverable error occurs while attempting to retrieve the
# object)
class ExpiredObjectError(Exception):
    pass


# attempt to do the following, for the specified GCS object:
# 1) retrieve the object's metadata and contents
# 2) compare the object's creation time to the specified expiration (expressed
#    in seconds), raising an ExpiredObjectError if the object is expired
# 3) regardless of what happens, attempt to delete the object before returning
#
# if the object is successfully retrieved and is NOT expired, return its
# contents, as a string
def retrieve_expirable_object_contents_and_delete(bucket, object_name, expiration_seconds=15):
    metadata, contents = get_object_with_metadata(bucket, object_name)

    creation_time = datetime.datetime.utcfromtimestamp(metadata.st_ctime)
    age = datetime.datetime.utcnow() - creation_time

    # as soon as we have successfully retrieved the object, delete it. while it is
    # possible that an ExpiredObjectError will be raised below, any client should
    # consider such an error irrecoverable, since an expired object will never
    # stop being expired.
    delete_object(bucket, object_name)

    # check object for expiry -- if it is expired, raise an ExpiredObjectError
    if age.total_seconds() >= expiration_seconds:
        error_msg = 'object, gs://{}/{}, has expired (expiration_seconds: {})'.format(
            bucket, object_name, expiration_seconds)
        raise ExpiredObjectError(error_msg)

    return contents


# fetch and return the specified object's metadata and contents
# (return format: $metadata, $contents)
# if either metadata or contents is not found, raise an IOError
def get_object_with_metadata(bucket, object_name):
    ret_vals = {}

    def get_metadata():
        ret_vals['metadata'] = get_object_metadata(bucket, object_name)

    def get_contents():
        ret_vals['contents'] = read_object(bucket, object_name)
    metadata_thread = Thread(target=get_metadata)
    contents_thread = Thread(target=get_contents)

    metadata_thread.start()
    contents_thread.start()
    metadata_thread.join()
    contents_thread.join()

    missing = filter(lambda k: k not in ret_vals, ['metadata', 'contents'])
    if missing:
        raise gcs.NotFoundError('unable to find {} for gs://{}/{}'.format(
            ' or '.join(missing), bucket, object_name))

    return ret_vals['metadata'], ret_vals['contents']


# fetch the specified object's metadata, as returned by the python client's
# 'stat' call
def get_object_metadata(bucket, object_name):
    return gcs.stat(gcs_filename(bucket, object_name))


# read the specified object and return its contents as a string
def read_object(bucket, object_name):
    with gcs.open(gcs_filename(bucket, object_name)) as gcs_file:
        # gcs_file.seek(-1024, os.SEEK_END)  # file is longer than 1024 characters -- about 26584
        return gcs_file.read()


# try to delete the specified object, ignoring gcs.NotFoundError, if encountered
def delete_object(bucket, object_name):
    try:
        gcs.delete(gcs_filename(bucket, object_name))
    except gcs.NotFoundError:
        pass


# write the specified contents, with the (optional) specified content type, to
# the specified GCS bucket/object
def write_object(bucket, object_name, contents, content_type='text/plain'):
    with gcs.open(gcs_filename(bucket, object_name),
                  'w',
                  content_type=content_type,
                  options={'x-goog-meta-foo': 'foo'}) as f:
        f.write(contents)


# given a bucket and object name, return the filename representation, by which
# that object should be addressed within the GAE GCS client code
def gcs_filename(bucket, object_name):
    return '/{}/{}'.format(bucket, object_name)