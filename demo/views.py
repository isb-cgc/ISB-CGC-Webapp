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

from django.conf import settings
from django.core.urlresolvers import reverse
from django.http import (HttpResponse, HttpResponseRedirect,
                         HttpResponseServerError)
from django.shortcuts import render_to_response, redirect
from django.contrib import messages
from django.template import RequestContext
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.utils import OneLogin_Saml2_Utils

from googleapiclient.errors import HttpError
from google.appengine.api.taskqueue import Task

from google_helpers.storage_service import get_storage_resource
from google_helpers.directory_service import get_directory_resource
from accounts.models import NIH_User

import csv_scanner
import logging
import datetime
import pytz

debug = settings.DEBUG
logger = logging.getLogger(__name__)
DBGAP_AUTHENTICATION_LIST_BUCKET = settings.DBGAP_AUTHENTICATION_LIST_BUCKET
DBGAP_AUTHENTICATION_LIST_FILENAME = settings.DBGAP_AUTHENTICATION_LIST_FILENAME
ACL_GOOGLE_GROUP = settings.ACL_GOOGLE_GROUP
login_expiration_seconds = settings.LOGIN_EXPIRATION_HOURS * 60 * 60
COUNTDOWN_SECONDS = login_expiration_seconds + (60 * 15)

LOGOUT_WORKER_TASKQUEUE = settings.LOGOUT_WORKER_TASKQUEUE
CHECK_NIH_USER_LOGIN_TASK_URI = settings.CHECK_NIH_USER_LOGIN_TASK_URI
CRON_MODULE = settings.CRON_MODULE


def init_saml_auth(req):
    auth = OneLogin_Saml2_Auth(req, custom_base_path=settings.SAML_FOLDER)
    return auth


def prepare_django_request(request):
    # If server is behind proxys or balancers use the HTTP_X_FORWARDED fields
    result = {
        # 'https': 'on' if request.is_secure() else 'off',
        'https': 'on',
        'http_host': request.META['HTTP_HOST'],
        'script_name': request.META['PATH_INFO'],
        # 'server_port': request.META['SERVER_PORT'],
        'get_data': request.GET.copy(),
        'post_data': request.POST.copy()
    }
    return result


# return True if the NIH authorization list contains a row, for which the 'login' field
# has a value equal to $nameid; otherwise, return False
def check_NIH_authorization_list(nameid, storage_client):
    req = storage_client.objects().get_media(
        bucket=DBGAP_AUTHENTICATION_LIST_BUCKET, object=DBGAP_AUTHENTICATION_LIST_FILENAME)

    rows = [row.strip() for row in req.execute().split('\n') if row.strip()]
    return csv_scanner.matching_row_exists(rows, 'login', nameid)


@login_required
@csrf_exempt
def index(request):
    req = prepare_django_request(request)
    auth = init_saml_auth(req)
    errors = []
    not_auth_warn = False
    success_slo = False
    attributes = False
    paint_logout = False

    if 'sso' in req['get_data']:
        if 'redirect_url' in req['get_data']:
            return HttpResponseRedirect(auth.login(return_to=req['get_data']['redirect_url']))
        else:
            return HttpResponseRedirect(auth.login())
    elif 'sso2' in req['get_data']:
        return_to = OneLogin_Saml2_Utils.get_self_url(req) + reverse('attrs')
        return HttpResponseRedirect(auth.login(return_to))
    elif 'slo' in req['get_data']:
        name_id = None
        session_index = None
        if 'samlNameId' in request.session:
            name_id = request.session['samlNameId']
        if 'samlSessionIndex' in request.session:
            session_index = request.session['samlSessionIndex']

        # update record of user in table accounts_nih_user
        # so that active=0
        # and dbGaP_authorized=0

        return HttpResponseRedirect(auth.logout(name_id=name_id, session_index=session_index))
    elif 'acs' in req['get_data']:
        auth.process_response()
        errors = auth.get_errors()
        if errors:
            logger.info('executed auth.get_errors(). errors are:')
            logger.warn(errors)
            logger.info('error is because')
            logger.warn(auth.get_last_error_reason())

        not_auth_warn = not auth.is_authenticated()

        if not errors:
            request.session['samlUserdata'] = auth.get_attributes()
            request.session['samlNameId'] = auth.get_nameid()
            NIH_username = request.session['samlNameId']
            request.session['samlSessionIndex'] = auth.get_session_index()

            user_email = User.objects.get(id=request.user.id).email

            # 1. check if this google identity is currently linked to other NIH usernames
            # note: the NIH username exclusion is case-insensitive so this will not return a false positive
            # e.g. if this google identity is linked to 'NIHUSERNAME1' but just authenticated with 'nihusername1',
            # it will still pass this test
            nih_usernames_already_linked_to_this_google_identity = NIH_User.objects.filter(
                user_id=request.user.id, linked=True).exclude(NIH_username__iexact=NIH_username)
            for nih_user in nih_usernames_already_linked_to_this_google_identity:
                if nih_user.NIH_username.lower() != NIH_username.lower():
                    logger.warn("User {} is already linked to the eRA commons identity {} and attempted authentication"
                                " with the eRA commons identity {}."
                                .format(user_email, nih_user.NIH_username, NIH_username))
                    messages.warning(request, "User {} is already linked to the eRA commons identity {}. "
                                              "Please unlink these before authenticating with the eRA commons "
                                              "identity {}.".format(user_email, nih_user.NIH_username, NIH_username))
                    return redirect('/users/' + str(request.user.id))

            # 2. check if there are other google identities that are still linked to this NIH_username
            # note: the NIH username match is case-insensitive so this will not return a false negative.
            # e.g. if a different google identity is linked to 'NIHUSERNAME1' and this google identity just authenticated with 'nihusername1',
            # this will fail the test and return to the /users/ url with a warning message
            preexisting_nih_users = NIH_User.objects.filter(
                NIH_username__iexact=NIH_username, linked=True).exclude(user_id=request.user.id)

            if len(preexisting_nih_users) > 0:
                preexisting_nih_user_user_ids = [preexisting_nih_user.user_id for preexisting_nih_user in preexisting_nih_users]
                prelinked_user_email_list = [user.email for user in User.objects.filter(id__in=preexisting_nih_user_user_ids)]
                prelinked_user_emails = ', '.join(prelinked_user_email_list)

                logger.warn("User {} tried to log into the NIH account {} that is already linked to user(s) {}".format(
                    user_email,
                    NIH_username,
                    prelinked_user_emails + '.'
                ))
                messages.warning(request, "You tried to log into an NIH account that is linked to another google email address.")
                return redirect('/users/' + str(request.user.id))

            storage_client = get_storage_resource()
            # check authenticated NIH username against NIH authentication list
            is_dbGaP_authorized = check_NIH_authorization_list(NIH_username, storage_client)

            saml_response = None if 'SAMLResponse' not in req['post_data'] else req['post_data']['SAMLResponse']
            saml_response = saml_response.replace('\r\n', '')
            NIH_assertion_expiration = datetime.datetime.now() + datetime.timedelta(days=1)

            updated_values = {
                'NIH_assertion': saml_response,
                'NIH_assertion_expiration': pytz.utc.localize(NIH_assertion_expiration),
                'dbGaP_authorized': is_dbGaP_authorized,
                'user_id': request.user.id,
                'active': 1,
                'linked': True
            }

            nih_user, created = NIH_User.objects.update_or_create(NIH_username=NIH_username,
                                                                  user_id=request.user.id,
                                                                  defaults=updated_values)
            logger.info("NIH_User.objects.update_or_create() returned nih_user: {} and created: {}".format(
                str(nih_user.NIH_username), str(created)))

            # add or remove user from ACL_GOOGLE_GROUP if they are or are not dbGaP authorized
            directory_client, http_auth = get_directory_resource()
            # default warn message is for eRA Commons users who are not dbGaP authorized
            warn_message = '''
            WARNING NOTICE
            You are accessing a US Government web site which may contain information that must be protected under the US Privacy Act or other sensitive information and is intended for Government authorized use only.

            Unauthorized attempts to upload information, change information, or use of this web site may result in disciplinary action, civil, and/or criminal penalties. Unauthorized users of this website should have no expectation of privacy regarding any communications or data processed by this website.

            Anyone accessing this website expressly consents to monitoring of their actions and all communications or data transiting or stored on related to this website and is advised that if such monitoring reveals possible evidence of criminal activity, NIH may provide that evidence to law enforcement officials.
            '''

            if is_dbGaP_authorized:
                # if user is dbGaP authorized, warn message is different
                warn_message = 'You are reminded that when accessing controlled access information you are bound by the dbGaP TCGA DATA USE CERTIFICATION AGREEMENT (DUCA).' + warn_message
            try:
                result = directory_client.members().get(groupKey=ACL_GOOGLE_GROUP,
                                                        memberKey=user_email).execute(http=http_auth)
                # if the user is in the google group but isn't dbGaP authorized, delete member from group
                if len(result) and not is_dbGaP_authorized:
                    directory_client.members().delete(groupKey=ACL_GOOGLE_GROUP,
                                                      memberKey=user_email).execute(http=http_auth)
                    logger.warn("User {} was deleted from group {} because they don't have dbGaP authorization.".format(user_email, ACL_GOOGLE_GROUP))
            # if the user_email doesn't exist in the google group an HttpError will be thrown...
            except HttpError:
                # ...if the user is dbGaP authorized they should be added to the ACL_GOOGLE_GROUP
                if is_dbGaP_authorized:
                    body = {
                        "email": user_email,
                        "role": "MEMBER"
                    }
                    result = directory_client.members().insert(
                        groupKey=ACL_GOOGLE_GROUP,
                        body=body
                    ).execute(http=http_auth)
                    logger.info(result)
                    logger.info("User {} added to {}.".format(user_email, ACL_GOOGLE_GROUP))

            # Add task in queue to deactivate NIH_User entry after NIH_assertion_expiration has passed.
            try:
                task = Task(url=CHECK_NIH_USER_LOGIN_TASK_URI,
                            params={'user_id': request.user.id, 'deployment': CRON_MODULE},
                            countdown=COUNTDOWN_SECONDS)
                task.add(queue_name=LOGOUT_WORKER_TASKQUEUE)
                logger.info('enqueued check_login task for user, {}, for {} hours from now'.format(
                    request.user.id, COUNTDOWN_SECONDS / (60*60)))
            except Exception as e:
                logger.error("Failed to enqueue automatic logout task")
                logging.exception(e)

            messages.info(request, warn_message)
            return HttpResponseRedirect(auth.redirect_to('https://{}'.format(req['http_host'])))

    elif 'sls' in req['get_data']:
        dscb = lambda: request.session.flush()
        url = auth.process_slo(delete_session_cb=dscb)
        errors = auth.get_errors()
        if len(errors) == 0:
            if url is not None:
                return HttpResponseRedirect(url)
            else:
                success_slo = True

    if 'samlUserdata' in request.session:
        paint_logout = True
        if len(request.session['samlUserdata']) > 0:
            attributes = request.session['samlUserdata'].items()

    return render_to_response('demo/index.html',
                              {'errors': errors,
                               'not_auth_warn': not_auth_warn,
                               'success_slo': success_slo,
                               'attributes': attributes,
                               'paint_logout': paint_logout},
                              context_instance=RequestContext(request))


def attrs(request):
    paint_logout = False
    attributes = False

    if 'samlUserdata' in request.session:
        paint_logout = True
        if len(request.session['samlUserdata']) > 0:
            attributes = request.session['samlUserdata'].items()

    return render_to_response('demo/attrs.html',
                              {'paint_logout': paint_logout,
                               'attributes': attributes},
                              context_instance=RequestContext(request))


def metadata(request):
    req = prepare_django_request(request)
    auth = init_saml_auth(req)
    saml_settings = auth.get_settings()
    metadata = saml_settings.get_sp_metadata()
    errors = saml_settings.validate_metadata(metadata)

    if len(errors) == 0:
        resp = HttpResponse(content=metadata, content_type='text/xml')
    else:
        resp = HttpResponseServerError(content=', '.join(errors))
    return resp
