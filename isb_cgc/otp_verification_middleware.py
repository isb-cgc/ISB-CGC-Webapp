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

from django.shortcuts import redirect
from django.urls import resolve
from django.contrib import messages

class CgcOtpVerificationMiddleware:

    def __init__(self, get_response=None):
        self.get_response = get_response

    def __call__(self, request):
        match = resolve(request.path)
        if match and match.url_name not in ['otp_request', 'logout', 'account_logout']:
            user = getattr(request, 'user', None)
            if user is not None and user.is_authenticated and not user.is_verified():
                messages.warning(request, "Before proceeding you must complete Multi-factor Authentication. Please use the form below.")
                return redirect('otp_request')
        return self.get_response(request)
