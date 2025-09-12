###
# Copyright 2015-2025, Institute for Systems Biology
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

from django.urls import include, re_path, path
from django.contrib import admin
from django.conf import settings
from django.views.generic.base import TemplateView

from . import views, views_api, demo_views
from cohorts.views import get_query_str_response


admin.autodiscover()

urlpatterns = [

    re_path(r'^$', views.landing_page, name='landing_page'),
    re_path(r'^quota/$', views.quota_page, name='quota_page'),
    re_path(r'^users/(?P<user_id>\d+)/$', views.user_detail, name='user_detail'),
    re_path(r'^users/api/', views_api.user_detail, name='user_detail_api'),

    re_path(r'^cohort_detail/(?P<cohort_id>\d+)/$', demo_views.cohort_detail, name='cohort_detail'),
    re_path(r'robots.txt$', TemplateView.as_view(template_name="robots.txt", content_type="text/plain"), name='robots'),
    re_path(r'sitemap.xml$', TemplateView.as_view(template_name="sitemap.xml", content_type="text/xml"), name='sitemap'),

    re_path(r'^cohorts/', include('cohorts.urls')),
    path('admin/', admin.site.urls),
    re_path(r'^accounts/', include('accounts.urls')),
    re_path(r'session_security/', include('session_security.urls')),
    re_path(r'^_ah/(vm_)?health$', views.health_check),

    re_path(r'^uihist/$', views.save_ui_hist, name='ui_hist'),
    re_path(r'^explore/$', views.explore_data_page, name='explore_data'),
    re_path(r'^explore/filters/', views.parse_explore_filters, name='parse_explore_filters'),
    re_path(r'^explore/bq_string/$', get_query_str_response, name='explore_bq_string'),
    re_path(r'^explore/manifest/$', views.explorer_manifest, name='get_explore_manifest'),
    re_path(r'^tables/', views.populate_tables, name='populate_tables'),
    re_path(r'^studymp/', views.studymp, name='studymp'),
    re_path(r'^warning/', views.warn_page, name='warn'),
    re_path(r'^about/$', views.about_page, name='about_page'),
    re_path(r'^dashboard/', views.dashboard_page, name='dashboard'),
    re_path(r'^extended_login/$', views.extended_login_view, name='extended_login'),
    re_path(r'^privacy/$', views.privacy_policy, name='privacy'),
    re_path(r'^news/$', views.news_page, name='news'),
    re_path(r'^cart/$', views.cart_page, name='cart'),
    re_path(r'^explore/cart/$', views.cart_page, name='get_explore_cart'),
    re_path(r'^cart_data/$', views.cart_data, name='get_cart_data'),
    re_path(r'^series_ids/(?P<patient_id>[A-Za-z0-9\.\-_]+)/$', views.get_series, name='get_series_by_case'),
    re_path(r'^series_ids/(?P<patient_id>[A-Za-z0-9\.\-_]+)/(?P<study_uid>[0-9\.]+)/$', views.get_series, name='get_series'),
    re_path(r'^collaborators/$', views.collaborators, name='collaborators'),
    re_path(r'^collections/', include('idc_collections.urls')),
    re_path(r'^citations/', views.get_citations, name='get_citations'),
    # re_path(r'^share/', include('sharing.urls')),
]

if settings.IS_DEV:
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()

if settings.DEBUG and settings.DEBUG_TOOLBAR:
    import debug_toolbar
    urlpatterns = [
        re_path(r'^__debug__/', include(debug_toolbar.urls)),
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
