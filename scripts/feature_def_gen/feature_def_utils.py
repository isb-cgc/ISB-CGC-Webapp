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

from builtins import str
from builtins import object
from csv import DictWriter
from json import load as load_json
import logging
from time import sleep
from uuid import uuid4
from sys import stdout



logger = logging.getLogger('main_logger')
logger.setLevel(logging.DEBUG)
_ch = logging.StreamHandler(stream=stdout)
logger.addHandler(_ch)


class DataSetConfig(object):
    def __init__(self, project_name, dataset_name):
        self.project_name = project_name
        self.dataset_name = dataset_name

    @classmethod
    def from_dict(cls, param):
        return cls(param['project_name'], param['dataset_name'])


def load_config_json(config_json_path, config_class):
    result = load_json(open(config_json_path, 'r'))
    return config_class.from_dict(result)


def build_bigquery_service():
    import httplib2
    from apiclient.discovery import build
    from oauth2client.client import GoogleCredentials

    SCOPES = ['https://www.googleapis.com/auth/bigquery']

    credentials = GoogleCredentials.get_application_default().create_scoped(SCOPES)
    http = httplib2.Http()
    http = credentials.authorize(http)

    bigquery_service = build('bigquery', 'v2', http=http)
    return bigquery_service


def submit_query_async(bigquery, project_id, query, batch=False, num_retries=5):
    job_data = {
        'jobReference': {
            'projectId': project_id,
            'job_id': str(uuid4())
        },
        'configuration': {
            'query': {
                'query': query,
                'priority': 'BATCH' if batch else 'INTERACTIVE'
            }
        }
    }

    return bigquery.jobs().insert(
        projectId=project_id,
        body=job_data).execute(num_retries=num_retries)


def poll_async_job(bigquery_service, config, job_id, poll_interval=5):
    job_collection = bigquery_service.jobs()

    poll = True

    while poll:
        sleep(poll_interval)
        logger.debug("Polling...")
        job = job_collection.get(projectId=config.project_id,
                                 jobId=job_id).execute()

        if job['status']['state'] == 'DONE':
            logger.debug('Job state = \'DONE\'')
            poll = False


        if 'errorResult' in job['status']:
            raise Exception(job['status'])


def download_query_result(bigquery, query_job):
    result = []
    page_token = None
    total_rows = 0

    while True:
        page = bigquery.jobs().getQueryResults(
            pageToken=page_token,
            **query_job['jobReference']).execute(num_retries=2)

        rows = page['rows']
        result.extend(rows)

        total_rows += len(rows)
        logger.info(total_rows)

        page_token = page.get('pageToken')
        if not page_token:
            break

    return result


def write_tsv(out_file_path, data, fieldnames):
    logger.debug("Writing result to \'" + out_file_path + "\'")

    with open(out_file_path, 'w') as fd:
        writer = DictWriter(fd, fieldnames=fieldnames)
        writer.writeheader()

        for row in data:
            writer.writerow(row)


