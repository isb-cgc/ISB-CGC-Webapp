###
# Copyright 2015-2024, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

from django.contrib import messages
from django.shortcuts import redirect
from django.urls import resolve
import logging
from allauth.socialaccount.models import SocialAccount
from accounts.models import PasswordExpiration,set_password_expiration
from django.core.exceptions import ObjectDoesNotExist

# Adapted in part from django-password-expire by spaquett

logger = logging.getLogger('main_logger')

class PasswordExpireMiddleware:
    """
    Adds Django message if password expires soon.
    Checks if user should be redirected to change password.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            if request.user.is_authenticated:
                if self.is_page_for_warning(request):
                    try:
                        is_social = SocialAccount.objects.get(user=request.user)
                    except ObjectDoesNotExist as e:
                        is_social = None
                    # Only check non-social accounts
                    if is_social is None:
                        try:
                            password_expr = PasswordExpiration.objects.get(user=request.user)
                        except ObjectDoesNotExist:
                            # In rare cases a password expiration may be missing--detect and fix
                            # that here
                            set_password_expiration(None, request, request.user)
                            password_expr = PasswordExpiration.objects.get(user=request.user)
                        if password_expr.expired() and self.is_page_for_redirect():
                            # Require password change before continuing
                            request.redirect_to_password_change = True
                            msg = f'Before you proceed you must change your password. It has expired.'
                            self.add_warning(request, msg)
                        else:
                            # add warning if within the notification window for password expiration
                            if password_expr.warn():
                                msg = f'Please consider changing your password. It expires on {password_expr.expiration_date}.'
                                self.add_warning(request, msg)
        except Exception as e:
            logger.error("[ERROR] While checking password expiration:")
            logger.exception(e)
        response = self.get_response(request)

        # picks up flag for forcing password change
        if getattr(request, 'redirect_to_password_change', False):
            return redirect('account_reset_password')

        return response


    def is_page_for_redirect(self, request):
        """
        Only warn on pages that are GET requests and not ajax. Also ignore logouts.
        """
        match = resolve(request.path)
        if match and match.url_name not in ["account_reset_password","logout", "account_reset_password_done", "account_reset_password_from_key"]:
            if request.method == "GET" and request.headers.get('x-requested-with') != 'XMLHttpRequest':
                return True
            return False
        return False


    def is_page_for_warning(self, request):
        """
        Only warn on pages that are GET requests and not ajax. Also ignore logouts.
        """
        match = resolve(request.path)
        if match and match.url_name not in ["logout"]:
            if request.method == "GET" and request.headers.get('x-requested-with') != 'XMLHttpRequest':
                return True
            return False
        return False


    def add_warning(self, request, text):
        storage = messages.get_messages(request)
        for message in storage:
            # only add this message once
            if message.extra_tags is not None and 'password-expire' in message.extra_tags:
                return
        messages.warning(request, text, extra_tags='password-expire')
