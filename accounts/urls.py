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

"""

from django.conf.urls import patterns, url, include
from allauth.socialaccount.providers.google import urls as google_urls, views as google_views

from . import views


urlpatterns = patterns('',
    url(r'^', include(google_urls)),
    # url(r'^logout', account_views.logout, name='account_logout'),
    url(r'^logout', views.extended_logout_view, name='account_logout'),
    url(r'^login/$', google_views.oauth2_login, name='account_login'),
    # url(r'^nih_login/$', views.nih_login, name='nih_login'),
    url(r'^unlink_accounts/', views.unlink_accounts, name='unlink_accounts')
)

