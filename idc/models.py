#
# Copyright 2015-2021, Institute for Systems Biology
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

from django.db import models
from django.contrib.auth.models import User

import logging

logger = logging.getLogger(__name__)


class AppInfo(models.Model):
    id = models.AutoField(primary_key=True, null=False, blank=False)
    app_version = models.CharField(max_length=32, null=False, blank=False, default="1.0.0")
    app_name = models.CharField(max_length=128, null=False, blank=True)
    app_date = models.DateField(auto_now_add=True, null=False, blank=False)
    active = models.BooleanField(default=True, null=False, blank=False)


class User_Data(models.Model):
    id = models.AutoField(primary_key=True, null=False, blank=False)
    user = models.ForeignKey(User, null=False, blank=True, on_delete=models.CASCADE)
    history = models.CharField(max_length=2000, blank=False, null=False, default='')

