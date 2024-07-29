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
from allauth.socialaccount.forms import SignupForm as SocialSignupForm
from allauth.socialaccount.models import SocialAccount
from allauth.account.adapter import get_adapter
from allauth.socialaccount.adapter import get_adapter as get_adapter_social
from django_otp.forms import OTPTokenForm
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.forms import ValidationError, CharField, TextInput
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger(__name__)


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
        cleaned_data = super(CgcLogin, self).clean()
        if cleaned_data:
            email = self.user_credentials().get("email")
            try:
                user = User.objects.get(email=email)
                SocialAccount.objects.get(user=user)
                raise ValidationError("Please log into this account using Google (above).")
            except ObjectDoesNotExist as e:
                logger.info("[STATUS] User with local account email address {} logging in.".format(email))
                pass
        return cleaned_data


class CgcSocialSignUp(SocialSignupForm):
    def __init__(self, *args, **kwargs):
        self.is_already_local = False
        self.sociallogin = kwargs.get("sociallogin")
        initial = get_adapter_social().get_signup_form_initial_data(self.sociallogin)
        email = initial['email']
        try:
            user = User.objects.get(email=email)
            social = SocialAccount.objects.filter(user=user)
            if len(social) <= 0:
                self.is_already_local = True
                self.init_email = email
        except ObjectDoesNotExist as e:
            # new user signup - we can proceed
            pass
        super(CgcSocialSignUp, self).__init__(*args, **kwargs)


class CgcOtpTokenForm(OTPTokenForm):
    token_sent = False
    handling_token = False
    next_field = None

    def __init__(self, user, request=None, next_field=None, *args, **kwargs):
        if next_field:
            self.next_field = next_field
        super().__init__(user, request, *args, **kwargs)
        # Customize some of the error messages
        self.otp_error_messages['invalid_token'] = _(
            'Invalid login code. Please make sure you have entered it correctly.'
        )
        self.otp_error_messages['token_required'] = _('Please enter your login code below.')
        self.otp_error_messages['challenge_message'] = _('Multifactor Authentication: {0}')

    def _handle_challenge(self, device):
        token_error = None
        try:
            super()._handle_challenge(device)
        except ValidationError as e:
            self.token_sent = bool(e.code == 'challenge_message' and e.message.find('sent by email') >= 0)
            token_error = e
        if token_error:
            raise token_error
