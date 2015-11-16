from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$', views.projects_list, name='projects_list'),
    url(r'^upload/', views.project_upload, name="project_upload_page"),
    url(r'^(?P<project_id>\d+)/$', views.workbook_detail, name='project_detail')
)