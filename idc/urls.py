###
# Copyright 2015-2022, Institute for Systems Biology
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

from __future__ import absolute_import

from django.conf.urls import include, url
from django.urls import path
from django.contrib import admin
from django.conf import settings

from . import views, views_api, demo_views
from cohorts.views import get_query_str_response


admin.autodiscover()

urlpatterns = [

    url(r'^$', views.landing_page, name='landing_page'),
    url(r'^quota/', views.quota_page, name='quota_page'),
    url(r'^users/(?P<user_id>\d+)/$', views.user_detail, name='user_detail'),
    url(r'^users/api/', views_api.user_detail, name='user_detail_api'),

    url(r'^cohort_detail/(?P<cohort_id>\d+)/$', demo_views.cohort_detail, name='cohort_detail'),

    url(r'^cohorts/', include('cohorts.urls')),
    path('admin/', admin.site.urls),
    url(r'^accounts/', include('accounts.urls')),
    url(r'session_security/', include('session_security.urls')),
    url(r'^data/', include('data_upload.urls')),
    url(r'^_ah/(vm_)?health$', views.health_check),

    url(r'^explore/$', views.explore_data_page, name='explore_data'),
    url(r'^explore/filters/', views.parse_explore_filters, name='parse_explore_filters'),
    url(r'^explore/bq_string/$', get_query_str_response, name='explore_bq_string'),
    url(r'^tables/', views.populate_tables, name='populate_tables'),

    url(r'^warning/', views.warn_page, name='warn'),
    url(r'^about/', views.about_page, name='about_page'),
    url(r'^dashboard/', views.dashboard_page, name='dashboard'),
    url(r'^extended_login/$', views.extended_login_view, name='extended_login'),
    url(r'^privacy/', views.privacy_policy, name='privacy'),
    url(r'^news/', views.news_page, name='news'),
    url(r'^collaborators/', views.collaborators, name='collaborators'),
    url(r'^collections/', include('idc_collections.urls')),
    # url(r'^share/', include('sharing.urls')),
]

if settings.IS_DEV:
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()

if settings.DEBUG and settings.DEBUG_TOOLBAR:
    import debug_toolbar
    urlpatterns = [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns

if settings.LOCAL_RESPONSE_PAGES:
    from django.views.defaults import page_not_found, server_error

    def custom_page_not_found(request):
        return page_not_found(request, None)

    def custom_server_error(request):
        return server_error(request)

    urlpatterns += [
        path("404/", custom_page_not_found),
        path("500/", custom_server_error),
    ]
