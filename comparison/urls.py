# from __future__ import absolute_import
# from django.conf.urls import url
# #from django.conf.urls import path, re_path
# from . import views
#
# urlpatterns = [
#     url(r'^$',views.cohorts_compare_list, name='cohorts_compare_list')]
from __future__ import absolute_import

from django.conf.urls import include, url
#from django.urls import path
from django.contrib import admin
#from django.conf import settings
#from django.views.generic.base import TemplateView

from . import views

admin.autodiscover()

urlpatterns = [
    #url(r'^', include('cohorts.urls')),
    #url(r'^(?P<cohort_id_1>\d+)/(?P<cohort_id_2>\d+)/$', views.compare_cohorts, name='compare')
    #url(r'^cohorts/$', views.compare_cohorts, name='compare')
    url(r'^cohorts/(?P<cohort_id_1>\d+)/(?P<cohort_id_2>\d+)/$', views.compare_cohorts, name='compare'),
    url(r'^validate_cohorts$', views.compare_validate_cohorts, name='compare_validate_cohorts')
]