from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$', views.workbook_list, name='workbooks'),
    url(r'^samples$', views.workbook_samples, name='workbook_samples'),

    url(r'^create$',                        views.workbook, name='workbook_create'),
    url(r'^(?P<workbook_id>\d+)/$',         views.workbook, name='workbook_detail'),
    url(r'^(?P<workbook_id>\d+)/edit$',     views.workbook, name='workbook_edit'),
    url(r'^(?P<workbook_id>\d+)/delete$',   views.workbook, name='workbook_delete'),
    url(r'^(?P<workbook_id>\d+)/share$',    views.workbook_share, name='workbook_share'),
    url(r'^(?P<workbook_id>\d+)/copy$',     views.workbook, name='workbook_copy'),

    url(r'^create_with_program$', views.workbook_create_with_program, name='worksheet_create_with_programs'),
    url(r'^create_with_genes$',             views.workbook_create_with_genes,       name='worksheet_create_with_genes'),
    url(r'^create_with_variables$',         views.workbook_create_with_variables,   name='worksheet_create_with_variables'),
    url(r'^create_with_cohort$',            views.workbook_create_with_cohort,      name='worksheet_create_with_cohort'),
    url(r'^create_with_cohort_list$',       views.workbook_create_with_cohort_list, name='worksheet_create_with_cohort_list'),
    url(r'^create_with_analysis$',          views.workbook_create_with_analysis,    name='worksheet_create_with_analysis'),

    url(r'^(?P<workbook_id>\d+)/worksheets/create$',                        views.worksheet, name='worksheet_create'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/$',        views.worksheet_display, name='worksheet_display'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/copy$',    views.worksheet, name='worksheet_copy'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/delete$',  views.worksheet, name='worksheet_delete'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/edit$',    views.worksheet, name='worksheet_edit'),

    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/variables/edit$',                         views.worksheet_variables, name='worksheet_variables_edit'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/variables/(?P<variable_id>\d+)/delete$',  views.worksheet_variable_delete, name='worksheet_variables_delete'),

    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/genes/edit$',                          views.worksheet_genes, name='worksheet_genes_edit'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/genes/(?P<gene_id>\d+)/delete$',       views.worksheet_gene_delete, name='worksheet_gene_delete'),

    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/cohorts/edit$',                        views.worksheet_cohorts, name='worksheet_cohorts_edit'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/cohorts/(?P<cohorts_id>\d+)/delete$',  views.worksheet_cohorts, name='worksheet_cohorts_delete'),

    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/plots/$',                              views.worksheet_plots, name='worksheet_plot_get'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/plots/(?P<plot_id>\d+)/edit$',         views.worksheet_plots, name='worksheet_plot_edit'),

    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/comments/create$',                     views.worksheet_comment, name='worksheet_comment_create'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/comments/(?P<comment_id>\d+)/edit$',   views.worksheet_comment, name='worksheet_comment_edit'),
    url(r'^(?P<workbook_id>\d+)/worksheets/(?P<worksheet_id>\d+)/comments/(?P<comment_id>\d+)/delete$', views.worksheet_comment, name='worksheet_comment_delete')
]
