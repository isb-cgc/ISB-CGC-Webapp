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

from sys import argv as cmdline_argv
import httplib2
from json import dump as json_dump
from apiclient.discovery import build
from oauth2client.client import GoogleCredentials

from projects import Public_Metadata_Tables

from django.conf import settings

def do_query():
    SCOPES = ['https://www.googleapis.com/auth/bigquery']

    credentials = GoogleCredentials.get_application_default().create_scoped(SCOPES)
    http = httplib2.Http()
    http = credentials.authorize(http)

    bigquery_service = build('bigquery', 'v2', http=http)

    tableCollection = bigquery_service.tables()

    schemas = []

    for tableset in Public_Metadata_Tables.objects.get(program__is_public=1, program__active=1):

        tableReply = tableCollection.get(projectId=settings.BIGQUERY_DATA_PROJECT_ID,
                                        datasetId=tableset.bq_dataset,
                                        tableId=tableset.clin_table).execute()

        schemas.append(tableReply['schema'])

    return schemas

def main():
    out_file_path = cmdline_argv[1]

    schema = do_query()
    with open(out_file_path, 'w') as outfile:
        json_dump(schema, outfile, sort_keys=True, indent=2)

if __name__ == '__main__':
    main()
