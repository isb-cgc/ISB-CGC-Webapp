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

from builtins import str
from builtins import object
import datetime
import logging
import traceback
import os
import csv
from argparse import ArgumentParser
import sys
import time
from copy import deepcopy

from GenespotRE import secret_settings, settings
from MySQLdb import connect
from MySQLdb.cursors import DictCursor
from google_helpers.bigquery.service import authorize_credentials_with_Google

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "GenespotRE.settings")

import django
django.setup()

from projects.models import Program, Public_Data_Tables, Public_Metadata_Tables, Public_Annotation_Tables, Project
from django.contrib.auth.models import User

ALLDATA_COHORT_NAME = 'All TCGA Data'
BQ_DATASET = settings.BIGQUERY_COHORT_DATASET_ID
DEFAULT_COHORT_TABLE = settings.BIGQUERY_COHORT_TABLE_ID
SUPERUSER_NAME = 'isb'

MAX_INSERT = 15000

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

        print(self.project_id + ":" + self.dataset_id + ":" + self.table_id, file=sys.stdout)

        index = 0
        next = 0

        while next is not None and index < len(rows):
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

    # Create a cohort based on a dictionary of sample, case, and project IDs
    def add_cohort_to_bq(self, cohort_id, samples):
        rows = []
        for sample in samples:
            rows.append(self._build_cohort_row(cohort_id, case_barcode=sample['case_barcode'], sample_barcode=sample['sample_barcode'], project_id=sample['project_id']))

        response = self._streaming_insert(rows)

        print(response.__str__(), file=sys.stdout)

        return response

    # Create a cohort based only on sample and optionally project IDs (case ID is NOT added)
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


def get_mysql_connection():
    db_settings = secret_settings.get('DATABASE')['default'] if (settings.IS_DEV or not settings.DB_SOCKET) else settings.DATABASES['default']

    db = None
    ssl = None

    if 'OPTIONS' in db_settings and 'ssl' in db_settings['OPTIONS'] and not (settings.IS_APP_ENGINE_FLEX or settings.IS_APP_ENGINE):
        ssl = db_settings['OPTIONS']['ssl']

    if settings.IS_APP_ENGINE_FLEX or settings.IS_APP_ENGINE:
        # Connecting from App Engine
        db = connect(
            host='localhost',
            unix_socket=settings.DB_SOCKET,
            db=db_settings['NAME'],
            user=db_settings['USER'],
            password=db_settings['PASSWORD']
        )
    else:
        db = connect(host=db_settings['HOST'], port=db_settings['PORT'], db=db_settings['NAME'],
                     user=db_settings['USER'], passwd=db_settings['PASSWORD'], ssl=ssl)

    return db


# Update the attribute display table program IDs
def update_attr_display_table(debug):

    cursor = None
    db = None

    try:

        db = get_mysql_connection()
        cursor = db.cursor()

        db.autocommit(True)

        # get the ISB superuser ID
        cursor.execute("""
            SELECT id
            FROM auth_user
            WHERE username = 'isb' AND is_superuser = 1 AND is_active = 1
        """)

        suid = cursor.fetchall()[0][0]

        # get the public program IDs
        cursor.execute("""
            SELECT name, id
            FROM projects_program
            WHERE owner_id = %s AND is_public = 1 AND active = 1
        """, (suid,))

        update_attr_tbl_stmt = """
            UPDATE attr_value_display
            SET program_id = %s
            WHERE program_id = %s;
        """

        progs = {
            'TCGA':{
                'new_id': 0,
                'old_id': 5
            },
            'CCLE':{
                'new_id': 0,
                'old_id': 6
            },
            'TARGET':{
                'new_id': 0,
                'old_id': 48
            },
        }

        for row in cursor.fetchall():
            progs[row[0]]['new_id'] = row[1]

        for prog in progs:
            if debug:
                print("[STATUS] Excuting update query:" + update_attr_tbl_stmt, file=sys.stdout)
                print("With values "+str((progs[prog]['new_id'], progs[prog]['old_id'],)), file=sys.stdout)
            else:
                cursor.execute(update_attr_tbl_stmt, (progs[prog]['new_id'], progs[prog]['old_id'],))

    except Exception as e:
        print("[ERROR] Exception when adding the attr_value_display table - it may not have been properly generated!", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


# Insert any missing programs and projects into Django tables
def create_programs_and_projects(debug):
    db = None
    cursor = None

    insert_programs = "INSERT INTO projects_program (name, active, last_date_saved, is_public, owner_id) " + \
                      "VALUES (%s,%s,%s,%s,%s);"

    get_project_list = "SELECT DISTINCT project_short_name, name FROM {0};"

    insert_projects = "INSERT INTO projects_project (name, description, active, last_date_saved, owner_id, program_id) " + \
                     "VALUES (%s,%s,%s,%s,%s,%s);"

    insert_metadata_tables = """
      INSERT INTO projects_public_metadata_tables (samples_table, attr_table, projects_table,
        sample_data_availability_table, sample_data_type_availability_table, clin_table, biospec_table, data_tables_id,
        bq_dataset, biospec_bq_table, clin_bq_table, {0} program_id)
      VALUES({1});
    """
    update_metadata_tables = """
      UPDATE projects_public_metadata_tables
      SET samples_table = %s, attr_table = %s, sample_data_availability_table = %s,
        sample_data_type_availability_table = %s, clin_table = %s, biospec_table = %s, {0} data_tables_id = %s
      WHERE id = %s;
    """

    insert_data_tables = """
      INSERT INTO projects_public_data_tables (data_table, bq_dataset, {0} build, program_id)
      VALUES({1});
    """

    insert_annot_tables = """
      INSERT INTO projects_public_annotation_tables ({0} program_id)
      VALUES({1});
    """

    programs_to_insert = ['TARGET', 'TCGA', 'CCLE']

    projects_to_insert = ['CCLE', 'TCGA', 'TARGET']

    program_tables_to_insert = {
        'TCGA': {
            'annot': ['annot', 'biospec', 'clin', 'sample'],
            'data': {'HG19': 1, 'HG38': 1}
        },
        'CCLE': {
            'data': {'HG19': 0}
        },
        'TARGET': {
            'data': {'HG19': 0, 'HG38': 0}
        }
    }

    try:
        db = get_mysql_connection()
        cursor = db.cursor()

        db.autocommit(True)

        isb_user = User.objects.get(username='isb',is_staff=True,is_superuser=True,is_active=True)
        isb_userid = isb_user.id

        for prog in programs_to_insert:
            if len(Program.objects.filter(owner=isb_userid,is_public=True,active=True,name=prog)):
                print("Found program "+prog+", insert skipped.", file=sys.stdout)
            else:
                insertTime = time.strftime('%Y-%m-%d %H:%M:%S')
                values = (prog, True, insertTime, True, isb_userid, )

                if debug:
                    print("Executing statement: " + insert_programs, file=sys.stdout)
                    print("with values: " + str(values), file=sys.stdout)
                else:
                    cursor.execute(insert_programs, values)

        for prog in program_tables_to_insert:
            data_tables = None

            prog_tables = program_tables_to_insert[prog]

            prog_obj = Program.objects.get(owner_id=isb_userid,is_public=True,active=True,name=prog)
            prog_id = prog_obj.id

            check = Public_Data_Tables.objects.filter(program__name=prog)

            if len(check):
                data_tables = check[0].id
            else:
                for build in prog_tables['data']:
                    values = (prog+'_metadata_data_'+build, prog.upper()+'_'+build.lower()+'_data_v0')
                    insert_data_tables_opt_fields = ''
                    if prog_tables['data'][build]:
                        values += (prog+'_metadata_annotation2data_'+build,)
                        insert_data_tables_opt_fields = 'annot2data_table,'
                    values += (build, prog_id,)

                    param_set = ("%s," * len(values))[:-1]

                    if debug:
                        print("Executing statement: "+insert_data_tables.format(insert_data_tables_opt_fields, param_set), file=sys.stdout)
                        print("Values: "+str(values), file=sys.stdout)
                        data_tables = 'data_tables_id'
                    else:
                        cursor.execute(insert_data_tables.format(insert_data_tables_opt_fields, param_set), values)
                        cursor.execute('SELECT id FROM projects_public_data_tables WHERE program_id = %s AND build = %s;', (prog_id, build,))
                        data_tables = cursor.fetchall()[0][0]

            annot_tables = None

            check = Public_Annotation_Tables.objects.filter(program__name=prog)

            if len(check):
                annot_tables = check[0].id
            else:
                if 'annot' in prog_tables:
                    values = ()
                    insert_annot_tables_fields = ''
                    annot_table_set = prog_tables['annot']

                    if 'annot' in annot_table_set:
                        values += (prog+'_metadata_annotation',)
                        insert_annot_tables_fields += 'annot_table,'
                    if 'biospec' in annot_table_set:
                        values += (prog+'_metadata_annotation2biospecimen',)
                        insert_annot_tables_fields += 'annot2biospec_table,'
                    if 'clin' in annot_table_set:
                        values += (prog+'_metadata_annotation2clinical',)
                        insert_annot_tables_fields += 'annot2clin_table,'
                    if 'sample' in annot_table_set:
                        values += (prog+'_metadata_annotation2samples',)
                        insert_annot_tables_fields += 'annot2sample_table,'

                    values += (prog_id,)

                    param_set = ("%s," * len(values))[:-1]

                    if debug:
                        print("Executing statment: "+ insert_annot_tables.format(insert_annot_tables_fields, param_set), file=sys.stdout)
                        print("Values: "+str(values), file=sys.stdout)
                    else:
                        cursor.execute(insert_annot_tables.format(insert_annot_tables_fields, param_set), values)
                        cursor.execute('SELECT id FROM projects_public_annotation_tables WHERE program_id = %s;', (prog_id,))
                        annot_tables = cursor.fetchall()[0][0]

            insert_metadata_tables_opt_fields = ''

            results = Public_Metadata_Tables.objects.filter(program__name=prog)
            is_update = len(results) > 0

            values = (prog + '_metadata_samples', prog + '_metadata_attrs', prog + '_metadata_project',
                prog + '_metadata_sample_data_availability', prog + '_metadata_data_type_availability',
                prog + '_metadata_clinical', prog + '_metadata_biospecimen', data_tables, prog.upper()+'_bioclin_v0',
                      'Biospecimen' if prog != 'CCLE' else None, 'Clinical' if prog != 'CCLE' else 'clinical_v0')

            if annot_tables:
                values += (annot_tables,)
                if is_update:
                    insert_metadata_tables_opt_fields = 'annot_tables_id = %s,'
                else:
                    insert_metadata_tables_opt_fields = 'annot_tables_id,'

            values += (prog_id,)

            if is_update:
                if debug:
                    print("Executing statement: "+update_metadata_tables.format(insert_metadata_tables_opt_fields), file=sys.stdout)
                    print(" with values "+ str(values), file=sys.stdout)
                else:
                    cursor.execute(update_metadata_tables.format(insert_metadata_tables_opt_fields), values)
            else:
                param_set = ("%s," * len(values))[:-1]
                if debug:
                    print("Exeucting statement: "+update_metadata_tables.format(insert_metadata_tables_opt_fields,param_set), file=sys.stdout)
                    print(" with values "+ str(values), file=sys.stdout)
                else:
                    cursor.execute(insert_metadata_tables.format(insert_metadata_tables_opt_fields,param_set), values)

        for prog in projects_to_insert:

            prog_proj_table = prog+'_metadata_project'

            prog_id = None

            cursor.execute('SELECT id FROM projects_program WHERE name=%s and active=1;', (prog,))
            results = cursor.fetchall()
            if len(results):
                prog_id = results[0][0]

            cursor.execute(get_project_list.format(prog_proj_table))

            prog_leader = prog+'-'

            for row in cursor.fetchall():
                cursor.execute('SELECT * FROM projects_project WHERE program_id = %s AND active=1 AND name=%s;', (prog_id, row[0][len(prog_leader):],))

                check = cursor.fetchall()

                if len(check):
                    print("Project "+row[0]+" is already in the projects_project table, skipping", file=sys.stdout)
                else:
                    print("Inserting project "+row[0], file=sys.stdout)
                    insertTime = time.strftime('%Y-%m-%d %H:%M:%S')
                    values = (row[0][len(prog_leader):], row[1], True, insertTime, isb_userid, prog_id,)
                    if debug:
                        print("Executing statement: "+insert_projects, file=sys.stdout)
                        print("Values: " + str(values), file=sys.stdout)
                    else:
                        cursor.execute(insert_projects, values)

        # Now de-activate the old CCLE project
        ccle_proj = Project.objects.filter(name='CCLE', owner=isb_user, active=1)
        if len(ccle_proj) > 0:
            ccle_proj[0].active=0
            ccle_proj[0].save()

    except Exception as e:
        print(traceback.format_exc(), file=sys.stdout)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


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
    select_samples_str = """
      SELECT distinct ms.sample_barcode, ms.case_barcode, pp.id AS project_id
      FROM TCGA_metadata_samples ms
      JOIN projects_project pp
      ON pp.name = SUBSTR(ms.project_short_name, LOCATE('-',ms.project_short_name)+1)
      JOIN projects_program pr
      ON pr.id = pp.program_id
      WHERE pr.name = 'TCGA';
    """
    cursor.execute(select_samples_str)
    barcodes = []

    for row in cursor.fetchall():
        barcodes.append({
            'project_id': row['project_id'],
            'sample_barcode': row['sample_barcode'],
            'case_barcode': row['case_barcode']
        })

    cursor.close()

    return barcodes


def get_barcodes_from_file(filename):
    with open(filename) as tsv:
        header = True
        case_barcodes = []
        sample_barcodes = []
        for line in csv.reader(tsv, delimiter='\t'):
            if header:
                headers = line
                header = False
            else:

                codes = line

                # Check if case_barcode is first
                if headers[0] == 'case_barcode':
                    case_code_index = 0
                    sample_code_index = 1
                else:
                    case_code_index = 1
                    sample_code_index = 0

                if codes[case_code_index] not in case_barcodes:
                    case_barcodes.append(codes[case_code_index])

                if codes[sample_code_index] not in sample_barcodes:
                    sample_barcodes.append(codes[sample_code_index])

        return {'case_barcodes': case_barcodes, 'sample_barcodes': sample_barcodes}

    pass


def create_tcga_cohorts_from_files(directory):
    filelist = os.listdir(directory)

    for file in filelist:
        filepath = os.path.join(directory, file)
        file_barcodes = get_barcodes_from_file(filepath)
        print(filepath, len(file_barcodes['sample_barcodes']), len(file_barcodes['case_barcodes']))


def insert_barcodes_mysql(conn, superuser_id, cohort_name, sample_barcodes):
    insert_samples_str = 'INSERT INTO cohorts_samples (sample_barcode, cohort_id, case_barcode, project_id) values (%s, %s, %s, %s);'

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
        sample_tuples.append((row['sample_barcode'], str(cohort_id), row['case_barcode'], row['project_id']))
    logging.info('Number of sample barcodes: {num_samples}'.format(num_samples=len(sample_tuples)))

    cursor.executemany(insert_samples_str, sample_tuples)

    cursor.execute('insert into cohorts_cohort_perms (perm, cohort_id, user_id) values (%s, %s, %s)', ('OWNER', cohort_id, superuser_id))
    conn.commit()

    return cohort_id


def create_bq_cohort(project_id, dataset_id, table_id, cohort_id, sample_barcodes):
    service = authorize_credentials_with_Google()
    bqs = BigQueryCohortSupport(project_id, dataset_id, table_id)
    bq_result = bqs.add_cohort_to_bq(cohort_id, sample_barcodes)

    # If BQ insertion fails, we immediately de-activate the cohort and warn the user
    if 'insertErrors' in bq_result:
        err_msg = ''
        if len(bq_result['insertErrors']) > 1:
            err_msg = 'There were ' + str(len(bq_result['insertErrors'])) + ' insertion errors '
        else:
            err_msg = 'There was an insertion error '

        print(err_msg + ' when creating your cohort in BigQuery. Creation of the BQ cohort has failed.', file=sys.stderr)


def main():
    cmd_line_parser = ArgumentParser(description="Full sample set cohort utility")
    cmd_line_parser.add_argument('PROJECT_ID', type=str, help="Google Cloud project ID")
    cmd_line_parser.add_argument('-c', '--cohort-name', type=str, default=ALLDATA_COHORT_NAME, help="Cohort name")
    cmd_line_parser.add_argument('-d', '--dataset', type=str, default=BQ_DATASET, help="BigQuery dataset name")
    cmd_line_parser.add_argument('-t', '--table-name', type=str, default=DEFAULT_COHORT_TABLE, help="BigQuery table name")
    cmd_line_parser.add_argument('-i', '--cohort-id', type=int, help="Cohort ID override to be used for BigQuery")
    cmd_line_parser.add_argument('-p', '--add-proj-prog', type=bool, help="Bootstrap Django project and program tables")
    cmd_line_parser.add_argument('-a', '--attr-displ-table', type=bool, default=False,
                                 help="Change the program IDs in the metadata attribute display table to this database's programs.")
    cmd_line_parser.add_argument('-o', '--operation', type=str, choices=['all', 'cloudsql', 'bq'], default='all',
                                 help="Operation")

    args = cmd_line_parser.parse_args()

    args.add_proj_prog and create_programs_and_projects(False)

    args.attr_displ_table and update_attr_display_table(False)

    project_id = args.PROJECT_ID

    conn = get_mysql_connection()
    sample_barcodes = get_sample_barcodes(conn)

    cohort_id = None

    do_cloudsql = (args.operation == 'all' or args.operation == 'cloudsql')
    do_bigquery = (args.operation == 'all' or args.operation == 'bq')

    # create_tcga_cohorts_from_files('./tcga/')
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
        cohort_id = insert_barcodes_mysql(conn, superuser_id, args.cohort_name, sample_barcodes)

    else:
        cohort_id = args.cohort_id

    if do_bigquery:
        create_bq_cohort(project_id, args.dataset, args.table_name, cohort_id, sample_barcodes)

if __name__ == "__main__":
    main()