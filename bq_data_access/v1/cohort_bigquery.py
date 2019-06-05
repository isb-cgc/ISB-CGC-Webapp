###
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
###

from builtins import object
from copy import deepcopy
import sys
import logging
from django.conf import settings
from google_helpers.bigquery.service import get_bigquery_service

MAX_INSERT = settings.MAX_BQ_INSERT

logger = logging.getLogger('main_logger')

COHORT_DATASETS = {
    'prod': 'cloud_deployment_cohorts',
    'staging': 'cloud_deployment_cohorts',
    'dev': 'dev_deployment_cohorts'
}

COHORT_TABLES = {
    'prod': 'prod_cohorts',
    'staging': 'staging_cohorts'
}

class BigQueryCohortSupport(object):
    cohort_schema = [
        {
            "name": "cohort_id",
            "type": "INTEGER",
            "mode": "REQUIRED"
        },
        {
            "name": "case_barcode",
            "type": "STRING"
        },
        {
            "name": "sample_barcode",
            "type": "STRING"
        },
        {
            "name": "aliquot_barcode",
            "type": "STRING"
        },
        {
            "name": "project_id",
            "type": "INTEGER"
        }
    ]

    patient_type = 'patient'
    sample_type = 'sample'
    aliquot_type = 'aliquot'

    @classmethod
    def get_schema(cls):
        return deepcopy(cls.cohort_schema)

    def __init__(self, project_id, dataset_id, table_id):
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.table_id = table_id

    def _build_request_body_from_rows(self, rows):
        insertable_rows = []
        for row in rows:
            insertable_rows.append({
                'json': row
            })

        return {
            "rows": insertable_rows
        }

    def _streaming_insert(self, rows):
        bigquery_service = get_bigquery_service()
        table_data = bigquery_service.tabledata()

        index = 0
        next = 0

        while index < len(rows) and next is not None:
            next = MAX_INSERT+index
            body = None
            if next > len(rows):
                next = None
                body = self._build_request_body_from_rows(rows[index:])
            else:
                body = self._build_request_body_from_rows(rows[index:next])

            response = table_data.insertAll(projectId=self.project_id,
                                            datasetId=self.dataset_id,
                                            tableId=self.table_id,
                                            body=body).execute()
            index = next

        return response

    def _build_cohort_row(self, cohort_id,
                          case_barcode=None, sample_barcode=None, aliquot_barcode=None, project_id=None):
        return {
            'cohort_id': cohort_id,
            'case_barcode': case_barcode,
            'sample_barcode': sample_barcode,
            'aliquot_barcode': aliquot_barcode,
            'project_id': project_id
        }

    # Create a cohort based on a dictionary of sample, patient/case/participant, and project IDs
    def add_cohort_to_bq(self, cohort_id, samples):
        rows = []
        for sample in samples:
            rows.append(self._build_cohort_row(cohort_id, case_barcode=sample['case_barcode'], sample_barcode=sample['sample_barcode'], project_id=sample['project_id']))

        response = self._streaming_insert(rows)

        return response

    # Create a cohort based only on sample and optionally project IDs (patient/participant/case ID is NOT added)
    def add_cohort_with_sample_barcodes(self, cohort_id, samples):
        rows = []
        for sample in samples:
            # TODO This is REALLY specific to TCGA. This needs to be changed
            # patient_barcode = sample_barcode[:12]
            barcode = sample
            project_id = None
            if isinstance(sample, tuple):
                barcode = sample[0]
                if len(sample) > 1:
                    project_id = sample[1]
            elif isinstance(sample, dict):
                barcode = sample['sample_id']
                if 'project_id' in sample:
                    project_id = sample['project_id']

            rows.append(self._build_cohort_row(cohort_id, sample_barcode=barcode, project_id=project_id))

        response = self._streaming_insert(rows)
        return response
