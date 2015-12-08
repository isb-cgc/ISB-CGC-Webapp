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

from oauth2client.client import SignedJwtAssertionCredentials
import oauth2client.gce as gce_oauth2client
from googleapiclient.discovery import build
from httplib2 import Http
from django.conf import settings


PEM_FILE = settings.PEM_FILE
CLIENT_EMAIL = settings.CLIENT_EMAIL

LOGGING_SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/logging.admin',
    'https://www.googleapis.com/auth/logging.write' # not necessary?
]
# 'https://www.googleapis.com/auth/logging.read'
# 'https://www.googleapis.com/auth/cloud-platform.read-only'


def get_logging_resource():
    """Returns a Cloud Logging service client for calling the API.
    """

    with open(PEM_FILE) as f:
        private_key = f.read()

    credentials = SignedJwtAssertionCredentials(
        CLIENT_EMAIL,
        private_key,
        scope=LOGGING_SCOPES
    )
    # or credentials = gce_oauth2client.AppAssertionCredentials(scope=LOGGING_SCOPES)

    http_auth = credentials.authorize(Http())

    service = build('logging', 'v1beta3', http=http_auth)
    return service, http_auth