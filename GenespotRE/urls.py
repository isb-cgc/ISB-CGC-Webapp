from django.conf.urls import patterns, include, url
from django.contrib import admin

import views


admin.autodiscover()

urlpatterns = patterns('',

    url(r'^$', views.landing_page, name='landing_page'),
    url(r'^user_landing/$', views.user_landing, name='user_landing'),
    url(r'^search_cohorts_viz/$', views.search_cohorts_viz, name='search_cohorts_viz'),
    url(r'^css_test/', views.css_test),
    url(r'^users/$', views.user_list, name='users'),
    url(r'^users/(?P<user_id>\d+)/$', views.user_detail, name='user_detail'),
    url(r'^feature_test/$', views.feature_test, name='feature_test'),
    url(r'^igv/$', views.igv, name='igv'),
    url(r'^nih_login/$', views.nih_login, name='nih_login'),

    url(r'^cohorts/', include('cohorts.urls')),
    url(r'^visualizations/', include('visualizations.urls')),
    url(r'^seqpeek/', include('seqpeek.urls')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^accounts/', include('accounts.urls')),
    url(r'session_security/', include('session_security.urls')),
    url(r'^tasks/', include('tasks.urls'))
)
