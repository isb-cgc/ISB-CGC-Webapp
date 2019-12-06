###
# Copyright 2015-2019, Institute for Systems Biology
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

from builtins import object
from django.contrib import messages
from django.shortcuts import redirect
from django.conf import settings
import re

class TeamOnly(object):

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

        if settings.RESTRICT_ACCESS:
            if request.path != '/' and not re.match('/?accounts(/google)?/logout/?.*', request.path, re.I):
                if request.user and not request.user.groups.filter(name="idc_team").exists():
                    messages.error(request, "Only IDC Team members may access the development server.")
                    return redirect('landing_page')

        response = self.get_response(request)
        return response
