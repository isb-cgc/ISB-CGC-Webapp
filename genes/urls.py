from __future__ import absolute_import
from django.urls import re_path

from . import views

urlpatterns = [
    re_path(r'^is_valid/$',                         views.check_gene_list_validity,     name='is_valid'),
    re_path(r'^suggest/(?P<string>\S+)',            views.suggest_gene_symbols,         name='suggest')
]