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

from sys import argv as cmdline_argv
import httplib2
from json import dump as json_dump
from apiclient.discovery import build
from oauth2client.client import GoogleCredentials

from GenespotRE.settings import BIGQUERY_DATASET2 as DATASET

CLINICAL_TABLE_ID = "Clinical"

def do_query(project_id, table_name):
    SCOPES = ['https://www.googleapis.com/auth/bigquery']

    credentials = GoogleCredentials.get_application_default().create_scoped(SCOPES)
    http = httplib2.Http()
    http = credentials.authorize(http)

    bigquery_service = build('bigquery', 'v2', http=http)

    tableCollection = bigquery_service.tables()
    tableReply = tableCollection.get(projectId=project_id,
                                    datasetId=DATASET,
                                    tableId=table_name).execute()
    schema = tableReply['schema']
    return schema

def main():
    project_id = cmdline_argv[1]
    out_file_path = cmdline_argv[2]

    schema = do_query(project_id, CLINICAL_TABLE_ID)
    with open(out_file_path, 'w') as outfile:
        json_dump(schema, outfile, sort_keys=True, indent=2)

if __name__ == '__main__':
    main()
