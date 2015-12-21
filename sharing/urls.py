from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^(?P<sharing_id>\d+)/$', views.sharing_add, name='sharing_add'),
    url(r'^(?P<sharing_id>\d+)/remove$', views.sharing_remove, name='sharing_remove'),
)