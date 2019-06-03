from __future__ import print_function
from builtins import str
from argparse import ArgumentParser
import logging
import os, sys
from sys import exit

from MySQLdb import connect, cursors
from MySQLdb.cursors import DictCursor
import datetime
import httplib2

from GenespotRE import secret_settings
from apiclient.discovery import build
from oauth2client.client import GoogleCredentials


def authorize_and_get_bq_service():
    credentials = GoogleCredentials.get_application_default().create_scoped(['https://www.googleapis.com/auth/bigquery'])
    http = httplib2.Http()
    http = credentials.authorize(http)

    bigquery_service = build('bigquery', 'v2', http=http)
    return bigquery_service

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

def get_active_cohorts(conn):
    cursor = conn.cursor(cursors.DictCursor)
    cursor.execute('select id from cohorts_cohort where active=1;')
    return [int(row['id']) for row in cursor.fetchall()]

def get_bq_active_cohorts(table):
    service = authorize_and_get_bq_service()
    print(service)

    query = 'SELECT cohort_id from {0} group by cohort_id'.format(table)
    query_body = {
        'query': query
    }

    print("RUNNING QUERY: " + str(query), file=sys.stderr)
    table_data = service.jobs()
    query_response = table_data.query(projectId='isb-cgc', body=query_body).execute()

    result = []
    num_result_rows = int(query_response['totalRows'])
    if num_result_rows == 0:
        return result

    for row in query_response['rows']:
        result.append(int(row['f'][0]['v']))

    return result

def main():
    cmd_line_parser = ArgumentParser(description="Get BQ/CloudSQL Cohort Sync")
    cmd_line_parser.add_argument('TABLE', type=str, help="Google Cloud project ID:BigQuery Dataset: BigQuery Table")

    args = cmd_line_parser.parse_args()

    bq_table = args.TABLE
    conn = get_mysql_connection()
    sql_active_cohorts = get_active_cohorts(conn)


    bq_active_cohorts = get_bq_active_cohorts(bq_table)
    result_list = []
    print('Active cohorts that are not in BQ: ')
    for cohort in sql_active_cohorts:
        if cohort not in bq_active_cohorts:
            result_list.append(cohort)

    print(result_list)
    return 0

if __name__ == "__main__":
    main()