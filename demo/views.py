"""
Copyright 2017, Institute for Systems Biology

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
from django.core.exceptions import MultipleObjectsReturned, ObjectDoesNotExist
from django.http import (HttpResponse, HttpResponseRedirect,
                         HttpResponseServerError)
from django.shortcuts import render_to_response, redirect
from django.contrib import messages
from django.template import RequestContext
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.utils import OneLogin_Saml2_Utils

from googleapiclient.errors import HttpError

from google_helpers.directory_service import get_directory_resource
from google_helpers.pubsub_service import get_pubsub_service, get_full_topic_name
from google_helpers.stackdriver import StackDriverLogger
from accounts.models import NIH_User, UserAuthorizedDatasets, AuthorizedDataset
from dataset_utils.dataset_access_support_factory import DatasetAccessSupportFactory

import base64
import sys
from json import dumps as json_dumps
import logging
import datetime
import pytz

debug = settings.DEBUG
logger = logging.getLogger('main_logger')
login_expiration_seconds = settings.LOGIN_EXPIRATION_MINUTES * 60
COUNTDOWN_SECONDS = login_expiration_seconds + (60 * 15)

LOGOUT_WORKER_TASKQUEUE = settings.LOGOUT_WORKER_TASKQUEUE
CHECK_NIH_USER_LOGIN_TASK_URI = settings.CHECK_NIH_USER_LOGIN_TASK_URI
CRON_MODULE = settings.CRON_MODULE

PUBSUB_TOPIC_ERA_LOGIN = settings.PUBSUB_TOPIC_ERA_LOGIN
LOG_NAME_ERA_LOGIN_VIEW = settings.LOG_NAME_ERA_LOGIN_VIEW


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

    logger.info("[STATUS] prepared request: "+result.__str__())
    return result


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

    st_logger = StackDriverLogger.build_from_django_settings()

    try:
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

            return HttpResponseRedirect(auth.logout(name_id=name_id, session_index=session_index))
        elif 'acs' in req['get_data']:
            st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW, "[STATUS] received ?acs")
            print >> sys.stdout, "[STATUS] recevied ?acs:"
            print >> sys.stdout, req.__str__()
            print >> sys.stdout, req['get_data'].__str__()
            auth.process_response()
            errors = auth.get_errors()
            if errors:
                st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW, "[ERROR] executed auth.get_errors(). errors are:")
                logger.info('executed auth.get_errors(). errors are:')
                logger.warn(errors)
                st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW, "[ERROR] {}".format(repr(errors)))
                logger.info('error is because')
                auth_last_error = auth.get_last_error_reason()
                logger.warn(auth_last_error)
                st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW,
                                               "[ERROR] last error: {}".format(str(auth_last_error)))

            not_auth_warn = not auth.is_authenticated()

            st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW, "[STATUS] no errors in 'auth' object")

            if not errors:
                das = DatasetAccessSupportFactory.from_webapp_django_settings()
                authorized_datasets = []
                try:
                    st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW, "[STATUS] processing 'acs' response")

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
                            logger.warn(
                                "User {} is already linked to the eRA commons identity {} and attempted authentication"
                                " with the eRA commons identity {}."
                                    .format(user_email, nih_user.NIH_username, NIH_username))
                            st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW, "[STATUS] {}".format(
                                "User {} is already linked to the eRA commons identity {} and attempted authentication"
                                " with the eRA commons identity {}."
                                    .format(user_email, nih_user.NIH_username, NIH_username)))

                            messages.warning(request, "User {} is already linked to the eRA commons identity {}. "
                                                      "Please unlink these before authenticating with the eRA commons "
                                                      "identity {}.".format(user_email, nih_user.NIH_username,
                                                                            NIH_username))
                            return redirect('/users/' + str(request.user.id))

                    # 2. check if there are other google identities that are still linked to this NIH_username
                    # note: the NIH username match is case-insensitive so this will not return a false negative.
                    # e.g. if a different google identity is linked to 'NIHUSERNAME1' and this google identity just authenticated with 'nihusername1',
                    # this will fail the test and return to the /users/ url with a warning message
                    preexisting_nih_users = NIH_User.objects.filter(
                        NIH_username__iexact=NIH_username, linked=True).exclude(user_id=request.user.id)

                    if len(preexisting_nih_users) > 0:
                        preexisting_nih_user_user_ids = [preexisting_nih_user.user_id for preexisting_nih_user in
                                                         preexisting_nih_users]
                        prelinked_user_email_list = [user.email for user in
                                                     User.objects.filter(id__in=preexisting_nih_user_user_ids)]
                        prelinked_user_emails = ', '.join(prelinked_user_email_list)

                        logger.warn(
                            "User {} tried to log into the NIH account {} that is already linked to user(s) {}".format(
                                user_email,
                                NIH_username,
                                prelinked_user_emails + '.'
                            ))
                        st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW,
                                                       "User {} tried to log into the NIH account {} that is already linked to user(s) {}".format(
                                                           user_email,
                                                           NIH_username,
                                                           prelinked_user_emails + '.'
                                                       ))

                        messages.warning(request,
                                         "You tried to log into an NIH account that is linked to another google email address.")
                        return redirect('/users/' + str(request.user.id))

                except Exception as e:
                    st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW,
                                                   "[ERROR] Exception while finding user email: {}".format(str(e)))
                    logger.exception(e)

                try:
                    st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW, "[STATUS] Updating Django model")

                    authorized_datasets = das.get_datasets_for_era_login(user_email)
                    print >> sys.stdout, ("[STATUS] Auth datasets for user email %s: " % user_email) +str(authorized_datasets)

                    saml_response = None if 'SAMLResponse' not in req['post_data'] else req['post_data']['SAMLResponse']
                    saml_response = saml_response.replace('\r\n', '')
                    NIH_assertion_expiration = datetime.datetime.now() + datetime.timedelta(
                        seconds=login_expiration_seconds)

                    updated_values = {
                        'NIH_assertion': saml_response,
                        'NIH_assertion_expiration': pytz.utc.localize(NIH_assertion_expiration),
                        'user_id': request.user.id,
                        'active': 1,
                        'linked': True
                    }

                    nih_user, created = NIH_User.objects.update_or_create(NIH_username=NIH_username,
                                                                          user_id=request.user.id,
                                                                          defaults=updated_values)
                    logger.info("NIH_User.objects.update_or_create() returned nih_user: {} and created: {}".format(
                        str(nih_user.NIH_username), str(created)))
                    st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW,
                                                   "[STATUS] NIH_User.objects.update_or_create() returned nih_user: {} and created: {}".format(
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

                except Exception as e:
                    st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW,
                                                   "[ERROR] Exception while finding user email: {}".format(str(e)))
                    logger.error("[ERROR] Exception while finding user email: ")
                    logger.exception(e)

                if len(authorized_datasets) > 0:
                    # if user has access to one or more datasets, warn message is different
                    warn_message = 'You are reminded that when accessing controlled access information you are bound by the dbGaP DATA USE CERTIFICATION AGREEMENT (DUCA) for each dataset.' + warn_message

                all_datasets = das.get_all_datasets_and_google_groups()

                print >> sys.stdout, "[STATUS] All datasets: "+str(all_datasets)

                for dataset in all_datasets:
                    ad = None
                    try:
                        ad = AuthorizedDataset.objects.get(whitelist_id=dataset.dataset_id,
                                                           acl_google_group=dataset.google_group_name)
                    except (ObjectDoesNotExist, MultipleObjectsReturned) as e:
                        logger.error((
                             "[ERROR] " + ("More than one dataset " if type(e) is MultipleObjectsReturned else "No dataset ") +
                             "found for this ID and Google Group Name in the database: %s, %s") % (dataset.dataset_id, dataset.google_group_name)
                        )
                        continue

                    uad = UserAuthorizedDatasets.objects.filter(nih_user=nih_user, authorized_dataset=ad)
                    dataset_in_auth_set = next((ds for ds in authorized_datasets if (ds.dataset_id == dataset.dataset_id and ds.google_group_name == dataset.google_group_name)), None)

                    logger.debug("In for datasets, %s was in auth set: %s" % (dataset.dataset_id, ('True' if dataset_in_auth_set else 'False')))

                    try:
                        result = directory_client.members().get(groupKey=dataset.google_group_name,
                                                                memberKey=user_email).execute(http=http_auth)

                        # If we found them in the ACL but they're not currently authorized for it, remove them from it and the table
                        if len(result) and not dataset_in_auth_set:
                            directory_client.members().delete(groupKey=dataset.google_group_name,
                                                              memberKey=user_email).execute(http=http_auth)
                            logger.warn(
                                "User {} was deleted from group {} because they don't have dbGaP authorization.".format(
                                    user_email, dataset.google_group_name
                                )
                            )
                            st_logger.write_text_log_entry(
                                LOG_NAME_ERA_LOGIN_VIEW,
                                "[WARN] User {} was deleted from group {} because they don't have dbGaP authorization.".format(
                                    user_email, dataset.google_group_name
                                )
                            )

                        if len(uad) and not dataset_in_auth_set:
                            uad.delete()
                        # Sometimes an account is in the Google Group but not the database - add them if they should
                        # have access
                        elif not len(uad) and len(result) and dataset_in_auth_set:
                            logger.info(
                                "User {} was was found in group {} but not the database--adding them.".format(
                                    user_email, dataset.google_group_name
                                )
                            )
                            st_logger.write_text_log_entry(
                                LOG_NAME_ERA_LOGIN_VIEW,
                                "[WARN] User {} was was found in group {} but not the database--adding them.".format(
                                    user_email, dataset.google_group_name
                                )
                            )
                            uad, created = UserAuthorizedDatasets.objects.update_or_create(nih_user=nih_user,
                                                                                  authorized_dataset=ad)
                            if not created:
                                logger.warn("[WARNING] Unable to create entry for user {} and dataset {}.".format(user_email,ad.whitelist_id))
                            else:
                                logger.info("[STATUS] Added user {} to dataset {}.".format(user_email, ad.whitelist_id))

                    # if the user_email doesn't exist in the google group an HttpError will be thrown...
                    except HttpError:
                        # Check for their need to be in the ACL, and add them
                        if dataset_in_auth_set:
                            body = {
                                "email": user_email,
                                "role": "MEMBER"
                            }

                            result = directory_client.members().insert(
                                groupKey=dataset.google_group_name,
                                body=body
                            ).execute(http=http_auth)

                            # Then add then to the database as well
                            if not len(uad):
                                uad, created = UserAuthorizedDatasets.objects.update_or_create(nih_user=nih_user, authorized_dataset=ad)
                                if not created:
                                    logger.warn("[WARNING] Unable to create entry for user {} and dataset {}.".format(user_email,ad.whitelist_id))
                                else:
                                    logger.info("[STATUS] Added user {} to dataset {}.".format(user_email,ad.whitelist_id))

                            logger.info(result)
                            logger.info("User {} added to {}.".format(user_email, dataset.google_group_name))
                            st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW, "[STATUS] User {} added to {}.".format(user_email, dataset.google_group_name))

                # Add task in queue to deactivate NIH_User entry after NIH_assertion_expiration has passed.
                try:
                    full_topic_name = get_full_topic_name(PUBSUB_TOPIC_ERA_LOGIN)
                    logger.info("Full topic name: {}".format(full_topic_name))
                    client = get_pubsub_service()
                    params = {
                        'event_type': 'era_login',
                        'user_id': request.user.id,
                        'deployment': CRON_MODULE
                    }
                    message = json_dumps(params)

                    body = {
                        'messages': [
                            {
                                'data': base64.b64encode(message.encode('utf-8'))
                            }
                        ]
                    }
                    client.projects().topics().publish(topic=full_topic_name, body=body).execute()
                    st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW,
                                                   "[STATUS] Notification sent to PubSub topic: {}".format(full_topic_name))

                except Exception as e:
                    logger.error("[ERROR] Failed to publish to PubSub topic")
                    logger.exception(e)
                    st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW,
                                                   "[ERROR] Failed to publish to PubSub topic: {}".format(str(e)))

                messages.info(request, warn_message)
                logger.info("[STATUS] http_host: " + req['http_host'])
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

    except Exception as e:
        logger.error("[ERROR] While accessing views/index: ")
        logger.exception(e)
        messages.error(request, "There was an error when attempting to log in/out - please contact an administrator.")
        st_logger.write_text_log_entry(LOG_NAME_ERA_LOGIN_VIEW,
                                   "[ERROR] While accessing views/index: {}".format(str(e)))

    # if we've made it here, it's likely an error state - go back to the user's detail page
    return HttpResponseRedirect(reverse('user_detail', args=[request.user.id]))


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
