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

from builtins import object
from argparse import ArgumentParser
from copy import deepcopy
from httplib2 import Http

COHORT_DATASETS = {
    'prod': 'cloud_deployment_cohorts',
    'staging': 'cloud_deployment_cohorts',
    'dev': 'dev_deployment_cohorts'
}

COHORT_TABLES = {
    'prod': 'prod_cohorts',
    'staging': 'staging_cohorts'
}

from apiclient.discovery import build
from oauth2client.client import GoogleCredentials

from idc.settings import BIGQUERY_PROJECT_ID

def authorize_and_get_bq_service():
    credentials = GoogleCredentials.get_application_default().create_scoped(['https://www.googleapis.com/auth/bigquery'])
    http = Http()
    http = credentials.authorize(http)

    bigquery_service = build('bigquery', 'v2', http=http)
    return bigquery_service

# TODO Use bq_data_access.BigQueryCohortSupport
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
        }
    ]

    patient_type = 'patient'
    sample_type = 'sample'


    @classmethod
    def get_schema(cls):
        return deepcopy(cls.cohort_schema)

    def __init__(self, service, project_id, dataset_id, table_id):
        self.service = service
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
        table_data = self.service.tabledata()

        body = self._build_request_body_from_rows(rows)

        response = table_data.insertAll(projectId=self.project_id,
                                        datasetId=self.dataset_id,
                                        tableId=self.table_id,
                                        body=body).execute()

        return response

    def _build_cohort_row(self, cohort_id,
                          patient_barcode=None, sample_barcode=None, aliquot_barcode=None):
        return {
            'cohort_id': cohort_id,
            'patient_barcode': patient_barcode,
            'sample_barcode': sample_barcode,
            'aliquot_barcode': aliquot_barcode
        }

    def add_cohort_with_sample_barcodes(self, cohort_id, barcodes):
        rows = []
        for sample_barcode in barcodes:
            patient_barcode = sample_barcode[:12]
            rows.append(self._build_cohort_row(cohort_id, patient_barcode, sample_barcode, None))

        response = self._streaming_insert(rows)
        return response

def create_table(dataset_id, table_id):
    print("Creating table {0}.{1}".format(dataset_id, table_id))
    project_id = BIGQUERY_PROJECT_ID

    schema = BigQueryCohortSupport.get_schema()

    dataset_args = {
        'projectId': project_id,
        'datasetId': dataset_id
    }

    table_ref = {
        'tableId': table_id,
        'projectId': project_id,
        'datasetId': dataset_id
    }

    table = {
        'tableReference': table_ref,
        'schema': {
            'fields': schema
        }
    }

    service = authorize_and_get_bq_service()

    table = service.tables().insert(
        body=table,
        **dataset_args
    ).execute()

    return table

def prod_table(args):
    dataset_id = COHORT_DATASETS['prod']
    table_id = COHORT_TABLES['prod']
    if args.cmd == 'create':
        create_table(dataset_id, table_id)

def staging_table(args):
    dataset_id = COHORT_DATASETS['staging']
    table_id = COHORT_TABLES['staging']
    if args.cmd == 'create':
        create_table(dataset_id, table_id)

def dev_table(args):
    dataset_id = COHORT_DATASETS['dev']
    if args.cmd == 'create':
        create_table(dataset_id, args.table)

def main():
    parser = ArgumentParser(description="Cohort table utility")
    subparsers = parser.add_subparsers(help='commands')

    # Staging deployment
    staging_parser = subparsers.add_parser('staging', help="Staging deployment")
    staging_parser.add_argument('cmd', choices=['delete', 'create'])
    staging_parser.set_defaults(func=staging_table)

    # Production deployment
    prod_parser = subparsers.add_parser('prod', help="Production deployment")
    prod_parser.add_argument('cmd', choices=['delete', 'create'])
    prod_parser.set_defaults(func=prod_table)

    # Development deployment
    dev_parser = subparsers.add_parser('dev', help="Local development deployment")
    dev_parser.add_argument('cmd', choices=['delete', 'create'])
    dev_parser.add_argument('table', type=str, help='Table name for local developer')
    dev_parser.set_defaults(func=dev_table)

    args = parser.parse_args()
    args.func(args)


if __name__ == '__main__':
    main()
