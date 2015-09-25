from django.conf.urls import patterns, url, include
from allauth.account import views as account_views
from allauth import urls as allauth_urls
from allauth.socialaccount.providers.google import urls as google_urls, views as google_views
from . import views
# from django.contrib.auth import l

urlpatterns = patterns('',
    url(r'^', include(google_urls)),
    # url(r'^logout', account_views.logout, name='account_logout'),
    url(r'^logout', views.extended_logout_view, name='account_logout'),
    url(r'^login', google_views.oauth2_login, name='account_login')
)

