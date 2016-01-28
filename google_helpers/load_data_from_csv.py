# Copyright 2015, Google, Inc.
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

"""Command-line application that loads data into BigQuery from a CSV file in
Google Cloud Storage.
This is a modified version of load_data_from_csv.py script from jonparrot
See other examples here: https://github.com/GoogleCloudPlatform/python-docs-samples
This sample is used on this page:
    https://cloud.google.com/bigquery/loading-data-into-bigquery#loaddatagcs
For more information, see the README.md under /bigquery.
"""

import argparse
import logging
import json
import time
import uuid
import sys

from google_helpers.bigquery_service import get_bigquery_service

logger = logging.getLogger(__name__)


# [START load_table]
def load_table(bigquery, project_id, dataset_id, table_name, source_schema,
               source_path, source_format='NEWLINE_DELIMITED_JSON', num_retries=5, write_disposition='WRITE_EMPTY'):
    """
    Starts a job to load a bigquery table from CSV
    Args:
        bigquery: an initialized and authorized bigquery client
        google-api-client object
        source_schema: a valid bigquery schema,
        see https://cloud.google.com/bigquery/docs/reference/v2/tables
        source_csv: the fully qualified Google Cloud Storage location of
        the data to load into your table
    Returns: a bigquery load job, see
    https://cloud.google.com/bigquery/docs/reference/v2/jobs#configuration.load
    """

    # Generate a unique job_id so retries
    # don't accidentally duplicate query
    job_data = {
        'jobReference': {
            'projectId': project_id,
            'job_id': str(uuid.uuid4())
        },
        'configuration': {
            'load': {
                'sourceFormat' : source_format,
                'sourceUris': [source_path],
                'schema': {
                    'fields': source_schema
                },
                'destinationTable': {
                    'projectId': project_id,
                    'datasetId': dataset_id,
                    'tableId': table_name
                },
                'ignoreUnknownValues': True,
                'createDisposition': 'CREATE_IF_NEEDED',
                'writeDisposition': write_disposition
            }
        }
    }

    return bigquery.jobs().insert(
        projectId=project_id,
        body=job_data).execute(num_retries=num_retries)
# [END load_table]


# [START poll_job]
def poll_job(bigquery, job):
    """Waits for a job to complete."""

    logger.info('Waiting for poll_job for table {} to finish...'.format(
        job['configuration']['load']['destinationTable']['tableId']))

    request = bigquery.jobs().get(
        projectId=job['jobReference']['projectId'],
        jobId=job['jobReference']['jobId'])

    while True:
        result = request.execute(num_retries=2)

        if 'errors' in result['status']:
            logger.warn('Error loading table: {}'.format(
                job['configuration']['load']['destinationTable']['tableId']))
            raise RuntimeError(json.dumps(result['status']['errors'], indent=4))

        if result['status']['state'] == 'DONE':
            if 'errorResult' in result['status']:
                raise RuntimeError(result['status']['errorResult'])
            print >> sys.stderr, 'Job complete.'
            logger.info('poll_job complete.')
            return

        time.sleep(1)
# [END poll_job]


# [START run]
def run(project_id, dataset_id, table_name, schema_file, data_path,
         source_format='NEWLINE_DELIMITED_JSON', write_disposition='WRITE_EMPTY', num_retries=5, poll_interval=1):

    bigquery_service = get_bigquery_service()

    with open(schema_file, 'r') as f:
        schema = json.load(f)

    job = load_table(
        bigquery_service,
        project_id,
        dataset_id,
        table_name,
        schema,
        data_path,
        source_format,
        num_retries,
        write_disposition
    )

    poll_job(bigquery_service, job)

# [END run]


# [START main]
if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('project_id', help='Your Google Cloud project ID.')
    parser.add_argument('dataset_id', help='A BigQuery dataset ID.')
    parser.add_argument(
        'table_name', help='Name of the table to load data into.')
    parser.add_argument(
        'schema_file',
        help='Path to a schema file describing the table schema.')
    parser.add_argument(
        'data_path',
        help='Google Cloud Storage path to the CSV data, for example: '
             'gs://mybucket/in.csv')
    parser.add_argument(
        '-p', '--poll_interval',
        help='How often to poll the query for completion (seconds).',
        type=int,
        default=1)
    parser.add_argument(
        '-r', '--num_retries',
        help='Number of times to retry in case of 500 error.',
        type=int,
        default=5)
    parser.add_argument(
        '-t', '--source_format',
        help='The source format can be NEWLINE_DELIMITED_JSON or CSV. The default is CSV',
        type=str,
        default='CSV')
    parser.add_argument(
          '-w', '--write_disposition',
          help='Check if the destination table already exists',
          type=str,
          default='WRITE_EMPTY')

    args = parser.parse_args()

    run(
        args.project_id,
        args.dataset_id,
        args.table_name,
        args.schema_file,
        args.data_path,
        args.source_format,
        args.write_disposition,
        args.num_retries,
        args.poll_interval
    )