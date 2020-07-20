from django.urls import path

from . import views

urlpatterns = [
    path('', views.compare_command, name='index'),
]