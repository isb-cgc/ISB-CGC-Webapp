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

from django.db import models
from django.contrib.auth.models import User
from django.contrib import admin


class NIH_User(models.Model):
    user = models.ForeignKey(User, null=False)
    NIH_username = models.TextField(null=True)
    NIH_assertion = models.TextField(null=True)
    NIH_assertion_expiration = models.DateTimeField(null=True)
    dbGaP_authorized = models.BooleanField(default=False)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "NIH User"
        verbose_name_plural = "NIH Users"

    def get_google_email(self):
        return User.objects.get(pk=self.user_id).email


class Bucket(models.Model):
    user = models.ForeignKey(User, null=False)
    bucket_name = models.CharField(null=True,max_length=155)
    bucket_permissions = models.TextField(null=True)

    def __str__(self):
        return self.bucket_name

class GoogleProject(models.Model):
    user = models.OneToOneField(User, null=False)
    project_name = models.CharField(max_length=150)
    project_id = models.CharField(max_length=150)
    big_query_dataset = models.CharField(max_length=150,null=True)

    def __str__(self):
        return self.project_name