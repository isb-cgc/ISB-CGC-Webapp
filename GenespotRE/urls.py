from django.conf.urls import patterns, include, url
from django.contrib import admin

import views


admin.autodiscover()

urlpatterns = patterns('',

    url(r'^$', views.landing_page, name='landing_page'),
    url(r'^user_landing/$', views.user_landing, name='user_landing'),
    url(r'^search_cohorts_viz/$', views.search_cohorts_viz, name='search_cohorts_viz'),
    url(r'^genespot-re', views.genespotre),
    url(r'^style_guide/', views.css_test),
    url(r'^users/$', views.user_list, name='users'),
    url(r'^users/(?P<user_id>\d+)/$', views.user_detail, name='user_detail'),
    url(r'^feature_test/$', views.feature_test, name='feature_test'),
    url(r'^taskq_test/$', views.taskq_test, name='taskq_test'),
    url(r'^bucket_test/$', views.bucket_access_test, name='bucket_test'),
    url(r'^bucket_object_list/$', views.bucket_object_list, name='bucket_object_list'),
    url(r'^igv/$', views.igv, name='igv'),

    url(r'^workbooks/', include('workbooks.urls')),
    url(r'^cohorts/', include('cohorts.urls')),
    url(r'^visualizations/', include('visualizations.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^accounts/', include('accounts.urls')),
    url(r'^seqpeek/', include('seqpeek.urls')),
    url(r'session_security/', include('session_security.urls')),
    url(r'^tasks/', include('tasks.urls')),
    url(r'^_ah/health$', views.health_check),

    # ------------------------------------------
    # Blink views
    # ------------------------------------------

    url(r'^help/', views.help_page, name='help_page'),
    url(r'^about/', views.about_page, name='about_page'),
    url(r'^dashboard/', views.dashboard_page, name='dashboard'),
)
