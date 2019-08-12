from django.conf.urls import include
from django.contrib import admin
from django.conf.urls import url

urlpatterns = [
    '',
    url(r'^admin/', include(admin.site.urls)),
]
