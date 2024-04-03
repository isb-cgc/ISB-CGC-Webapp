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

import logging

from allauth.account.forms import SignupForm, ChangePasswordForm, SetPasswordForm, ResetPasswordForm, LoginForm
from allauth.socialaccount.models import SocialAccount
from allauth.account.adapter import get_adapter
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.forms import ValidationError

logger = logging.getLogger('main_logger')


class CgcSignUp(SignupForm):
    def clean_email(self):
        email = self.cleaned_data["email"]
        email = get_adapter().clean_email(email)
        try:
            user = User.objects.get(email=email)
            SocialAccount.objects.get(user=user)
            raise ValidationError("Please use Google login with this email address.")
        except ObjectDoesNotExist as e:
            logger.info("[STATUS] Email address {} not found as a social account - proceeding with local account creation.".format(email))
            pass
        return super(CgcSignUp, self).clean_email()


class CgcResetPassword(ResetPasswordForm):
    def clean_email(self):
        email = self.cleaned_data["email"]
        email = get_adapter().clean_email(email)
        try:
            user = User.objects.get(email=email)
            SocialAccount.objects.get(user=user)
            raise ValidationError("This is a Google account - the password cannot be reset from within this system.")
        except ObjectDoesNotExist as e:
            logger.info("[STATUS] User with address {} resetting password.".format(email))
            pass
        return super(CgcResetPassword, self).clean_email()


class CgcLogin(LoginForm):
    def clean(self):
        email = self.user_credentials().get("email")
        print(email)
        try:
            user = User.objects.get(email=email)
            SocialAccount.objects.get(user=user)
            raise ValidationError("Please log into this account using Google (above).")
        except ObjectDoesNotExist as e:
            logger.info("[STATUS] User with local account email address {} logging in.".format(email))
            pass
        return super(CgcLogin, self).clean()
