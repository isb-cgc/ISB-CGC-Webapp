from django.conf.urls import url

import views

urlpatterns = [
    url(r'^$', views.notebook_list, name='notebooks'),
    url(r'^public$', views.notebook_list, name='notebooks_public'),
    url(r'^create$',                        views.notebook, name='notebook_create'),
    url(r'^(?P<notebook_id>\d+)/$',         views.notebook, name='notebook_detail'),
    url(r'^(?P<notebook_id>\d+)/edit$',     views.notebook, name='notebook_edit'),
    url(r'^(?P<notebook_id>\d+)/delete$',   views.notebook, name='notebook_delete'),
    url(r'^(?P<notebook_id>\d+)/copy$',     views.notebook, name='notebook_copy')
]
