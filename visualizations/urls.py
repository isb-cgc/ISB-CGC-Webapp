from django.conf.urls import patterns, url

import views


urlpatterns = patterns('',
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
    url(r'^save_comment/$', views.save_comment, name='save_comment')
)