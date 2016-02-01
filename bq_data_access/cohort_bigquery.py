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

from copy import deepcopy

from api.api_helpers import authorize_credentials_with_Google

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
            "name": "patient_barcode",
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
            "name": "study_id",
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
        bigquery_service = authorize_credentials_with_Google()
        table_data = bigquery_service.tabledata()

        body = self._build_request_body_from_rows(rows)

        response = table_data.insertAll(projectId=self.project_id,
                                        datasetId=self.dataset_id,
                                        tableId=self.table_id,
                                        body=body).execute()

        return response

    def _build_cohort_row(self, cohort_id,
                          patient_barcode=None, sample_barcode=None, aliquot_barcode=None, study_id=None):
        return {
            'cohort_id': cohort_id,
            'patient_barcode': patient_barcode,
            'sample_barcode': sample_barcode,
            'aliquot_barcode': aliquot_barcode,
            'study_id': study_id
        }

    def add_cohort_with_sample_barcodes(self, cohort_id, samples):
        rows = []
        for sample in samples:
            # TODO This is REALLY specific to TCGA. This needs to be changed
            # patient_barcode = sample_barcode[:12]
            barcode = sample
            study_id = None
            if isinstance(sample, tuple):
                barcode = sample[0]
                if len(sample) > 1:
                    study_id = sample[1]
            elif isinstance(sample, dict):
                barcode = sample['sample_id']
                if 'study_id' in sample:
                    study_id = sample['study_id']

            rows.append(self._build_cohort_row(cohort_id, sample_barcode=barcode, study_id=study_id))

        response = self._streaming_insert(rows)
        return response
