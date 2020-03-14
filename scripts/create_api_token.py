###
# Copyright 2015-2020, Institute for Systems Biology
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
###

from __future__ import print_function

from builtins import str
from builtins import object
import datetime
import logging
import traceback
import os
from os.path import join, dirname
import re
import csv
from argparse import ArgumentParser
import sys
import time
from copy import deepcopy

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "idc.settings")

import django
django.setup()

from idc import settings
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.core.exceptions import ObjectDoesNotExist

try:
    api_user = User.objects.get(username=settings.API_USER)
except ObjectDoesNotExist:
    print("API user {} not found - creating.".format(settings.API_USER))
    api_user = User.objects.create(username=settings.API_USER)

token = Token.objects.create(user=api_user)

if settings.IS_DEV and settings.DATABASES['default']['HOST'] == 'localhost':
    f = open(join(dirname(__file__), '../{}{}'.format(settings.SECURE_LOCAL_PATH, "dev.api_token.json")), "w")
    f.write(str(token))
    f.close()
else:
    print("{} user token: {}".format(settings.API_USER,str(token)))
