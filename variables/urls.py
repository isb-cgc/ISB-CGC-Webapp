from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$', views.variable_fav_list, name='variables'),
    url(r'^(?P<variable_fav_id>\d+)/$', views.variable_fav_detail, name='variable_fav_detail'),
    url(r'^(?P<variable_fav_id>\d+)/edit', views.variable_fav_edit, name="variable_fav_edit"),
    url(r'^create/$', views.variable_fav_create, name="variable_fav_create"),
)