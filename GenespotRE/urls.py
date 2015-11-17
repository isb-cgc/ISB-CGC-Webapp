from django.conf.urls import patterns, include, url
from django.contrib import admin
from django.conf import settings

import views


admin.autodiscover()

urlpatterns = patterns('',

    url(r'^$', views.landing_page, name='landing_page'),
    url(r'^user_landing/$', views.user_landing, name='user_landing'),
    url(r'^search_cohorts_viz/$', views.search_cohorts_viz, name='search_cohorts_viz'),
    url(r'^css_test/', views.css_test),
    url(r'^users/$', views.user_list, name='users'),
    url(r'^users/(?P<user_id>\d+)/$', views.user_detail, name='user_detail'),
    url(r'^bucket_object_list/$', views.bucket_object_list, name='bucket_object_list'),
    url(r'^igv/$', views.igv, name='igv'),
    url(r'^igv/(?P<readgroupset_id>\w{0,50})/$', views.igv, name='igv'),
    url(r'^help/$', views.help, name='help'),

    url(r'^cohorts/', include('cohorts.urls')),
    url(r'^visualizations/', include('visualizations.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^accounts/', include('accounts.urls')),
    url(r'^seqpeek/', include('seqpeek.urls')),
    url(r'session_security/', include('session_security.urls')),
    url(r'^tasks/', include('tasks.urls')),
    url(r'^_ah/health$', views.health_check),
)

if settings.LOAD_DEMO_URLS:
    urlpatterns.append(url(r'^demo/', include('demo.urls')))