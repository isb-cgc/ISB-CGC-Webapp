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
import logging
import os
from sys import exit
import datetime
import httplib2

from MySQLdb import connect
from MySQLdb.cursors import DictCursor

from GenespotRE import secret_settings
from apiclient.discovery import build
from oauth2client.client import GoogleCredentials

ALLDATA_COHORT_NAME = 'All TCGA Data'
BQ_DATASET = None
DEFAULT_COHORT_TABLE = None
SUPERUSER_NAME = 'isb'

logging.basicConfig(level=logging.INFO)

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
        },
        {
            "name": "study_id",
            "type": "INTEGER"
        }
    ]

    patient_type = 'patient'
    sample_type = 'sample'

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

def get_mysql_connection():
    env = os.getenv('SERVER_SOFTWARE')
    db_settings = secret_settings.get('DATABASE')['default']
    db = None
    ssl = None
    if 'OPTIONS' in db_settings and 'ssl' in db_settings['OPTIONS']:
        ssl = db_settings['OPTIONS']['ssl']

    if env and env.startswith('Google App Engine/'):  # or os.getenv('SETTINGS_MODE') == 'prod':
        # Connecting from App Engine
        db = connect(
            unix_socket='/cloudsql/<YOUR-APP-ID>:<CLOUDSQL-INSTANCE>',
            db='',
            user='',
        )
    else:
        db = connect(host=db_settings['HOST'], port=db_settings['PORT'], db=db_settings['NAME'], user=db_settings['USER'], passwd=db_settings['PASSWORD'], ssl=ssl)

    return db


def get_existing_alldata_cohort_mysql(conn, cohort_name):

    cursor = conn.cursor(DictCursor)
    cursor.execute('select id from cohorts_cohort where name=%s', [cohort_name])
    cohort_id = cursor.fetchone()
    cursor.close()
    return cohort_id

'''
WARNING: MAKE SURE TO RUN manage.py createsuperuser FIRST WITH USERNAME=isb AND AN EMAIL ADDRESS
'''
def get_superuser_id(conn, superuser_name):
    logging.info("Querying superuser ID for \'{name}\'".format(name=superuser_name))
    cursor = conn.cursor(DictCursor)
    cursor.execute('select id from auth_user where username=%s', [superuser_name])
    result = cursor.fetchone()
    cursor.close()
    if result is not None:
        return result['id']
    else:
        return None

def get_sample_barcodes(conn):
    logging.info("Getting list of sample barcodes from MySQL")
    cursor = conn.cursor(DictCursor)
    select_samples_str = 'SELECT distinct SampleBarcode from metadata_samples where Project="TCGA";'
    cursor.execute(select_samples_str)
    rows = cursor.fetchall()
    cursor.close()
    return rows

def get_patient_barcodes(conn):
    cursor = conn.cursor(DictCursor)
    select_patients_str = 'SELECT DISTINCT ParticipantBarcode from metadata_samples where Project="TCGA";'
    cursor.execute(select_patients_str)
    rows = cursor.fetchall()
    cursor.close()
    return rows

def insert_barcodes_mysql(conn, superuser_id, cohort_name, sample_barcodes, patient_barcodes):
    insert_samples_str = 'INSERT INTO cohorts_samples (sample_id, cohort_id) values (%s, %s);'
    insert_patients_str = 'INSERT INTO cohorts_patients (patient_id, cohort_id) values (%s, %s);'

    insert_cohort_str = 'insert into cohorts_cohort (name, active, last_date_saved) values (%s, %s, %s);'
    insert_cohort_tuple = (cohort_name, True, datetime.datetime.now())

    cohort_id = get_existing_alldata_cohort_mysql(conn, cohort_name)

    if cohort_id:
        message = "Cohort \'{cohort_name}\', ID {cohort_id} already exists in MySQL. Quitting.".format(
            cohort_name=cohort_name, cohort_id=cohort_id['id']
        )
        logging.error(message)
        exit(1)

    logging.info("inserting new cohort")

    cursor = conn.cursor()
    cursor.execute(insert_cohort_str, insert_cohort_tuple)
    conn.commit()

    cohort_id = cursor.lastrowid
    logging.info("MySQL cohort ID is " + str(cohort_id))

    sample_tuples = []
    for row in sample_barcodes:
        sample_tuples.append((row['SampleBarcode'], str(cohort_id)))
    logging.info('Number of sample barcodes: {num_samples}'.format(num_samples=len(sample_tuples)))

    cursor.executemany(insert_samples_str, sample_tuples)

    patients_tuples = []
    for row in patient_barcodes:
        if row['ParticipantBarcode'] != '':
            patients_tuples.append((row['ParticipantBarcode'], str(cohort_id)))
    logging.info('Number of patient barcodes: {num_barcodes}'.format(num_barcodes=len(patients_tuples)))
    cursor.executemany(insert_patients_str, patients_tuples)

    cursor.execute('insert into cohorts_cohort_perms (perm, cohort_id, user_id) values (%s, %s, %s)', ('OWNER', cohort_id, superuser_id))
    conn.commit()

    return cohort_id

def authorize_and_get_bq_service():
    credentials = GoogleCredentials.get_application_default().create_scoped(['https://www.googleapis.com/auth/bigquery'])
    http = httplib2.Http()
    http = credentials.authorize(http)

    bigquery_service = build('bigquery', 'v2', http=http)
    return bigquery_service

def create_bq_cohort(project_id, dataset_id, table_id, cohort_id, sample_barcodes):
    service = authorize_and_get_bq_service()
    bqs = BigQueryCohortSupport(service, project_id, dataset_id, table_id)
    bqs.add_cohort_with_sample_barcodes(cohort_id, sample_barcodes)

def main():
    cmd_line_parser = ArgumentParser(description="Full sample set cohort utility")
    cmd_line_parser.add_argument('PROJECT_ID', type=str, help="Google Cloud project ID")
    cmd_line_parser.add_argument('-c', '--cohort-name', type=str, default=ALLDATA_COHORT_NAME, help="Cohort name")
    cmd_line_parser.add_argument('-d', '--dataset', type=str, default=BQ_DATASET, help="BigQuery dataset name")
    cmd_line_parser.add_argument('-t', '--table-name', type=str, default=DEFAULT_COHORT_TABLE, help="BigQuery table name")
    cmd_line_parser.add_argument('-i', '--cohort-id', type=int, help="Cohort ID override to be used for BigQuery")
    cmd_line_parser.add_argument('-o', '--operation', type=str, choices=['all', 'cloudsql', 'bq'], default='all',
                                 help="Operation")

    args = cmd_line_parser.parse_args()

    project_id = args.PROJECT_ID

    conn = get_mysql_connection()
    sample_barcodes = get_sample_barcodes(conn)
    patient_barcodes = get_patient_barcodes(conn)

    cohort_id = None

    do_cloudsql = (args.operation == 'all' or args.operation == 'cloudsql')
    do_bigquery = (args.operation == 'all' or args.operation == 'bq')

    if args.cohort_id is None and not do_cloudsql:
        logging.error("Cohort ID must be provided if 'cloudsql' operation is not performed.")
        exit(1)

    if do_cloudsql:
        superuser_id = get_superuser_id(conn, SUPERUSER_NAME)

        if not superuser_id:
            message = "Superuser \'{name}\' does not exist in MySQL. Quitting.".format(name=SUPERUSER_NAME)
            logging.error(message)
            exit(1)

        logging.info("Superuser ID: {sid}".format(sid=superuser_id))
        cohort_id = insert_barcodes_mysql(conn, superuser_id, args.cohort_name, sample_barcodes, patient_barcodes)
    else:
        cohort_id = args.cohort_id

    if do_bigquery:
        sample_barcode_list = [x['SampleBarcode'] for x in sample_barcodes]
        create_bq_cohort(project_id, args.dataset, args.table_name, cohort_id, sample_barcode_list)

if __name__ == "__main__":
    main()