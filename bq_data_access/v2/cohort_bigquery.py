"""

Copyright 2017, Institute for Systems Biology

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
import sys
import logging
import datetime
from django.conf import settings
from google_helpers.bigquery_service import get_bigquery_service

logger = logging.getLogger('main_logger')

MAX_INSERT = settings.MAX_BQ_INSERT

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

    cohort_export_schema = {
        'fields': [
            {
                'name': 'cohort_id',
                'type': 'INTEGER'
            },{
                "name": "case_barcode",
                "type": "STRING"
            },{
                "name": "sample_barcode",
                "type": "STRING"
            },{
                "name": "project_short_name",
                "type": "STRING"
            },{
                "name": "date_added",
                "type": "TIMESTAMP"
            }
        ]
    }

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

    # Get all the tables for this BigQueryCohortSupport object's project ID
    def get_tables(self):
        bq_tables = []
        bigquery_service = get_bigquery_service()
        datasets = bigquery_service.datasets().list(projectId=self.project_id).execute()

        for dataset in datasets['datasets']:
            tables = bigquery_service.tables().list(projectId=self.project_id,datasetId=dataset['datasetReference']['datasetId']).execute()
            if 'tables' not in tables:
                continue
            for table in tables['tables']:
                bq_tables.append({'dataset': dataset['datasetReference']['datasetId'], 'table_id':  table['tableReference']['tableId']})

        return bq_tables

    # Check if the dataset referenced by dataset_id exists in the project referenced by project_id
    def _dataset_exists(self):
        bigquery_service = get_bigquery_service()
        datasets = bigquery_service.datasets().list(projectId=self.project_id).execute()
        dataset_found = False

        for dataset in datasets['datasets']:
            if self.dataset_id == dataset['datasetReference']['datasetId']:
                return True

        return dataset_found

    def _insert_dataset(self):
        response = {}

        return response

    # Compare the schema of the table referenced in table_id with the cohort-export table schema
    # Note this only confirms that fields required by cohort_export_schema are found in the proposed table
    # with the appropriate type, and that no 'required' fields in the proposed table are absent from cohort_export_schema
    def _confirm_table_schema(self):
        bigquery_service = get_bigquery_service()
        table = bigquery_service.tables().get(projectId=self.project_id, datasetId=self.dataset_id,tableId=self.table_id).execute()
        table_fields = table['schema']['fields']

        proposed_schema = {x['name']: x['type'] for x in table_fields}
        expected_schema = {x['name']: x['type'] for x in self.cohort_export_schema['fields']}

        # Check for expected fields
        for field in self.cohort_export_schema['fields']:
            if field['name'] not in proposed_schema or proposed_schema[field['name']] != field['type']:
                return False

        # Check for unexpected, required fields
        for field in table_fields:
            if 'mode' in field and field['mode'] == 'REQUIRED' and field['name'] not in expected_schema:
                return False

        return True

    # Check if the table referened by table_id exists in the dataset referenced by dataset_id and the project referenced by project_id
    def _table_exists(self):
        bigquery_service = get_bigquery_service()
        tables = bigquery_service.tables().list(projectId=self.project_id,datasetId=self.dataset_id).execute()
        table_found = False

        for table in tables['tables']:
            if self.table_id == table['tableReference']['tableId']:
                return True

        return table_found

    # Insert a cohort-export table, optionally providing a list of cohort IDs to include in the description
    def _insert_table(self,cohorts):
        bigquery_service = get_bigquery_service()
        tables = bigquery_service.tables()

        desc = "BQ Export table from ISB-CGC"
        if len(cohorts):
            desc += ", cohort ID{} {}".format(("s" if len(cohorts) > 1 else ""), ", ".join([str(x) for x in cohorts]))

        response = tables.insert(projectId=self.project_id, datasetId=self.dataset_id, body={
            'friendlyName': self.table_id,
            'description': desc,
            'kind': 'bigquery#table',
            'schema': self.cohort_export_schema,
            'tableReference': {
                'datasetId': self.dataset_id,
                'projectId': self.project_id,
                'tableId': self.table_id
            }
        }).execute()

        return response

    # Export a cohort or cohorts as represented by a set of samples into the BQ table referenced by project_id:dataset_id:table_id
    def export_cohort_to_bq(self, samples):

        # Get the dataset (make if not exists)
        if not self._dataset_exists():
            self._insert_dataset()

        # Get the table (make if not exists)
        if not self._table_exists():
            table_result = self._insert_table(samples.values_list('cohort_id',flat=True).distinct())
            if 'tableReference' not in table_result:
                return {
                    'tableErrors': "Unable to create table {} in project {} and dataset {} - please double-check your project's permissions for the ISB-CGC service account.".format(
                        self.table_id,self.project_id,self.dataset_id)
                }
        elif not self._confirm_table_schema():
            return {
                'tableErrors': "The table schema of {} does not match the required schema for cohort export. Please make a new table, or adjust this table's schema.".format(self.table_id)
            }

        rows = []
        date_added = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for sample in samples:
            rows.append({
                'cohort_id': sample.cohort.id,
                'sample_barcode': sample.sample_barcode,
                'case_barcode': sample.case_barcode,
                'project_short_name': sample.project.program.name + '-' + sample.project.name,
                'date_added': date_added
            })

        response = self._streaming_insert(rows)

        return response

