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

from urllib2 import HTTPError
import pprint
import logging
import os
import io
import csv

from googleapiclient import http
from django.conf import settings
import MySQLdb

from google_helpers.bigquery_service import get_bigquery_service
from google_helpers.storage_service import get_storage_resource
import pexpect
import time
import sys


os.environ['DJANGO_SETTINGS_MODULE'] = 'GenespotRE.settings'

logger = logging.getLogger(__name__)

PROJECT_ID = settings.BQ_PROJECT_ID

'''
before running, pip install pexpect
run as SETTINGS_VERSION='dev' python scripts/cloudsql_logging.py [args]
'''


def main():

    filenames = get_binary_log_filenames()
    yesterdays_binary_log_file = filenames[-2]
    yesterdays_binary_log_file = 'mysql-bin.000067'
    arglist = ['mysqlbinlog',
               '--read-from-remote-server',
               yesterdays_binary_log_file,
               '--host',
               settings.IPV4,
               '--user',
               settings.DATABASES['default']['USER'],
               '--base64-output=DECODE-ROWS',  #DECODE-ROWS
               '--verbose',
               '--password'
               ]

    # transaction_list = []
    # date_str = ''

    child = pexpect.spawn(' '.join(arglist))
    child.expect('Enter password:')
    child.sendline(settings.DATABASES['default']['PASSWORD'])
    i = child.expect(['Permission denied', 'Terminal type', '[#\$] '])
    if i == 2:
        output = child.read()
        date_start_char = output.find('#1')
        date_str = output[date_start_char+1:date_start_char+7]
        storage_service = get_storage_resource()
        media = http.MediaIoBaseUpload(io.BytesIO(output), 'text/plain')
        filename = 'cloudsql_activity_log_' + date_str + '.txt'
        storage_service.objects().insert(bucket='isb-cgc_logs',
                                         name=filename,
                                         media_body=media,
                                         ).execute()



        #
        # beginning = 0
        # start = output.find('accounts_nih_user', beginning)
        # while (start != -1):
        #     realstart = output.rfind('\n', 0, start) + 1
        #     end = output.find('COMMIT', realstart) + 12
        #     chunk = output[realstart:end]
        #     transaction_list.append(chunk)
        #     beginning = end
        #     start = output.find('accounts_nih_user', beginning)
        #
        #
        #
        # write_transactions_to_csv(transaction_list, date_str)
        #
        # # store csv_file in cloudstorage
        #
        # with open('cloudsql_activity_log_' + date_str + '.csv', 'rb') as csvfile:
        #     media = http.MediaIoBaseUpload(io.BytesIO(csvfile.read()), 'text/csv')
        #
        # filename = 'cloudsql_activity_log_' + date_str + '.csv'
        # req = storage_service.objects().insert(bucket='isb-cgc_logs',
        #                                        name=filename,
        #                                        media_body=media,
        #                                        )
        # req.execute()
        #
        # schema = []
        # max_len = 50
        # for i in range(0, max_len):
        #     schema.append({"name": "col" + str(i), "type": "string"})
        #
        # # load csv_file into bigquery
        # write_cloudsql_log_to_bigquery(filename, date_str, schema)

    child.terminate()


def write_transactions_to_csv(transaction_list, date_str):
    with open('cloudsql_activity_log_' + date_str + '.csv', 'wb') as csv_file:
        csv_writer = csv.writer(csv_file, delimiter=',')
        for transaction in transaction_list:
            transaction_cols = transaction.split('\n')
            csv_writer.writerow(transaction_cols)


def write_cloudsql_log_to_bigquery(filename, date_str, schema):

    service = get_bigquery_service()

    datasetId = 'isb_cgc_logs'
    targetTableId = 'cloudsql_activity_log_' + date_str

    try:
        jobCollection = service.jobs()
        jobData = {
            'projectId': PROJECT_ID,
            'configuration': {
                'load': {
                    'sourceUris': ['gs://isb-cgc_logs/' + filename],
                    'schema': {
                        'fields': schema
                    },
                    'destinationTable': {
                        'projectId': PROJECT_ID,
                        'datasetId': datasetId,
                        'tableId': targetTableId
                    },
                    'skipLeadingRows': 0,
                    'maxBadRecords': 1000000000,
                    'allowQuotedNewlines': True,
                    'allowJaggedRows': True,
                    'ignoreUnknownValues': True
                },
            }
        }
        insertResponse = jobCollection.insert(projectId=PROJECT_ID,
                                              body=jobData).execute()

        # Ping for status until it is done, with a short pause between calls.
        while True:
            job = jobCollection.get(projectId=PROJECT_ID,
                                    jobId=insertResponse['jobReference']['jobId']).execute()
            if 'DONE' == job['status']['state']:
                print 'Done Loading!'
                return

            if 'errorResult' in job['status']:
                print 'Error loading table: ', pprint.pprint(job)
                return

            print 'Waiting for loading to complete...'
            time.sleep(10)

    except HTTPError as err:
        print 'Error in loadTable: ', pprint.pprint(err.resp)  # or err.reason?



def get_binary_log_filenames(print_filenames=False):


    database = settings.DATABASES['default']
    env = os.getenv('SERVER_SOFTWARE')
    if env and env.startswith('Google App Engine/'):
        db = MySQLdb.connect(
            unix_socket=database['HOST'],
            db=database['NAME'],
            user=database['USER'],
        )
    else:
        db = MySQLdb.connect(
            host=settings.IPV4,
            db=database['NAME'],
            user=database['USER'],
            passwd=database['PASSWORD']
        )
    try:
        cursor = db.cursor()
        cursor.execute('SHOW BINARY LOGS;')
        filenames = []
        for row in cursor.fetchall():
            filenames.append(row[0])
    except (TypeError, IndexError) as e:
        logger.warn('Error in retrieving binary log filenames: {}'.format(e))

    if print_filenames:
        print filenames
    return filenames

if __name__ == '__main__':
    os.environ['DJANGO_SETTINGS_MODULE'] = 'GenespotRE.settings'
    if len(sys.argv) > 1:
        if sys.argv[1] == 'get_filenames':
            get_binary_log_filenames(print_filenames=True)
    else:
        main()
