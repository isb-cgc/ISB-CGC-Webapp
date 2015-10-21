from django.conf.urls import patterns, url, include
from allauth.socialaccount.providers.google import urls as google_urls, views as google_views

from . import views


urlpatterns = patterns('',
    url(r'^', include(google_urls)),
    # url(r'^logout', account_views.logout, name='account_logout'),
    url(r'^logout', views.extended_logout_view, name='account_logout'),
    url(r'^login/$', google_views.oauth2_login, name='account_login'),
    url(r'^nih_login/$', views.nih_login, name='nih_login'),
    url(r'^unlink_accounts/', views.unlink_accounts, name='unlink_accounts')
)

