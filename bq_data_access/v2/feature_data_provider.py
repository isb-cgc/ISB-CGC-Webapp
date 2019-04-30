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
import logging
import sys
from uuid import uuid4
from time import sleep

from bq_data_access.v2.utils import DurationLogged

logger = logging.getLogger('main_logger')


class FeatureDataProvider(object):
    """
    Class for building data access modules for different datatypes.

    TODO: Document interface
    """
    def __init__(self, feature_query_support, bigquery_service=None, project_id_number=None):
        self.feature_query_support = feature_query_support
        self.job_reference = None
        self.bigquery_service = bigquery_service
        self.project_id = project_id_number

    def get_bq_service(self):
        return self.bigquery_service

    @DurationLogged('FEATURE', 'BQ_SUBMIT')
    def submit_bigquery_job(self, bigquery, query_body, batch=False):
        job_data = {
            'jobReference': {
                'projectId': self.project_id,
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
                projectId=self.project_id,
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

        result = self.feature_query_support.unpack_query_response(query_result_array)
        return result

    def submit_query_and_get_job_ref(self, program_set, cohort_table, cohort_id_array, project_id_array):
        bigquery_client = self.get_bq_service()

        query_body, tables_used, run_query = self.feature_query_support.build_query(program_set, cohort_table, cohort_id_array, project_id_array)
        if not run_query:
            logger.info("Not submitting BigQuery job - returning empty result.")
            return {
                "job_reference": None,
                "run_query": False,
                "tables_used": []
            }

        logger.info(query_body)
        query_job = self.submit_bigquery_job(bigquery_client, query_body)

        # Poll for completion of the query
        self.job_reference = query_job['jobReference']
        job_id = query_job['jobReference']['jobId']
        logger.debug("JOBID {id}".format(id=job_id))

        return {
            "job_reference": self.job_reference,
            "run_query": True,
            "tables_used": list(set(tables_used))
        }

    def get_data_job_reference(self, program_set, cohort_table, cohort_id_array, project_id_array):
        result = self.submit_query_and_get_job_ref(program_set, cohort_table, cohort_id_array, project_id_array)

        return result

    @classmethod
    def build_from_django_settings(cls, **kwargs):
        # TODO implement
        from django.conf import settings as django_settings
        project_id = django_settings.BIGQUERY_PROJECT_ID
        return cls(project_id=project_id, **kwargs)
