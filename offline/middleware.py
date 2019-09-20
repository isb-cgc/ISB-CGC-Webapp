#!/usr/bin/python
# -*- coding: utf-8 -*-

from __future__ import absolute_import
#!/usr/bin/python
# -*- coding: utf-8 -*-

from builtins import object
from . import offline
from .views import offline_view

# Customized for IDC by spaquett@systemsbiology.org
# Changes:
#   - Added exception for admin/ and static/ (so pages would load necessary JS and CSS, and so admin can access the
#     admin app to turn it back off).
#   - Altered how access is determined for users logged in
#   - Added sanity check for presence of content-type (since sometimes it wasn't there) to prevent KeyErrors
#   - Upgraded to Django 1.10+ Middleware support

try:
    # Django 1.10
    from django.utils.deprecation import MiddlewareMixin
except ImportError:
    # Django <1.10
    class MiddlewareMixin(object):
        def __init__(self, get_response=None):
            self.get_response = get_response
            super(MiddlewareMixin, self).__init__()

        def __call__(self, request):
            response = None
            if hasattr(self, 'process_request'):
                response = self.process_request(request)
            if not response:
                response = self.get_response(request)
            if hasattr(self, 'process_response'):
                response = self.process_response(request, response)
            return response



class OfflineMiddleware(MiddlewareMixin):

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
