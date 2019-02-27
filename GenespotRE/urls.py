"""
Copyright 2017, Institute for Systems Biology

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

from django.conf.urls import include, url
from django.contrib import admin
from django.conf import settings

import views

admin.autodiscover()

urlpatterns = [

    url(r'^$', views.landing_page, name='landing_page'),
    url(r'^user_landing/$', views.user_landing, name='user_landing'),
    url(r'^search_cohorts_viz/$', views.search_cohorts_viz, name='search_cohorts_viz'),
    url(r'^style_guide/', views.css_test),
    url(r'^users/(?P<user_id>\d+)/$', views.user_detail, name='user_detail'),

    url(r'^bucket_object_list/$', views.bucket_object_list, name='bucket_object_list'),
    url(r'^igv/$', views.igv, name='igv'),
    url(r'^camic/$', views.camic, name='camic'),
    url(r'^camic/(?P<file_uuid>[A-Za-z0-9\-]+)/$', views.camic, name='camic_barcode'),
    url(r'^dicom/$', views.dicom, name='dicom'),
    url(r'^dicom/(?P<study_uid>[A-Za-z0-9]+)/$', views.dicom, name='dicom_study'),
    url(r'^report/$', views.path_report, name='path_pdf'),
    url(r'^report/(?P<report_file>[A-Za-z0-9._/-]+)/$', views.path_report, name='path_pdf_report'),

    url(r'^images/(?P<file_uuid>[A-Za-z0-9\-]+)/$', views.get_image_data, name='image_data'),
    url(r'^images/', views.get_image_data_args, name='image_data_args'),
    url(r'dicom/(?P<study_uid>[A-Za-z0-9\.]+)/$', views.dicom, name='dicom'),

    url(r'^analysis/', include('analysis.urls')),
    url(r'^workbooks/', include('workbooks.urls')),
    url(r'^cohorts/', include('cohorts.urls')),
    url(r'^visualizations/', include('visualizations.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^accounts/', include('accounts.urls')),
    url(r'^seqpeek/', include('seqpeek.urls')),
    url(r'session_security/', include('session_security.urls')),
    url(r'^data/', include('data_upload.urls')),
    url(r'^_ah/(vm_)?health$', views.health_check),

    # ------------------------------------------
    # Blink views
    # ------------------------------------------

    url(r'^help/', views.help_page, name='help'),
    url(r'^about/', views.about_page, name='about_page'),
    url(r'^dashboard/', views.dashboard_page, name='dashboard'),
    url(r'^extended_login/$', views.extended_login_view, name='extended_login'),
    url(r'^videotutorials/', views.vid_tutorials_page, name='vid_tutorials'),
    url(r'^privacy/', views.privacy_policy, name='privacy'),

    url(r'^programs/', include('projects.urls')),
    url(r'^genes/', include('genes.urls')),
    url(r'^variables/', include('variables.urls')),
    url(r'^share/', include('sharing.urls')),
]

if settings.IS_DEV:
    from django.contrib.staticfiles.urls import staticfiles_urlpatterns
    urlpatterns += staticfiles_urlpatterns()

if settings.DEBUG and settings.DEBUG_TOOLBAR:
    import debug_toolbar
    urlpatterns = [
        url(r'^__debug__/', include(debug_toolbar.urls)),
    ] + urlpatterns
