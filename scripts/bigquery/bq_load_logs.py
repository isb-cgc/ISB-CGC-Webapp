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
from __future__ import print_function

# Python example modified from https://cloud.google.com/bigquery/loading-data-into-bigquery
from future import standard_library
standard_library.install_aliases()
from builtins import str
from urllib.error import HTTPError
import pprint
import json
import uuid

from googleapiclient.discovery import build
import httplib2
from oauth2client.client import flow_from_clientsecrets
from oauth2client.file import Storage
from oauth2client import tools
from django.conf import settings
import os


def get_service_from_credentials():
    client_secrets_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'client_secrets.json')
    flow = flow_from_clientsecrets(client_secrets_path,
                                   scope='https://www.googleapis.com/auth/bigquery')

    storage = Storage('bigquery_credentials.dat')
    credentials = storage.get()

    if credentials is None or credentials.invalid:
        credentials = tools.run_flow(flow, storage, tools.argparser.parse_args([]))

    http = httplib2.Http()
    http = credentials.authorize(http)

    service = build('bigquery', 'v2', http=http)

    return service, http


def get_logs(service):
    try:
        jobCollection = service.jobs()

        list_response = jobCollection.list(projectId=settings.BIGQUERY_PROJECT_ID,
                                           allUsers=True,
                                           projection='full',
                                           maxResults=200).execute()
        return list_response

    except HTTPError as err:
        print('Error in get_logs: ', pprint.pprint(err.resp))  # or err.reason?
        return None


def stream_row_to_bigquery(service,
                           project_id,
                           dataset_id,
                           table_id,
                           row,
                           num_retries=5):
    # Generate a unique row id so retries
    # don't accidentally duplicate insert
    insert_all_data = {
            'insertId': str(uuid.uuid4()),
            'rows': [{'json': row}]
            }
    return service.tabledata().insertAll(
            projectId=project_id,
            datasetId=dataset_id,
            tableId=table_id,
            body=insert_all_data).execute(num_retries=num_retries)


def main():

    service, http = get_service_from_credentials()
    data = get_logs(service)
    with open('file.json', 'w+') as f:
        for row in data['jobs']:
            f.write('\t' + json.dumps(row) + '\n')
    f.close()
    for row in data['jobs']:
        response = stream_row_to_bigquery(service,
                                          settings.BIGQUERY_PROJECT_ID,
                                          'isb_cgc_logs',
                                          'bq_log_table',
                                          row,
                                          5)
        print(response)

if __name__ == '__main__':
    main()



