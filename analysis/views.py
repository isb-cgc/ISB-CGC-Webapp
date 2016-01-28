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

import logging
import json
import collections
import io
import time
import os
import sys
from datetime import datetime

from oauth2client.client import GoogleCredentials
from google.appengine.api import modules, urlfetch
from google.appengine.ext import deferred
from googleapiclient import discovery, http
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import HttpResponse
from django.db.models import Count
from django.utils import formats
from django.contrib import messages
from django.contrib.auth.models import User
from django.conf import settings

debug = settings.DEBUG
from google_helpers.genomics_service import get_genomics_resource
from google_helpers.directory_service import get_directory_resource
from googleapiclient.errors import HttpError
from visualizations.models import SavedViz, Viz_Perms
from cohorts.models import Cohort, Cohort_Perms
from projects.models import Project
from workbooks.models import Workbook
from accounts.models import NIH_User
from models import Analysis

from allauth.socialaccount.models import SocialAccount
from django.core.exceptions import MultipleObjectsReturned, ObjectDoesNotExist

debug = settings.DEBUG

@login_required
def sample_analyses(request):
    types = Analysis.get_types()
    return render(request, 'analysis/sample_analyses.html', {'types' : types})
