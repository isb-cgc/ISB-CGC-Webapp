from django.conf.urls import patterns, url
import views

urlpatterns = patterns('',
    url(r'^$', views.cohorts_list, name='cohort_list'),
    url(r'^new_cohort/', views.cohort_detail, name='cohort'),
    url(r'^(?P<cohort_id>\d+)/$', views.cohort_detail, name='cohort_details'),
    url(r'^filelist/(?P<cohort_id>\d+)/$', views.cohort_filelist, name='cohort_filelist'),
    url(r'^save_cohort/', views.save_cohort, name='save_cohort'),
    url(r'^save_cohort_from_plot/', views.save_cohort_from_plot, name='save_cohort_from_plot'),
    url(r'^delete_cohort/', views.delete_cohort, name='delete_cohort'),
    url(r'^clone_cohort/(?P<cohort_id>\d+)/', views.clone_cohort, name='clone_cohort'),
    url(r'^share_cohort/$', views.share_cohort, name='share_cohorts'),
    url(r'^share_cohort/(?P<cohort_id>\d+)/', views.share_cohort, name='share_cohort'),
    url(r'^set_operation/', views.set_operation, name='set_operation'),
    url(r'^save_cohort_comment/', views.save_comment, name='save_cohort_comment'),
    url(r'^download_filelist/(?P<cohort_id>\d+)/', views.streaming_csv_view, name='download_filelist')
)
