#!/usr/bin/python
# -*- coding: utf-8 -*-

import re

from django.template import Context
from django.template.loader import get_template
import offline
from views import offline_view
import sys

# Customized for ISB-CGC by spaquett@systemsbiology.org
# Changes:
#   - Added exception for admin/ and static/ (so pages would load necessary JS and CSS, and so admin can access the
#     admin app to turn it back off).
#   - Altered how access is determined for users logged in
#   - Added sanity check for presence of content-type (since sometimes it wasn't there) to prevent KeyErrors


class OfflineMiddleware(object):

    def process_request(self, request):
        # Admin and static always go through
        if request.path.startswith('/admin') or request.path.startswith('/static'):
            return
        # If offline isn't enabled, pass through
        if not offline.is_enabled():
            return

        # Offline is enabled; double-check for staff users
        if not (hasattr(request, 'user')) or not request.user.is_authenticated() or not (request.user.is_staff and request.user.is_superuser):
            return offline_view(request)

        return

    def process_response(self, request, response):
        return response

    def is_html_response(self, response):
        return ('Content-Type' in response and response['Content-Type'].startswith('text/html'))
