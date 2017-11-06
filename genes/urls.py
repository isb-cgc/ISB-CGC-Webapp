from django.conf.urls import url

import views

urlpatterns = [
    url(r'^$',                                  views.gene_fav_list,        name='genes'),
    url(r'^create/$',                           views.gene_fav_edit,        name="gene_fav_create"),
    url(r'^(?P<gene_fav_id>\d+)/$',             views.gene_fav_detail,      name='gene_fav_detail'),
    url(r'^(?P<gene_fav_id>\d+)/edit',          views.gene_fav_edit,        name="gene_fav_edit"),
    url(r'^(?P<gene_fav_id>\d+)/delete',        views.gene_fav_delete,      name="gene_fav_delete"),
    url(r'^(?P<gene_fav_id>\d+)/update',        views.gene_fav_save,        name="gene_fav_update"),
    url(r'^save/$',                             views.gene_fav_save,        name="gene_fav_save"),

    url(r'^workbook/new/$',                                                      views.gene_fav_list_for_new_workbook,   name="gene_select_for_new_workbook"),
    url(r'^workbook/new/gene$',                                                  views.gene_fav_edit_for_new_workbook,   name="gene_create_for_new_workbook"),
    url(r'^workbook/new/gene/(?P<gene_fav_id>\d+)$',                             views.gene_fav_detail_for_new_workbook, name="gene_detail_for_new_workbook"),
    url(r'^workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)$',      views.gene_fav_list, name="gene_select_for_existing_workbook"),
    url(r'^workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)/new$',  views.gene_fav_edit, name="gene_create_for_existing_workbook"),
    url(r'^(?P<gene_fav_id>\d+)/workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)$',  views.gene_fav_detail,  name="gene_detail_for_existing_workbook"),

    url(r'^is_valid/$',                         views.check_gene_list_validity,     name='is_valid'),
    url(r'^suggest/(?P<string>\S+).json',       views.suggest_gene_symbols,         name='suggest')
]