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

import endpoints
import logging
import django
import pytz
import datetime
from protorpc import messages
from protorpc import remote
from django.conf import settings

from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.contrib.auth.models import User as Django_User
from accounts.models import NIH_User

from google_helpers.directory_service import get_directory_resource
from googleapiclient.errors import HttpError
from api_helpers import *

logger = logging.getLogger(__name__)

CONTROLLED_ACL_GOOGLE_GROUP = settings.ACL_GOOGLE_GROUP


class ReturnJSON(messages.Message):
    msg = messages.StringField(1)

def is_dbgap_authorized(user_email):
    directory_service, http_auth = get_directory_resource()
    try:
        directory_service.members().get(groupKey=CONTROLLED_ACL_GOOGLE_GROUP,
                                        memberKey=user_email).execute(http=http_auth)
        return True
    except HttpError, e:
        logger.info("{} checked their membership in {} and saw they were not in that group."
                    .format(user_email, CONTROLLED_ACL_GOOGLE_GROUP))
        return False


User_Endpoints = endpoints.api(name='user_api', version='v1')

@User_Endpoints.api_class(resource_name='user_endpoints')
class User_Endpoints_API(remote.Service):

    GET_RESOURCE = endpoints.ResourceContainer(token=messages.StringField(1, required=False))
    @endpoints.method(GET_RESOURCE, ReturnJSON,
                      path='am_i_dbgap_authorized', http_method='GET', name='user.amiauthorized')
    def am_i_dbgap_authorized(self, request):
        print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
        user_email = None

        if endpoints.get_current_user() is not None:
            user_email = endpoints.get_current_user().email()

        # users have the option of pasting the access token in the query string
        # or in the 'token' field in the api explorer
        # but this is not required
        access_token = request.__getattribute__('token')
        if access_token:
            user_email = get_user_email_from_token(access_token)

        if user_email:
            am_dbgap_authorized = is_dbgap_authorized(user_email)

            if not am_dbgap_authorized:
                return ReturnJSON(msg="You are not on the controlled-access google group.")

            # all the following situations should never happen
            django.setup()

            # 1. check to make sure they have an entry in auth_user
            try:
                django_user = Django_User.objects.get(email=user_email)
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.error("Email {} is in {} group but did not have a unique entry in auth_user table. Error: {}"
                             .format(user_email, CONTROLLED_ACL_GOOGLE_GROUP, e))
                raise endpoints.NotFoundException("{} is in the controlled-access google group "
                                                  "but does not have an entry in the user database."
                                                  .format(user_email))

            # 2. check to make sure they have an entry in accounts_nih_user
            try:
                nih_user = NIH_User.objects.get(user_id=django_user.id)
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.error("Email {} is in {} group but did not have a unique entry in "
                             "accounts_nih_user table. Error: {}"
                             .format(user_email, CONTROLLED_ACL_GOOGLE_GROUP, e))
                raise endpoints.NotFoundException("{} is in the controlled-access google group "
                                                  "but does not have an entry in the nih_user database."
                                                  .format(user_email))

            # 3. check if their entry in accounts_nih_user is currently active
            if not nih_user.active:
                logger.error("Email {} is in {} group but their entry in accounts_nih_user table is inactive."
                             .format(user_email, CONTROLLED_ACL_GOOGLE_GROUP))
                raise endpoints.NotFoundException("{} is in the controlled-access google group "
                                                  "but has an inactive entry in the nih_user database."
                                                  .format(user_email))

            # 4. check if their entry in accounts_nih_user is dbGaP_authorized
            if not nih_user.dbGaP_authorized:
                logger.error("Email {} is in {} group but their entry in accounts_nih_user table "
                             "is not dbGaP_authorized."
                             .format(user_email, CONTROLLED_ACL_GOOGLE_GROUP))
                raise endpoints.NotFoundException("{} is in the controlled-access google group "
                                                  "but their entry in the nih_user database is not dbGaP_authorized."
                                                  .format(user_email))

            # 5. check if their dbgap authorization has expired
            expire_time = nih_user.NIH_assertion_expiration
            expire_time = expire_time if expire_time.tzinfo is not None else pytz.utc.localize(expire_time)
            now_in_utc = pytz.utc.localize(datetime.datetime.now())

            if (expire_time - now_in_utc).total_seconds() <= 0:
                logger.error("Email {} is in {} group but their entry in accounts_nih_user table "
                             "is expired."
                             .format(user_email, CONTROLLED_ACL_GOOGLE_GROUP))
                raise endpoints.NotFoundException("{} is in the controlled-access google group "
                                                  "but their entry in the nih_user database is expired."
                                                  .format(user_email))

            # all checks have passed
            return ReturnJSON(msg="{} has dbGaP authorization and is a member of the controlled-access google group."
                              .format(user_email))
        else:
            raise endpoints.UnauthorizedException("Authentication unsuccessful.")



