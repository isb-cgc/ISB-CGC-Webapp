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

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "isb_cgc.settings")

import django
django.setup()

from isb_cgc import settings
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from django.core.exceptions import ObjectDoesNotExist

try:
    cron_user = User.objects.get(username=settings.CRON_USER)
except ObjectDoesNotExist:
    print("Cron user {} not found - creating.".format(settings.CRON_USER))
    cron_user = User.objects.create(username=settings.CRON_USER)

token = Token.objects.create(user=cron_user)

if settings.IS_DEV and settings.CONNECTION_IS_LOCAL:
    f = open(join(dirname(__file__), '../{}{}'.format(settings.SECURE_LOCAL_PATH, "dev.cron_token.json")), "w")
    f.write(str(token))
    f.close()
else:
    print("{} user token: {}".format(settings.CRON_USER,str(token)))
