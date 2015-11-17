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

import datetime
import logging
import json
from threading import Thread

import os
import pytz
from googleapiclient.errors import HttpError
from google.appengine.api.taskqueue import Task
from django.contrib.auth.models import User
from django.shortcuts import redirect
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.contrib.auth.decorators import login_required
from django.conf import settings
from allauth.account import views as account_views

import cloudstorage as gcs
from google_helpers.directory_service import get_directory_resource
from google_helpers.storage_service import get_storage_resource
from models import NIH_User


DBGAP_AUTHENTICATION_LIST_BUCKET = settings.DBGAP_AUTHENTICATION_LIST_BUCKET
login_expiration_seconds = settings.LOGIN_EXPIRATION_HOURS * 60 * 60
COUNTDOWN_SECONDS = login_expiration_seconds + (60 * 15)

logger = logging.getLogger(__name__)
ACL_GOOGLE_GROUP = settings.OPEN_ACL_GOOGLE_GROUP


@login_required
def extended_logout_view(request):
    # deactivate NIH_username entry if exists
    try:
        nih_user = NIH_User.objects.get(user_id=request.user.id)
        nih_user.active = False
        nih_user.save()
        logger.info("NIH user {} inactivated".format(nih_user.NIH_username))
        # todo: is it advisable to set nih_user.dbGaP_authorized to False as well?
    except (ObjectDoesNotExist, MultipleObjectsReturned), e:
        if type(e) is MultipleObjectsReturned:
            logger.warn("Error %s on logout: more than one NIH User with user id %d" % (str(e), request.user.id))

    # remove from isb-cgc-cntl if exists
    directory_service, http_auth = get_directory_resource()
    user_email = User.objects.get(id=request.user.id).email
    try:
        directory_service.members().delete(groupKey=ACL_GOOGLE_GROUP, memberKey=str(user_email)).execute(http=http_auth)
        logger.info("Attempting to delete user {} from group {}. "
                    "If an error message doesn't follow, they were successfully deleted"
                    .format(str(user_email), ACL_GOOGLE_GROUP))
    except HttpError, e:
        logger.info(e)

    # log out of NIH?

    response = account_views.logout(request)
    return response

@login_required
def unlink_accounts(request):

    directory_service, http_auth = get_directory_resource()
    try:
        nih_account_to_unlink = NIH_User.objects.get(user_id=request.user.id)
        nih_account_to_unlink.delete()
        # todo: delete from google group

    except (ObjectDoesNotExist, MultipleObjectsReturned), e:
        if type(e) is MultipleObjectsReturned:
            logger.warn("Error %s: more than one NIH User account linked to user id %d" % (str(e), request.user.id))
            NIH_User.objects.filter(user_id=request.user.id).delete()
            # todo: delete from google group

    user_email = User.objects.get(id=request.user.id).email
    try:
        directory_service.members().delete(groupKey=ACL_GOOGLE_GROUP,
                                           memberKey=user_email).execute(http=http_auth)
    except HttpError, e:
        logger.info("%s could not be deleted from %s, probably because they were not a member: %s" % (user_email, ACL_GOOGLE_GROUP, e))

    # redirect to user detail page
    return redirect('/users/' + str(request.user.id))

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
                'user_id': request.user.id,
                'active': True
            }

            try:
                preexisting_nih_user = NIH_User.objects.get(NIH_username=NIH_username)
                if preexisting_nih_user.user_id != request.user.id:
                    # todo: error message
                    return redirect('/users/' + str(request.user.id))

            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                if type(e) is MultipleObjectsReturned:
                    logger.warn("Error %s on NIH login: more than one NIH User with NIH_username %s" % (str(e), NIH_username))

            directory_service, http_auth = get_directory_resource()

            # if there is a preexisting entry in NIH_User
            # that maps google identity user_a@gmail.com to nih_username nih_username_a
            # but later user_b@gmail.com authenticates through NIH with the same nih_username_a
            # then 1) user_a@gmail.com needs to be removed from the google group
            # todo: determine if step 1 is still a good idea
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
                # ...and the member is dbGaP authorized...
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
                    logger.info("User {} added to {}.".format(user_email, ACL_GOOGLE_GROUP))

            # put task in queue to deactivate NIH_User entry after NIH_assertion_expiration has passed
            task = Task(url='/tasks/check_user_login', params={'user_id': request.user.id}, countdown=COUNTDOWN_SECONDS)
            task.add(queue_name='logout-worker')
            logger.info('enqueued check_login task for user, {}, for {} hours from now'.format(
                request.user.id, COUNTDOWN_SECONDS / (60*60)))

        else:
            # if there's nothing in the object, or if the object doesn't exist
            # then the nih login should have succeeded
            # but the identity information wasn't written to the bucket
            # todo: error message
            pass

    else:
        # if guid was not returned, there was an error with the nih login
        # todo: error message
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
