"""

Copyright 2015, Institute for Systems Biology

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

from django.conf.urls import patterns, url
import views

urlpatterns = patterns('',
    url(r'^get_nih_authorized_list', views.get_nih_authorized_list, name='get_nih_authorized_list'),
    url(r'^check_user_login', views.check_user_login, name='check_user_login'),
    url(r'^check_users_sweeper', views.check_users_sweeper, name='check_users_sweeper'),
    url(r'^CloudSQL_logging', views.CloudSQL_logging, name='CloudSQL_logging'),
    url(r'^IAM_logging', views.IAM_logging, name='IAM_logging'),
    url(r'^remove_user_from_ACL/(?P<nih_username>\w+)/$', views.remove_user_from_ACL, name="remove_user_from_ACL"),
    url(r'^create_and_log_reports', views.create_and_log_reports, name="create_and_log_reports"),
    url(r'^log_acls', views.log_acls, name="log_acls"),
    url(r'load_billing_to_bigquery', views.load_billing_to_bigquery)
    )
