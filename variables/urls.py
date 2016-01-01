from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$',                                  views.variable_fav_list,    name='variables'),
    url(r'^create/$',                           views.variable_fav_edit,    name="variable_fav_create"),
    url(r'^(?P<variable_fav_id>\d+)/$',         views.variable_fav_detail,  name='variable_fav_detail'),
    url(r'^(?P<variable_fav_id>\d+)/edit$',     views.variable_fav_edit,    name='variable_fav_edit'),
    url(r'^(?P<variable_fav_id>\d+)/delete$',   views.variable_fav_delete,  name='variable_fav_delete'),
    url(r'^(?P<variable_fav_id>\d+)/copy$',     views.variable_fav_copy,    name='variable_fav_copy'),
    url(r'^(?P<variable_fav_id>\d+)/update',    views.variable_fav_save,    name='variable_fav_update'),
    url(r'^save$',                              views.variable_fav_save,    name="variable_fav_save"),

    url(r'^workbook/new/$',                                                      views.variable_fav_list_for_new_workbook,   name="variable_select_for_new_workbook"), #was select_and_create_workbook, variable_select_for_new_workbook
    url(r'^workbook/new/variable',                                               views.variable_fav_edit_for_new_workbook,   name="variable_create_for_new_workbook"),
    url(r'^workbook/new/variable/(?P<variable_fav_id>\d+)$',                     views.variable_fav_detail_for_new_workbook, name="variable_detail_for_new_workbook"),
    url(r'^workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)$',                           views.variable_fav_list,   name="variable_select_for_existing_workbook"),
    url(r'^workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)/new$',                       views.variable_fav_edit,   name="variable_create_for_existing_workbook"),
    url(r'^(?P<variable_fav_id>\d+)/workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)$',  views.variable_fav_detail, name="variable_detail_for_existing_workbook"),

    # url(r'^select/workbook/(?P<workbook_id>\d+)/worksheet/(?P<worksheet_id>\d+)$', views.variable_select_for_existing_workbook,  name="variable_select_for_existing_workbook"),
    #
    # # USECASE 2: CREATE VAR LIST THEN CREATE WORKBOOK WITH VAR LIST :: Called from Man nav
    # url(r'^select_create/$', views.variable_select_for_new_workbook, name="select_and_create_workbook"),
    #
    # # USECASE 3: EDIT EXISTING VAR LIST :: Called from variable list dropdown
    # url(r'^(?P<variable_fav_id>\d+)/edit$', views.variable_fav_edit, name="variable_fav_edit"),
    #
    # # USECASE 4: CREATE VAR FAVORITE :: Called from nav or variable list new favorite
    # url(r'^create/$', views.variable_fav_create,  name="variable_fav_create")
)