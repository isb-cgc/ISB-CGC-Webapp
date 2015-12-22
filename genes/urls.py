from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$', views.genes_list, name='genes'),
    url(r'^(?P<genes_id>\d+)/$', views.genes_detail, name='genes_detail'),
    url(r'^(?P<genes_id>\d+)/edit', views.genes_list_edit, name="edit_genes_list"),
    url(r'^(?P<genes_id>\d+)/upload/$', views.genes_upload, name="genes_upload"),
    url(r'^create/$', views.genes_list_edit, name="create_genes_list"),
)