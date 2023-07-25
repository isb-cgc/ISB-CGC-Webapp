from __future__ import absolute_import
from django.conf.urls import url

from . import views

urlpatterns = [
    url(r'^$',                                  views.gene_fav_list,        name='genes'),
    url(r'^is_valid/$',                         views.check_gene_list_validity,     name='is_valid'),
    url(r'^suggest/(?P<string>\S+)',            views.suggest_gene_symbols,         name='suggest')
]