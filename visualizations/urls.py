"""

Copyright 2017, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

from django.conf.urls import url

import views, feature_access_views, feature_access_views_v2, data_access_views, data_access_views_v2

import seqpeek_data_views_v1
import seqpeek_data_views_v2
import oncoprint_data_views_v2
import oncogrid_data_views_v2


urlpatterns = [
    url(r'^saveviz$', views.save_viz, name='saveviz'),
    url(r'^deleteviz$', views.delete_viz, name='deleteviz'),
    url(r'^share_viz/$', views.share_viz, name='share_viz'),
    url(r'^share_viz/(?P<id>\d+)/$', views.share_viz, name='share_viz_id'),
    url(r'^clone_viz/(?P<id>\d+)/$', views.clone_viz, name='clone_viz_id'),
    url(r'^add_plot/', views.add_plot, name='add_plot'),
    url(r'^delete_plot/', views.delete_plot, name='delete_plot'),
    url(r'^genericplot/$', views.genericplot, name='genericplot'),
    url(r'^genericplot/(?P<id>\d+)/$', views.genericplot, name='genericplot_id'),
    url(r'^stackviz/$', views.stackviz, name='stackviz'),
    url(r'^stackviz/(?P<id>\d+)/$', views.stackviz, name='stackviz_id'),
    url(r'^circviz/$', views.circviz, name='circviz'),
    url(r'^circviz/(?P<id>\d+)/$', views.circviz, name='circviz_id'),
    url(r'^save_comment/$', views.save_comment, name='save_comment'),

    # Feature access views
    url(r'^feature_search/v1', feature_access_views.feature_search, name='feature_search'),
    url(r'^feature_search/v2', feature_access_views_v2.feature_search, name='feature_search'),
    url(r'^feature_field_search', feature_access_views_v2.feature_field_search, name='feature_field_search'),

    # Clinical data column search
    url(r'^clinical_feature_get/v2', feature_access_views_v2.clinical_feature_get, name='clinical_feature_get'),

    # Feature data access views
    url(r'^feature_data_plot/v1', data_access_views.data_access_for_plot, name='feature_data_plot'),
    url(r'^feature_data_plot/v2', data_access_views_v2.data_access_for_plot, name='feature_data_plot_v2'),

    # SeqPeek data access views
    url(r'^seqpeek_data_plot/v1', seqpeek_data_views_v1.seqpeek_view_data, name='seqpeek_data_plot_v1'),
    url(r'^seqpeek_data_plot/v2', seqpeek_data_views_v2.seqpeek_view_data, name='seqpeek_data_plot_v2'),

    # OncoPrint data access views
    url(r'^oncoprint_data_plot/v2', oncoprint_data_views_v2.oncoprint_view_data, name='oncoprint_data_plot_v2'),

    # OncoGrid data access views
    url(r'^oncogrid_data_plot/v2', oncogrid_data_views_v2.oncogrid_view_data, name='oncogrid_data_plot_v2'),

]
