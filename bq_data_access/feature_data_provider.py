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
from uuid import uuid4
from time import sleep

from django.conf import settings
from api.api_helpers import authorize_credentials_with_Google
from bq_data_access.utils import DurationLogged


class FeatureDataProvider(object):
    """
    Class for building data access modules for different datatypes.

    TODO: Document interface
    """
    def __init__(self, bigquery_service=None):
        self.job_reference = None
        self.bigquery_service = bigquery_service

    def get_bq_service(self):
        if self.bigquery_service is None:
            self.bigquery_service = authorize_credentials_with_Google()

        return self.bigquery_service

    @DurationLogged('FEATURE', 'BQ_SUBMIT')
    def submit_bigquery_job(self, bigquery, project_id, query_body, batch=False):
        job_data = {
            'jobReference': {
                'projectId': project_id,
                'job_id': str(uuid4())
            },
            'configuration': {
                'query': {
                    'query': query_body,
                    'priority': 'BATCH' if batch else 'INTERACTIVE'
                }
            }
        }

        return bigquery.jobs().insert(
                projectId=project_id,
                body=job_data).execute(num_retries=5)

    @DurationLogged('FEATURE', 'BQ_POLL')
    def poll_async_job(self, bigquery_service, project_id, job_id, poll_interval=5):
        job_collection = bigquery_service.jobs()

        poll = True

        while poll:
            sleep(poll_interval)
            job = job_collection.get(projectId=project_id,
                                     jobId=job_id).execute()

            if job['status']['state'] == 'DONE':
                poll = False

            if 'errorResult' in job['status']:
                raise Exception(job['status'])

    @DurationLogged('FEATURE', 'BQ_FETCH')
    def download_query_result(self, bigquery, job_reference):
        result = []
        page_token = None
        total_rows = 0

        while True:
            page = bigquery.jobs().getQueryResults(
                    pageToken=page_token,
                    **job_reference).execute(num_retries=2)

            if int(page['totalRows']) == 0:
                break

            rows = page['rows']
            result.extend(rows)
            total_rows += len(rows)

            page_token = page.get('pageToken')
            if not page_token:
                break

        return result

    def is_bigquery_job_finished(self, project_id):
        job_collection = self.get_bq_service().jobs()
        bigquery_job_id = self.job_reference['jobId']

        job = job_collection.get(projectId=project_id,
                                 jobId=bigquery_job_id).execute()

        return job['status']['state'] == 'DONE'

    def download_and_unpack_query_result(self):
        bigquery_service = self.get_bq_service()
        query_result_array = self.download_query_result(bigquery_service, self.job_reference)

        result = self.unpack_query_response(query_result_array)
        return result

    def submit_query_and_get_job_ref(self, project_id, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        bigquery_service = self.get_bq_service()

        query_body = self.build_query(project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array)
        query_job = self.submit_bigquery_job(bigquery_service, project_id, query_body)

        # Poll for completion of the query
        self.job_reference = query_job['jobReference']
        job_id = query_job['jobReference']['jobId']
        logging.debug("JOBID {id}".format(id=job_id))

        return self.job_reference

    def get_data_job_reference(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET

        result = self.submit_query_and_get_job_ref(project_id, project_name, dataset_name, self.table_name,
                                                   self.feature_def, cohort_dataset, cohort_table, cohort_id_array)
        return result

