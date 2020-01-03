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
from django.db.models import Q
from django.shortcuts import redirect
from django.conf import settings
from functools import reduce
import re


# Requires:
# RESTRICT_ACCESS: boolean, toggles checking of access privs; note that the default of RESTRICT_ACCESS is **True**
# RESTRICTED_ACCESS_GROUPS: string list, names of user groups to allow access; access is OR'd (only one required)
class TeamOnly(object):

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.RESTRICT_ACCESS:
            # Allow access to the landing page, and Google logins, because otherwise we'll have no idea who
            # this even is.
            if request.path != '/' and not re.match('/?accounts(/google)?/log(out|in)/?.*', request.path, re.I):
                if request.user.is_authenticated and not request.user.groups.filter(
                        reduce(lambda q, g: q | Q(name__icontains=g), settings.RESTRICTED_ACCESS_GROUPS, Q())
                ).exists():
                    messages.warning(
                        request, "Only members of the {} group{} may access the development server.".format(
                            ", ".join(settings.RESTRICTED_ACCESS_GROUPS),
                            "s" if len(settings.RESTRICTED_ACCESS_GROUPS) > 1 else '')
                    )
                    return redirect('landing_page')

        response = self.get_response(request)
        return response
