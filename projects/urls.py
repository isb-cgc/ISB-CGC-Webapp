from django.conf.urls import patterns, url

import views

urlpatterns = [
    url(r'^$', views.project_list, name='projects'),
    url(r'^public/$', views.public_project_list, name='public_projects'),
    url(r'^upload/$', views.project_upload, name="project_upload"),
    url(r'^(?P<project_id>\d+)/$', views.project_detail, name='project_detail'),
    url(r'^(?P<project_id>\d+)/delete/?$', views.project_delete, name="project_delete"),
    url(r'^(?P<project_id>\d+)/edit/?$', views.project_edit, name="project_edit"),
    url(r'^(?P<project_id>\d+)/share/?$', views.project_share, name="project_share"),
    url(r'^data/$', views.upload_files, name='project_file_upload'),
    url(r'^request/$', views.request_project, name="project_request_result"),
    url(r'^(?P<project_id>\d+)/study/(?P<study_id>\d+)/delete/?$', views.study_delete, name="study_delete"),
    url(r'^(?P<project_id>\d+)/study/(?P<study_id>\d+)/edit/?$', views.study_edit, name="study_edit"),
    url(r'^(?P<project_id>\d+)/study/(?P<study_id>\d+)/data/(?P<dataset_id>\d+)/success/?$', views.study_data_success, name="study_data_success"),
    url(r'^(?P<project_id>\d+)/study/(?P<study_id>\d+)/data/(?P<dataset_id>\d+)/error/?$', views.study_data_error, name="study_data_error"),
]