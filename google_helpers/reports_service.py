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

from oauth2client.service_account import ServiceAccountCredentials
from googleapiclient import discovery
from django.conf import settings
from httplib2 import Http


GOOGLE_APPLICATION_CREDENTIALS = settings.GOOGLE_APPLICATION_CREDENTIALS

SUPERADMIN_FOR_REPORTS = settings.SUPERADMIN_FOR_REPORTS


def get_reports_resource():

    credentials = ServiceAccountCredentials.from_json_keyfile_name(
        GOOGLE_APPLICATION_CREDENTIALS, 'https://www.googleapis.com/auth/admin.reports.audit.readonly')
    delegated_credentials = credentials.create_delegated(SUPERADMIN_FOR_REPORTS)

    http_auth = delegated_credentials.authorize(Http())

    service = discovery.build('admin', 'reports_v1', http=http_auth)
    return service, http_auth