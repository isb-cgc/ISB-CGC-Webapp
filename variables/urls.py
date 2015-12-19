from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$',                                  views.variable_fav_list,    name='variables'),
    url(r'^(?P<variable_fav_id>\d+)/$',         views.variable_fav_detail,  name='variable_fav_detail'),
    url(r'^(?P<variable_fav_id>\d+)/edit$',     views.variable_fav_edit,    name="variable_fav_edit"),
    url(r'^(?P<variable_fav_id>\d+)/delete$',   views.variable_delete,      name='workbook_delete'),
    url(r'^(?P<variable_fav_id>\d+)/share$',    views.variable_share,       name='workbook_share'),
    url(r'^(?P<variable_fav_id>\d+)/copy$',     views.variable_copy,        name='workbook_copy'),
    url(r'^create/$',                           views.variable_fav_create,  name="variable_fav_create"),
    url(r'^save$',                              views.variable_save,        name="variable_fav_save")
)