from django.conf.urls import patterns, url
import views

urlpatterns = patterns('',
    url(r'^get_nih_authorized_list', views.get_nih_authorized_list, name='get_nih_authorized_list'),
    url(r'^check_user_login', views.check_user_login, name='check_user_login'),
    url(r'^check_users_sweeper', views.check_users_sweeper, name='check_users_sweeper'),
    url(r'^CloudSQL_logging', views.CloudSQL_logging, name='CloudSQL_logging')
    )
