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

from google_helpers.stackdriver import StackDriverLogger
from accounts.sa_utils import demo_process_success

import logging


debug = settings.DEBUG
logger = logging.getLogger('main_logger')
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
            saml_response = None if 'SAMLResponse' not in req['post_data'] else req['post_data']['SAMLResponse']
            login_result = demo_process_success(auth, request.user.id, saml_response)

            for key in login_result.session_dict.keys():
                request.session[key] = login_result.session_dict[key]
            for warn in login_result.messages:
                messages.warning(request, warn)
            return redirect('/users/' + str(request.user.id))

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
        logger.error("[ERROR] In demo/views.index: ")
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
