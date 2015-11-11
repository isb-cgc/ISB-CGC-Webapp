from django.conf.urls import patterns, url

import views

urlpatterns = patterns('',
    url(r'^$', views.workbook_list, name='workbooks'),
    url(r'^(?P<workbook_id>\d+)/$', views.workbook_detail, name='workbook_detail')
)
