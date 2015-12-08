from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$', views.project_list, name='projects'),
    url(r'^upload/$', views.project_upload, name="project_upload"),
    url(r'^(?P<project_id>\d+)/$', views.project_detail, name='project_detail')
)