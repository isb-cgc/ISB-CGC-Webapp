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

from argparse import ArgumentParser

from api.api_helpers import authorize_credentials_with_google_from_file
from bq_data_access.cohort_bigquery import BigQueryCohortSupport, COHORT_DATASETS, COHORT_TABLES

from GenespotRE.settings import get_project_identifier, GOOGLE_APPLICATION_CREDENTIALS

def create_table(dataset_id, table_id):
    print("Creating table {0}.{1}".format(dataset_id, table_id))
    project_id = get_project_identifier()

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

    service = authorize_credentials_with_google_from_file(GOOGLE_APPLICATION_CREDENTIALS)
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
