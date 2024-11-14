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
from __future__ import absolute_import

from django.urls import include
from django.urls import path, re_path
from django.contrib import admin
from django.conf import settings
from django.views.generic.base import TemplateView

from . import views

admin.autodiscover()

urlpatterns = [

    re_path(r'^$', views.domain_redirect, name='landing_page'),
    re_path(r'robots.txt', TemplateView.as_view(template_name="robots.txt", content_type="text/plain"), name='robots'),
    re_path(r'^style_guide/', views.css_test),
    re_path(r'^users/$', views.user_detail_login, name='user_detail_login'),
    re_path(r'^users/(?P<user_id>\d+)/$', views.user_detail, name='user_detail'),

    re_path(r'^report/$', views.path_report, name='path_pdf'),
    re_path(r'^report/(?P<report_file>[A-Za-z0-9._/-]+)/$', views.path_report, name='path_pdf_report'),

    re_path(r'^cohorts/', include('cohorts.urls')),
    path('admin/', admin.site.urls),
    re_path(r'^accounts/', include('accounts.urls')),
    re_path(r'^session_security/', include('session_security.urls')),
    re_path(r'^_ah/(vm_)?health$', views.health_check),
    re_path(r'^symposia/', views.symposia, name='symposia'),

    # ------------------------------------------
    # Blink views
    # ------------------------------------------

    re_path(r'^help/', views.help_page, name='help'),
    re_path(r'^about/', views.about_page, name='about_page'),
    re_path(r'^citations/', views.citations_page, name='citations_page'),
    re_path(r'^extended_login/$', views.extended_login_view, name='extended_login'),
    re_path(r'^otp_request/$', views.CgcOtpView.as_view(), name='otp_request'),
    re_path(r'^videotutorials/', views.vid_tutorials_page, name='vid_tutorials'),
    re_path(r'^how_to_discover/', views.how_to_discover_page, name='how_to_discover'),
    re_path(r'^contact_us/', views.contact_us, name='contact_us'),
    re_path(r'^bq_meta_search/$', views.bq_meta_search, name='bq_meta_search'),
    re_path(r'^bq_meta_search/(?P<full_table_id>[A-Za-z0-9._/-]+)/$', views.bq_meta_search, name='bq_meta_search_table'),
    # re_path(r'^bq_meta_search/(?P<table_id>[A-Za-z0-9._/-]+)/$', views.bq_meta_search, name='bq_meta_search_table'),
    # re_path(r'^bq_meta_data/$', views.bq_meta_data, name='bq_meta_data'),
    re_path(r'^programmatic_access/', views.programmatic_access_page, name='programmatic_access'),
    re_path(r'^workflow/', views.workflow_page, name='workflow'),
    # re_path(r'^get_tbl_preview/(?P<proj_id>[A-Za-z0-9._/-]+)/(?P<dataset_id>[A-Za-z0-9._/-]+)/(?P<table_id>[A-Za-z0-9._/-]+)/$', views.get_tbl_preview, name='get_tbl_preview'),

    re_path(r'^privacy/', views.privacy_policy, name='privacy'),

    re_path(r'^programs/', include('projects.urls')),
    re_path(r'^genes/', include('genes.urls')),
    re_path(r'^share/', include('sharing.urls')),
    re_path(r'^opt_in/check_show', views.opt_in_check_show, name='opt_in'),
    re_path(r'^opt_in/update', views.opt_in_update, name='opt_in_update'),
    re_path(r'^opt_in/form/$', views.opt_in_form, name='opt_in_form'),
    re_path(r'^opt_in/form_reg_user/$', views.form_reg_user, name='opt_in_form_reg_user'),
    re_path(r'^opt_in/form_submit', views.opt_in_form_submitted, name='opt_in_form_submitted'),
    re_path(r'^warning/', views.warn_page, name='warn'),
]

if settings.IS_DEV:
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()

if settings.DEBUG_TOOLBAR:
    import debug_toolbar
    urlpatterns = [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
