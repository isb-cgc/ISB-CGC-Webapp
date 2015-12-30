from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$',                                  views.gene_fav_list,        name='genes'),
    url(r'^create/$',                           views.gene_fav_edit,        name="gene_fav_create"),
    url(r'^(?P<gene_fav_id>\d+)/$',             views.gene_fav_detail,      name='gene_fav_detail'),
    url(r'^(?P<gene_fav_id>\d+)/edit',          views.gene_fav_edit,        name="gene_fav_edit"),
    url(r'^(?P<gene_fav_id>\d+)/delete',        views.gene_fav_delete,      name="gene_fav_delete"),
    url(r'^(?P<gene_fav_id>\d+)/update',        views.gene_fav_save,        name="gene_fav_update"),
    url(r'^save/$',                             views.gene_fav_save,        name="gene_fav_save"),

    # USECASE 1: ADD VAR LIST TO EXISTING WORKBOOK :: called from workbook variable header
    url(r'^select/workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)$', views.gene_select_for_existing_workbook,  name="gene_select_for_existing_workbook"),
    url(r'^select_create/$', views.gene_select_for_new_workbook, name="gene_select_and_create_workbook")
)