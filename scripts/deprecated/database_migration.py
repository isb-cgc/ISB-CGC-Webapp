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
from __future__ import print_function

from builtins import str
import os
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "GenespotRE.settings")
import django
django.setup()

import traceback
import sys
import time

from MySQLdb import connect, cursors
from GenespotRE import secret_settings, settings
from argparse import ArgumentParser
from cohorts.metadata_helpers import submit_bigquery_job, is_bigquery_job_finished, get_bq_job_results, fetch_metadata_value_set
from projects.models import Program, Public_Data_Tables, Public_Metadata_Tables, Public_Annotation_Tables, Project
from google_helpers.bigquery.service import authorize_credentials_with_Google
from django.contrib.auth.models import User
from genes.models import GeneSymbol
from cohorts.views import BQ_ATTEMPT_MAX

SUPERUSER_NAME = 'isb'

def get_mysql_connection():
    db_settings = secret_settings.get('DATABASE')['default'] if settings.IS_DEV else settings.DATABASES['default']

    db = None
    ssl = None

    if 'OPTIONS' in db_settings and 'ssl' in db_settings['OPTIONS']:
        ssl = db_settings['OPTIONS']['ssl']

    if settings.IS_APP_ENGINE_FLEX:
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
      INSERT INTO projects_public_metadata_tables (samples_table, attr_table, sample_data_availability_table,
        sample_data_type_availability_table, clin_table, biospec_table, data_tables_id, {0} program_id)
      VALUES({1});
    """
    update_metadata_tables = """
      UPDATE projects_public_metadata_tables
      SET samples_table = %s, attr_table = %s, sample_data_availability_table = %s,
        sample_data_type_availability_table = %s, clin_table = %s, biospec_table = %s, {0} data_tables_id = %s
      WHERE id = %s;
    """

    insert_data_tables = """
      INSERT INTO projects_public_data_tables (data_table, {0} build, program_id)
      VALUES({1});
    """

    insert_annot_tables = """
      INSERT INTO projects_public_annotation_tables ({0} program_id)
      VALUES({1});
    """

    programs_to_insert = ['TARGET']

    projects_to_insert = ['CCLE', 'TARGET']

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
                    values = (prog+'_metadata_data_'+build,)
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

            values = (prog + '_metadata_samples', prog + '_metadata_attrs',
                prog + '_metadata_sample_data_availability', prog + '_metadata_data_type_availability',
                prog + '_metadata_clinical', prog + '_metadata_biospecimen', data_tables,)

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
        ccle_proj = Project.objects.get(name='CCLE', owner=isb_user, active=1)
        ccle_proj.active=0
        ccle_proj.save()

    except Exception as e:
        print(traceback.format_exc(), file=sys.stdout)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


# Add case barcodes to the cohorts_samples table (currently not present), and fix CCLE's sammple barcodes (which changed)
def fix_case_barcodes_in_cohorts(debug):

    db = None
    cursor = None

    fix_tcga_case_barcodes = """
        UPDATE cohorts_samples cs
        JOIN TCGA_metadata_samples ms
        ON ms.sample_barcode = cs.sample_barcode
        SET cs.case_barcode = ms.case_barcode
        WHERE cs.case_barcode IS NULL;
    """

    fix_ccle_case_barcodes = """
        UPDATE cohorts_samples cs
        JOIN (
            SELECT SampleBarcode AS sms, cms.sample_barcode new_sample_barcode, cms.case_barcode new_case_barcode
            FROM metadata_samples ms
            JOIN CCLE_metadata_samples cms
            ON cms.case_barcode = ms.ParticipantBarcode
            WHERE SampleBarcode LIKE 'CCLE%'
        ) ms
        ON ms.sms = cs.sample_barcode
        SET cs.sample_barcode = ms.new_sample_barcode, cs.case_barcode = ms.new_case_barcode
        WHERE cs.sample_barcode LIKE 'CCLE%';
    """

    try:
        db = get_mysql_connection()
        cursor = db.cursor()
        db.autocommit(True)

        if debug:
            print("Executing statement: "+fix_tcga_case_barcodes, file=sys.stdout)
        else:
            print("[STATUS] Fixing TCGA case barcodes...", file=sys.stdout)
            cursor.execute(fix_tcga_case_barcodes)
            print("[STATUS] ...done.", file=sys.stdout)

        if debug:
            print("Executing statement: " + fix_ccle_case_barcodes, file=sys.stdout)
        else:
            print("[STATUS] Fixing CCLE case barcodes...", file=sys.stdout)
            cursor.execute(fix_ccle_case_barcodes)
            print("[STATUS] ...done.", file=sys.stdout)

    except Exception as e:
        print(traceback.format_exc(), file=sys.stdout)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


# Currently only CCLE's projects are incorrect (they're all the 'CCLE' project) but if others need to be done they can be added
# to the program_cohorts_to_update list
def fix_cohort_projects(debug):

    db = None
    cursor = None

    try:
        db = get_mysql_connection()
        cursor = db.cursor()
        db.autocommit(True)

        isb_userid = None

        cursor.execute("SELECT id FROM auth_user WHERE username = %s AND is_active = 1 AND is_superuser = 1;", (SUPERUSER_NAME,))

        for row in cursor.fetchall():
            isb_userid = row[0]

        if isb_userid is None:
            raise Exception("Couldn't retrieve ID for isb user!")

        program_cohorts_to_update = ['CCLE','TCGA']

        for prog in program_cohorts_to_update:
            cursor.execute("SELECT id FROM projects_program WHERE name=%s and active = 1 and owner_id = %s;", (prog, isb_userid,))

            for row in cursor.fetchall():
                program_id = row[0]

            if program_id is None:
                raise Exception("Couldn't retrieve ID for {0} program!".format(prog))

            fix_cohort_projects = """
                UPDATE cohorts_samples cs
                JOIN {0}_metadata_samples ms
                ON ms.sample_barcode = cs.sample_barcode
                JOIN projects_project pp
                ON ms.disease_code = pp.name
                SET cs.project_id = pp.id
                WHERE pp.program_id = %s AND pp.active = 1;
            """

        values = (program_id, )

        if debug:
            print("Executing statement: "+fix_cohort_projects.format(prog), file=sys.stdout)
            print("Values: "+str(values), file=sys.stdout)
        else:
            cursor.execute(fix_cohort_projects.format(prog), values)

    except Exception as e:
        print(traceback.format_exc(), file=sys.stdout)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


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


def fix_gene_symbols(debug):

    bq_query_template = (
        "SELECT *"
        " FROM [{project_name}:{dataset_name}.{table_name}]"
        " WHERE type='{type_name}'"
    )

    fix_current_genes = """
        UPDATE genes_genesymbol
        SET type='gene'
        WHERE type IS NULL;
    """

    db = None
    cursor = None

    try:

        db = get_mysql_connection()
        db.autocommit(True)
        cursor = db.cursor()

        query = bq_query_template.format(table_name='mirna_gene_symbols',project_name='isb-cgc',dataset_name='test',type_name='miRNA')

        bq_service = authorize_credentials_with_Google()
        query_job = submit_bigquery_job(bq_service, 'isb-cgc', query)
        job_is_done = is_bigquery_job_finished(bq_service, 'isb-cgc', query_job['jobReference']['jobId'])

        mirnas = []
        retries = 0

        while not job_is_done and retries < BQ_ATTEMPT_MAX:
            retries += 1
            time.sleep(1)
            job_is_done = is_bigquery_job_finished(bq_service, 'isb-cgc', query_job['jobReference']['jobId'])

        results = get_bq_job_results(bq_service, query_job['jobReference'])

        if len(results) > 0:
            for mirna in results:
                mirnas.append(mirna['f'][0]['v'])
        else:
            print("[WARNING] miRNA/gene symbol query returned no results", file=sys.stdout)

        if debug:
            print("[STATUS] Executing statement: "+fix_current_genes, file=sys.stdout)
        else:
            print("[STATUS] Fixing current genes...", file=sys.stdout)
            cursor.execute(fix_current_genes)
            print("...done.", file=sys.stdout)

        mirna_gene_symbols = []

        for mirna in mirnas:
            mirna_gene_symbols.append(GeneSymbol(symbol=mirna,type='miRNA'))

        if debug:
            print("[STATUS] Bulk create for %s miRNAs"%str(len(mirna_gene_symbols)), file=sys.stdout)
        else:
            print("[STATUS] Attempting to bulk create %s miRNAs..."%str(len(mirna_gene_symbols)), file=sys.stdout)
            GeneSymbol.objects.bulk_create(mirna_gene_symbols)
            print("...done.", file=sys.stdout)

        query = bq_query_template.format(table_name='mirna_gene_symbols', project_name='isb-cgc', dataset_name='test',
                                         type_name='gene')

        query_job = submit_bigquery_job(bq_service, 'isb-cgc', query)
        job_is_done = is_bigquery_job_finished(bq_service, 'isb-cgc', query_job['jobReference']['jobId'])

        genes = {}
        bq_genes = []
        new_genes = []
        retries = 0

        while not job_is_done and retries < BQ_ATTEMPT_MAX:
            retries += 1
            time.sleep(1)
            job_is_done = is_bigquery_job_finished(bq_service, 'isb-cgc', query_job['jobReference']['jobId'])

        results = get_bq_job_results(bq_service, query_job['jobReference'])

        if len(results) > 0:
            for gene in results:
                bq_genes.append(gene['f'][0]['v'])
        else:
            print("[WARNING] miRNA/gene symbol query returned no results", file=sys.stdout)

        cursor.execute('SELECT * FROM genes_genesymbol WHERE type=%s;',('gene',))

        for row in cursor.fetchall():
            genes[row[1]] = 1

        for new_gene in bq_genes:
            if new_gene not in genes:
                new_genes.append(new_gene)

        if len(new_genes) > 0:
            genes_to_add = [GeneSymbol(symbol=x,type='gene') for x in new_genes]
            if debug:
                print("[STATUS] Bulk create for %s genes" % str(len(genes_to_add)), file=sys.stdout)
            else:
                print("[STATUS] Attempting to bulk create %s genes..." % str(len(genes_to_add)), file=sys.stdout)
                GeneSymbol.objects.bulk_create(genes_to_add)
                print("[STATUS] ...done.", file=sys.stdout)

    except Exception as e:
        print("[ERROR] Exception encountered in fix_gene_symbols:", file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


def fix_user_data_tables(debug,db_to_update = 'test'):

    db = None
    cursor = None

    try:
        db = get_mysql_connection()
        db.autocommit(True)
        cursor = db.cursor()

        update_metadata_stmt = """
            ALTER TABLE %s CHANGE study_id project_id INT(10);
        """

        update_case_samples_stmt = """
            ALTER TABLE %s CHANGE %s case_barcode VARCHAR(200);
        """

        cursor.execute("""
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = '%s' AND COLUMN_NAME LIKE 'study_id' AND TABLE_NAME NOT LIKE 'metadata%%'
            GROUP BY TABLE_NAME;
        """ % db_to_update)

        for row in cursor.fetchall():
            if debug:
                print("[STATUS] Execution statement: " +update_metadata_stmt % row[0], file=sys.stdout)
            else:
                cursor.execute(update_metadata_stmt % row[0])

        cursor.execute("""
            SELECT TABLE_NAME, GROUP_CONCAT(COLUMN_NAME)
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = '%s' AND
              (COLUMN_NAME LIKE 'participant_barcode' OR COLUMN_NAME LIKE 'ParticipantBarcode') AND
              TABLE_NAME NOT LIKE 'metadata%%' AND TABLE_NAME NOT IN (
                SELECT DISTINCT TABLE_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = '%s' AND TABLE_NAME NOT LIKE 'metadata%%' AND
                COLUMN_NAME LIKE 'case_barcode'
              )
            GROUP BY TABLE_NAME;
        """ % (db_to_update, db_to_update,))

        for row in cursor.fetchall():
            cols = row[1].split(',')
            if debug:
                print("[STATUS] Execution statement: "+update_case_samples_stmt % (row[0], cols[len(cols)-1],), file=sys.stdout)
            else:
                cursor.execute(update_case_samples_stmt % (row[0], cols[len(cols)-1],))

    except Exception as e:
        print("[ERROR] While fixing user data tables", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


def fix_var_faves(debug):

    db = None
    cursor = None

    try:
        db = get_mysql_connection()
        db.autocommit(True)
        cursor = db.cursor()

        update_vf_stmt = """
            UPDATE variables_variablefavorite
            SET version='v1'
            WHERE version IS NULL;"""

        if debug:
            print("[STATUS] Executing update statement: "+update_vf_stmt, file=sys.stdout)
        else:
            cursor.execute(update_vf_stmt)

    except Exception as e:
        print("[ERROR] Exception while fixing variable favorites:", file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


def fix_filters(debug):
    db = None
    cursor = None

    try:
        db = get_mysql_connection()
        cursor = db.cursor()

        db.autocommit(True)

        # Project -> Program
        fix_filters_program = """
            UPDATE cohorts_filters
            SET name='program_name'
            WHERE name='Project';
        """

        # Study -> disease_code
        fix_filters_project = """
            UPDATE cohorts_filters
            SET name='disease_code'
            WHERE name='Study';
        """

        # Remove CLIN: and SAMP:, leave in MUT:
        fix_filters_names = """
            UPDATE cohorts_filters
            SET name=SUBSTR(name,LOCATE(':',name)+1)
            WHERE name LIKE '%:%' AND name NOT LIKE 'MUT:%';
        """

        if debug:
            print("[STATUS] Executing update statement: "+fix_filters_program, file=sys.stdout)
            print("[STATUS] Executing update statement: "+fix_filters_project, file=sys.stdout)
            print("[STATUS] Executing update statement: "+fix_filters_names, file=sys.stdout)
        else:
            cursor.execute(fix_filters_program)
            cursor.execute(fix_filters_project)
            cursor.execute(fix_filters_names)

        get_cohots_tcga_and_ccle = """
            SELECT DISTINCT ccle.cohort_id
            FROM cohorts_samples ccle
            JOIN (
                SELECT DISTINCT cs.cohort_id
                FROM cohorts_samples cs
                WHERE cs.sample_barcode NOT LIKE 'CCLE%'
            ) tcga
            ON tcga.cohort_id = ccle.cohort_id
            WHERE ccle.sample_barcode LIKE 'CCLE%';
        """

        fix_tcga_only_filters = """
            UPDATE cohorts_filters cf
            JOIN (
                SELECT id
                FROM cohorts_filters
                WHERE program_id IS NULL AND resulting_cohort_id IN (
                    SELECT DISTINCT tcga.cohort_id
                    FROM cohorts_samples tcga
                    LEFT JOIN (
                        SELECT DISTINCT cs.cohort_id
                        FROM cohorts_samples cs
                        WHERE cs.sample_barcode LIKE 'CCLE%%'
                    ) ccle
                    ON tcga.cohort_id = ccle.cohort_id
                    WHERE tcga.sample_barcode NOT LIKE 'CCLE%%' AND ccle.cohort_id IS NULL
                )
            ) tcga_cf
            ON tcga_cf.id = cf.id
            SET program_id = %s
            WHERE program_id IS NULL;
        """

        fix_ccle_only_filters = """
            UPDATE cohorts_filters cf
            JOIN (
                SELECT id
                FROM cohorts_filters
                WHERE program_id IS NULL AND resulting_cohort_id IN (
                    SELECT DISTINCT ccle.cohort_id
                    FROM cohorts_samples ccle
                    LEFT JOIN (
                        SELECT DISTINCT cs.cohort_id
                        FROM cohorts_samples cs
                        WHERE cs.sample_barcode NOT LIKE 'CCLE%%'
                    ) tcga
                    ON tcga.cohort_id = ccle.cohort_id
                    WHERE ccle.sample_barcode LIKE 'CCLE%%' AND tcga.cohort_id IS NULL
                )
            ) ccle_cf
            ON ccle_cf.id = cf.id
            SET program_id = %s
            WHERE program_id IS NULL;
        """

        get_filters = """
            SELECT id,name,value,resulting_cohort_id
            FROM cohorts_filters
            WHERE program_id IS NULL AND resulting_cohort_id = %s;
        """

        add_filter_program = """
            UPDATE cohorts_filters
            SET program_id = %s
            WHERE id = %s;
        """

        insert_filter = """
            INSERT INTO cohorts_filters(name,value,resulting_cohort_id,program_id)
            VALUES(%s,%s,%s,%s);
        """

        isb_userid = User.objects.get(username='isb',is_staff=True,is_superuser=True,is_active=True).id

        tcga_program_id = Program.objects.get(name='TCGA',owner=isb_userid,is_public=True,active=True).id
        ccle_program_id = Program.objects.get(name='CCLE',owner=isb_userid,is_public=True,active=True).id

        ccle_attr = fetch_metadata_value_set(ccle_program_id)

        # Fix CCLE-only cohort filters
        if debug:
            print("Executing statement: " + fix_ccle_only_filters, file=sys.stdout)
            print("Values: " + str((ccle_program_id,)), file=sys.stdout)
        else:
            cursor.execute(fix_ccle_only_filters, (ccle_program_id,))

        # Fix TCGA-only cohort filters
        if debug:
            print("Executing statement: " + fix_tcga_only_filters, file=sys.stdout)
            print("Values: " + str((tcga_program_id,)), file=sys.stdout)
        else:
            cursor.execute(fix_tcga_only_filters, (tcga_program_id,))

        # Fix mixed TCGA/CCLE cohort filters
        cursor.execute(get_cohots_tcga_and_ccle)

        for row in cursor.fetchall():
            cursor.execute(get_filters, (row[0],))

            for filter_row in cursor.fetchall():
                if debug:
                    print("Executing statement: " + add_filter_program, file=sys.stdout)
                    print("Values: " + str((tcga_program_id, filter_row[0],)), file=sys.stdout)

                    if filter_row[1] in ccle_attr:
                        print(filter_row[1] + " found in ccle_attr", file=sys.stdout)
                        print("Executing statement: " + insert_filter, file=sys.stdout)
                        print("Values: " + str((filter_row[1], filter_row[2], row[0], ccle_program_id,)), file=sys.stdout)
                else:

                    # First, apply TCGA as the program ID
                    cursor.execute(add_filter_program, (tcga_program_id, filter_row[0],))

                    # Then, check to see if CCLE has this attr and value - if yes, duplicate the filter to CCLE
                    if filter_row[1] in ccle_attr and filter_row[2] in ccle_attr[filter_row[1]]['values']:
                        cursor.execute(insert_filter, (filter_row[1], filter_row[2], row[0], ccle_program_id,))


    except Exception as e:
        print(traceback.format_exc(), file=sys.stdout)
    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


""" main """

def main():

    # To disable any of these by default, change the default to False
    cmd_line_parser = ArgumentParser(description="Script to migrate the database to the new multi-program format.")


    cmd_line_parser.add_argument('-b', '--debug-mode', type=bool, default=False,
                                 help="Don't execute statements, just print them with their paramter tuples.")

    cmd_line_parser.add_argument('-p', '--create-prog-proj', type=bool, default=False,
                                 help="Add the program and project entries to the Django tables.")

    cmd_line_parser.add_argument('-d', '--fix-case-id', type=bool, default=False,
                                 help="Add case barcodes to the cohorts_samples table for extent cohorts and fix CCLE barcodes (which have changed)")

    cmd_line_parser.add_argument('-c', '--fix-cohort-projects', type=bool, default=False,
                                 help="Fix any cohort entries to contain the correct project ID")

    cmd_line_parser.add_argument('-a', '--attr-displ-table', type=bool, default=False,
                                 help="Change the program IDs in the metadata attribute display table to this database's programs.")

    cmd_line_parser.add_argument('-f', '--fix_filters', type=bool, default=False,
                                 help="Fix the cohorts_filters table to reflect new, multiprogram cohorts")

    cmd_line_parser.add_argument('-g', '--fix_genes', type=bool, default=False,
                                 help="Fix the genes_genesymbols table to include a type setting and add in miRNAs")

    cmd_line_parser.add_argument('-v', '--fix_var_faves', type=bool, default=False,
                                 help="Fix the old variable favorites by setting their version to v1")

    cmd_line_parser.add_argument('-u', '--fix_user_data', type=bool, default=False,
                                 help="Fix previously uploaded user data tables to have the right column names")

    cmd_line_parser.add_argument('-db', '--database', type=str, default='test',
                                 help="Database to work on")

    args = cmd_line_parser.parse_args()

    try:
        args.create_prog_proj and create_programs_and_projects(args.debug_mode)
        args.fix_cohort_projects and fix_cohort_projects(args.debug_mode)
        args.attr_displ_table and update_attr_display_table(args.debug_mode)
        args.fix_case_id and fix_case_barcodes_in_cohorts(args.debug_mode)
        args.fix_filters and fix_filters(args.debug_mode)
        args.fix_genes and fix_gene_symbols(args.debug_mode)
        args.fix_var_faves and fix_var_faves(args.debug_mode)
        args.fix_user_data and fix_user_data_tables(args.debug_mode,args.database)

    except Exception as e:
        print(traceback.format_exc(), file=sys.stdout)

if __name__ == "__main__":
    main()