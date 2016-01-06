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

from oauth2client.client import GoogleCredentials
from googleapiclient import discovery
from django.conf import settings
import httplib2

STORAGE_SCOPES = [
    'https://www.googleapis.com/auth/devstorage.read_only',
    'https://www.googleapis.com/auth/devstorage.read_write',
    'https://www.googleapis.com/auth/devstorage.full_control'
]


def get_storage_resource(perms=None):
    # credentials = GoogleCredentials.get_application_default()
    # todo: if perms == 'r', STORAGE_SCOPES[:1]
    # if perms == 'rw', STORAGE_SCOPES[:2]
    #
    credentials = GoogleCredentials.from_stream(settings.GOOGLE_APPLICATION_CREDENTIALS)\
        .create_scoped(STORAGE_SCOPES)
    # http = httplib2.Http()
    # http = credentials.authorize(http)
    # print credentials.to_json()
    # return discovery.build('storage', 'v1', http=http)
    return discovery.build('storage', 'v1', credentials=credentials)

def get_special_storage_resource():

    credentials = GoogleCredentials.from_stream(
        settings.GOOGLE_APPLICATION_CREDENTIALS).create_scoped(STORAGE_SCOPES)
    return discovery.build('storage', 'v1', credentials=credentials)
