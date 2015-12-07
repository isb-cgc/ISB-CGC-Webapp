"""

Copyright 2015, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.


Settings for django-session-security.

WARN_AFTER
    Time (in seconds) before the user should be warned that is session will
    expire because of inactivity. Default 540. Overridable in
    ``settings.SESSION_SECURITY_WARN_AFTER``.

EXPIRE_AFTER
    Time (in seconds) before the user should be logged out if inactive. Default
    is 600. Overridable in ``settings.SESSION_SECURITY_EXPIRE_AFTER``.

PASSIVE_URLS
    List of urls that should be ignored by the middleware. For example the ping
    ajax request of session_security is made without user intervention, as such
    it should not be used to update the user's last activity datetime.
    Overridable in ``settings.SESSION_SECURITY_PASSIVE_URLS``.

Note that this module will raise a warning if
``settings.SESSION_EXPIRE_AT_BROWSER_CLOSE`` is not True, because it makes no
sense to use this app with ``SESSION_EXPIRE_AT_BROWSER_CLOSE`` to False.
"""

import warnings

from django.core import urlresolvers
from django.conf import settings


__all__ = ['EXPIRE_AFTER', 'WARN_AFTER', 'PASSIVE_URLS']

EXPIRE_AFTER = getattr(settings, 'SESSION_SECURITY_EXPIRE_AFTER', 600)

WARN_AFTER = getattr(settings, 'SESSION_SECURITY_WARN_AFTER', 540)

PASSIVE_URLS = getattr(settings, 'SESSION_SECURITY_PASSIVE_URLS', [])
PASSIVE_URLS += [
    urlresolvers.reverse('session_security_ping'),
]

if not getattr(settings, 'SESSION_EXPIRE_AT_BROWSER_CLOSE', False):
    warnings.warn('settings.SESSION_EXPIRE_AT_BROWSER_CLOSE is not True')
