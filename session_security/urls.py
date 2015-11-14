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


One url meant to be used by JavaScript.

session_security_ping
    Connects the PingView.

To install this url, include it in ``urlpatterns`` definition in ``urls.py``,
ie::

    urlpatterns = patterns('',
        # ....
        url(r'session_security/', include('session_security.urls')),
        # ....
    )

"""
try:
    from django.conf.urls import url, patterns
except ImportError:
    from django.conf.urls.defaults import url, patterns

from .views import PingView

urlpatterns = patterns('',
    url(
        'ping/$',
        PingView.as_view(),
        name='session_security_ping',
    ),
)
