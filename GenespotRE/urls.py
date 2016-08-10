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
    url(r'^users/$', views.user_list, name='users'),
    url(r'^users/(?P<user_id>\d+)/$', views.user_detail, name='user_detail'),

    url(r'^bucket_object_list/$', views.bucket_object_list, name='bucket_object_list'),
    url(r'^igv/$', views.igv, name='igv'),

    url(r'^analysis/', include('analysis.urls')),
    url(r'^workbooks/', include('workbooks.urls')),
    url(r'^cohorts/', include('cohorts.urls')),
    url(r'^visualizations/', include('visualizations.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^accounts/', include('accounts.urls')),
    # url(r'^seqpeek/', include('seqpeek.urls')),
    url(r'session_security/', include('session_security.urls')),
    url(r'^data/', include('data_upload.urls')),
    url(r'^_ah/health$', views.health_check),

    # ------------------------------------------
    # Blink views
    # ------------------------------------------

    url(r'^help/', views.help_page, name='help'),
    url(r'^about/', views.about_page, name='about_page'),
    url(r'^dashboard/', views.dashboard_page, name='dashboard'),

    url(r'^projects/', include('projects.urls')),
    url(r'^genes/', include('genes.urls')),
    url(r'^variables/', include('variables.urls')),
    url(r'^share/', include('sharing.urls')),
]

print settings.NIH_AUTH_ON
if settings.NIH_AUTH_ON:
    urlpatterns.append(url(r'^demo/', include('demo.urls', namespace='demo')))