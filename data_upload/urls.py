from django.conf.urls import patterns, include, url
from django.contrib import admin

import views

admin.autodiscover()

urlpatterns = patterns('',

    url(r'^upload$', views.upload_file, name='project_data_upload'),
    url(r'^test$', views.test_form, name='data_upload_test'),
)