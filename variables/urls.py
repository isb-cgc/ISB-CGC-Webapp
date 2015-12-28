from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$',                                  views.variable_fav_list,    name='variables'),
    url(r'^(?P<variable_fav_id>\d+)/$',         views.variable_fav_detail,  name='variable_fav_detail'),
    url(r'^(?P<variable_fav_id>\d+)/delete$',   views.variable_fav_delete,  name='variable_fav_delete'),
    url(r'^(?P<variable_fav_id>\d+)/copy$',     views.variable_fav_copy,    name='variable_fav_copy'),
    url(r'^save$',                              views.variable_fav_save,    name="variable_fav_save"),

    # These urls all route to the same page with slight different representations, a description of the use cases is provided
    # USECASE 1: ADD VAR LIST TO EXISTING WORKBOOK :: called from workbook variable header
    url(r'^select/workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)$', views.variable_select_for_existing_workbook,  name="variable_select_for_existing_workbook"),

    # USECASE 2: CREATE VAR LIST THEN CREATE WORKBOOK WITH VAR LIST :: Called from Man nav
    url(r'^select_create/$', views.variable_select_for_new_workbook, name="select_and_create_workbook"),

    # USECASE 3: EDIT EXISTING VAR LIST :: Called from variable list dropdown
    url(r'^(?P<variable_fav_id>\d+)/edit$', views.variable_fav_edit, name="variable_fav_edit"),

    # USECASE 4: CREATE VAR FAVORITE :: Called from nav or variable list new favorite
    url(r'^create/$', views.variable_fav_create,  name="variable_fav_create")
)