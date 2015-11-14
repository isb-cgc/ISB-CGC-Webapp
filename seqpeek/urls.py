from django.conf.urls import patterns, url
import views

urlpatterns = patterns('',
    url(r'^$', views.seqpeek, name='seqpeek'),
    url(r'^(?P<id>\d+)/', views.seqpeek, name='seqpeek'),
    url(r'^save$', views.save_seqpeek, name='save_seqpeek')
)