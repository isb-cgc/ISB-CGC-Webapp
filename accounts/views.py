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
from googleapiclient.errors import HttpError
from django.contrib.auth.models import User
from django.shortcuts import redirect
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.contrib.auth.decorators import login_required
from django.conf import settings
from allauth.account import views as account_views

from google_helpers.directory_service import get_directory_resource
from models import NIH_User


logger = logging.getLogger(__name__)
OPEN_ACL_GOOGLE_GROUP = settings.OPEN_ACL_GOOGLE_GROUP
CONTROLLED_ACL_GOOGLE_GROUP = settings.ACL_GOOGLE_GROUP

@login_required
def extended_logout_view(request):
    # deactivate NIH_username entry if exists
    try:
        nih_user = NIH_User.objects.get(user_id=request.user.id)
        nih_user.active = False
        nih_user.dbGaP_authorized = False
        nih_user.save()
        logger.info("NIH user {} inactivated".format(nih_user.NIH_username))
    except (ObjectDoesNotExist, MultipleObjectsReturned), e:
        if type(e) is MultipleObjectsReturned:
            logger.warn("Error %s on logout: more than one NIH User with user id %d" % (str(e), request.user.id))

    # remove from CONTROLLED_ACL_GOOGLE_GROUP if exists
    directory_service, http_auth = get_directory_resource()
    user_email = User.objects.get(id=request.user.id).email
    try:
        directory_service.members().delete(groupKey=CONTROLLED_ACL_GOOGLE_GROUP, memberKey=str(user_email)).execute(http=http_auth)
        logger.info("Attempting to delete user {} from group {}. "
                    "If an error message doesn't follow, they were successfully deleted"
                    .format(str(user_email), CONTROLLED_ACL_GOOGLE_GROUP))
    except HttpError, e:
        logger.info(e)

    # add user to OPEN_ACL_GOOGLE_GROUP if they are not yet on it
    try:
        body = {"email": user_email, "role": "MEMBER"}
        directory_service.members().insert(groupKey=OPEN_ACL_GOOGLE_GROUP, body=body).execute(http=http_auth)
        logger.info("Attempting to insert user {} into group {}. "
                    "If an error message doesn't follow, they were successfully added."
                    .format(str(user_email), OPEN_ACL_GOOGLE_GROUP))
    except HttpError, e:
        logger.info(e)

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
        directory_service.members().delete(groupKey=CONTROLLED_ACL_GOOGLE_GROUP,
                                           memberKey=user_email).execute(http=http_auth)
    except HttpError, e:
        logger.info("%s could not be deleted from %s, probably because they were not a member: %s" % (user_email, CONTROLLED_ACL_GOOGLE_GROUP, e))

    # redirect to user detail page
    return redirect('/users/' + str(request.user.id))