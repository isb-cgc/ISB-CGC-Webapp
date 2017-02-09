#!/usr/bin/python
# -*- coding: utf-8 -*-

import re

from django.template import Context
from django.template.loader import get_template
import offline
from views import offline_view
import sys


class OfflineMiddleware(object):

    def process_request(self, request):
        # Admin and static always go through
        if request.path.startswith('/admin') or request.path.startswith('/static'):
            return
        # If offline isn't enabled, pass through
        if not offline.is_enabled():
            print >> sys.stdout, "[STATUS] Returning normal process - offline is off"
            return

        # Offline is enabled; double-check for staff users
        if not (hasattr(request, 'user')) or not request.user.is_authenticated() or not (request.user.is_staff or request.user.is_superuser):
            return offline_view(request)

        print >> sys.stdout, "[STATUS] Returning normal process for "+request.path

        return

    def process_response(self, request, response):
        return response

    def is_html_response(self, response):
        print >> sys.stdout, 'Response: ' + (response['Content-Type'].__str__() if 'content-type' in response else 'no content-type found')
        return ('Content-Type' in response and response['Content-Type'].startswith('text/html'))



			
