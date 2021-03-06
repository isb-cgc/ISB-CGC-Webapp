#
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
from __future__ import absolute_import

from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^$', views.seqpeek, name='seqpeek'),
    url(r'^(?P<id>\d+)/', views.seqpeek, name='seqpeek'),
    url(r'^save$', views.save_seqpeek, name='save_seqpeek')
]
