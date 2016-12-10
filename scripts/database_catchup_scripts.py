"""
Copyright 2016, Institute for Systems Biology
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

import os
import traceback
import sys
import time
from MySQLdb import connect, cursors
from GenespotRE import secret_settings
from argparse import ArgumentParser

SUPERUSER_NAME = 'isb'

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
        db = connect(host=db_settings['HOST'], port=db_settings['PORT'], db=db_settings['NAME'],
                     user=db_settings['USER'], passwd=db_settings['PASSWORD'], ssl=ssl)

    return db

"""                                    CATCHUP METHODS                                             """
""" Any methods added to the section which add or remove views, sprocs, functions, or tables MUST  """
""" double-check to make sure the alteration is necessary to avoid errors if the method is run     """
""" when the change wasn't needed! Eg. use 'CREATE OR REPLACE VIEW' or check for column existence. """

# Add the shortlist column to metadata_attributes ans set its value.
def catchup_shortlist(cursor):
    try:
        # Add the 'shortlist' column to metadata_attr and set it accordingly, if it's not already there
        cursor.execute("SHOW COLUMNS FROM metadata_attr;")
        shortlist_exists = False
        for row in cursor.fetchall():
            if row[0] == 'shortlist':
                shortlist_exists = True

        if not shortlist_exists:
            print >> sys.stdout, "[STATUS] metadata_attr.shortlist not found, adding..."
            cursor.execute("ALTER TABLE metadata_attr ADD COLUMN shortlist TINYINT NOT NULL DEFAULT 0;")
            set_metadata_shortlist_def = """
                UPDATE metadata_attr
                SET shortlist=1
                WHERE attribute IN ('age_at_initial_pathologic_diagnosis','BMI','disease_code','gender','has_27k','has_450k',
                  'has_BCGSC_GA_RNASeq','has_BCGSC_HiSeq_RNASeq','has_GA_miRNASeq','has_HiSeq_miRnaSeq',
                  'has_Illumina_DNASeq','has_RPPA','has_SNP6','has_UNC_GA_RNASeq','has_UNC_HiSeq_RNASeq',
                  'histological_type','hpv_status','icd_10','icd_o_3_histology','icd_o_3_site','neoplasm_histologic_grade',
                  'new_tumor_event_after_initial_treatment','pathologic_stage','person_neoplasm_cancer_status','program_name',
                  'residual_tumor','SampleTypeCode','tobacco_smoking_history','tumor_tissue_site','tumor_type',
                  'vital_status');
            """
            cursor.execute(set_metadata_shortlist_def)
    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when setting the metadata shortlist in metadata_attr; it may not have been made."
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()

# Create the view which lists all members of metadata_attributes with shortlist=1 (i.e. true).
def create_shortlist_view(cursor):
    try:
        # Create the metadata_shortlist view, which is our formal set of attributes displayed in the WebApp
        metadata_shortlist_view_def = """
            CREATE OR REPLACE VIEW metadata_shortlist AS
                SELECT attribute,code FROM metadata_attr WHERE shortlist=1;
        """
        cursor.execute(metadata_shortlist_view_def)
    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when creating the metadata shortlist view! It may not have been made."
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()

# Create the get_metadata_values stored procedure, which retrieves all the possible values of the metadata shortlist
# attributes found in metadata_samples.
#
# This stored procedure uses the metadata_shortlist view to determine what the members of the shortlist are
# and returns a series of result sets containing the complete value domain for those attributes which have
# categorical (i.e. non-continuous) values
def create_metadata_vals_sproc(cursor):
    try:
        metadata_vals_sproc_def = """
            CREATE PROCEDURE `get_metadata_values`()
                BEGIN
                    DECLARE done INT DEFAULT FALSE;
                    DECLARE col VARCHAR(128);
                    DECLARE attr_cur CURSOR FOR SELECT attribute FROM metadata_shortlist WHERE NOT(code='N');
                    DECLARE CONTINUE HANDLER FOR NOT FOUND
                    BEGIN
                      SET done = TRUE;
                    END;

                    OPEN attr_cur;

                    shortlist_loop: LOOP
                        FETCH attr_cur INTO col;
                        IF done THEN
                            LEAVE shortlist_loop;
                        END IF;
                        SET @s = CONCAT('SELECT DISTINCT ',col,' FROM metadata_samples;');
                        PREPARE get_vals FROM @s;
                        EXECUTE get_vals;
                    END LOOP;

                    CLOSE attr_cur;
                END"""

        cursor.execute("DROP PROCEDURE IF EXISTS `get_metadata_values`;")
        cursor.execute(metadata_vals_sproc_def)
    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when making the metadata values sproc; it may not have been made"
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()

# Create the metadata_samples_shortlist view, which acts as a smaller version of metadata_samples for use with the
# webapp.
#
# The primary view used by the WebApp to obtain data for counting and display, so we're not constantly
# dealing with all of metadata_samples
# *** THIS MUST BE RERUN ANY TIME AN ATTRIBUTE IS ADDED OR REMOVED FROM THE SHORTLIST ***
# *** OR THE SHORTLIST WILL NO LONGER BE ACCURATE ***
def create_samples_shortlist_view(cursor):
    try:
        # Base VIEW definition
        metadata_samples_shortlist_view_def = """
            CREATE OR REPLACE VIEW metadata_samples_shortlist AS
                SELECT sample_barcode,case_barcode%s FROM metadata_samples;
        """

        # Gather the metadata attribute 'shortlist' from metadata_attributes
        # and add it to the VIEW definition
        cursor.execute("SELECT attribute FROM metadata_attr WHERE shortlist=1;")
        view_cols = ''
        for row in cursor.fetchall():
            view_cols += ',' + row[0]

        cursor.execute(metadata_samples_shortlist_view_def % view_cols)
    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when creating the metadata_samples shortlist view; it may not have been made"
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()

# Cohorts made prior to the release of user data will have null values in their project IDs for each sample
# in the cohort. This script assumes that any sample with a null project ID is an ISB-CGC sample from metadata_samples
# and uses the value of the Study column to look up the appropriate ID in projects_project and apply it to the cohort
# *** This will need to be changed when metadata_samples.Study becomes 'disease code' and a project column is added ***
# *** which is an FK into the projects_project table                                                                ***

def fix_cohort_projects(cursor):
    try:
        null_project_count = """
            SELECT COUNT(*)
            FROM cohorts_samples cs
                    JOIN metadata_samples ms ON ms.sample_barcode = cs.sample_barcode
                    JOIN (
                        SELECT p.id AS id,p.name AS name
                        FROM projects_project p
                          JOIN auth_user au ON au.id = p.owner_id
                        WHERE au.username = 'isb' AND au.is_superuser = 1 AND au.is_active = 1 AND p.active = 1
                    ) ps ON ps.name = ms.disease_code
                    JOIN cohorts_cohort AS cc ON cc.id = cs.cohort_id
            where cs.project_id IS NULL AND cc.active = 1;
        """

        cursor.execute(null_project_count)
        count_to_fix = cursor.fetchall()[0][0]
        if count_to_fix > 0:
            fix_project_ids_str = """
                UPDATE cohorts_samples AS cs
                JOIN (
                        SELECT ms.sample_barcode AS sample_barcode,ps.id AS project
                                FROM metadata_samples ms
                                JOIN (
                                    SELECT p.id AS id,p.name AS name
                                    FROM projects_project p
                                        JOIN auth_user au ON au.id = p.owner_id
                                    WHERE au.username = 'isb' AND au.is_active = 1 AND p.active=1 AND au.is_superuser = 1
                                ) ps ON ps.name = ms.disease_code
                ) AS ss ON ss.sample_barcode = cs.sample_barcode
                JOIN cohorts_cohort AS cc
                ON cc.id = cs.cohort_id
                SET cs.project_id = ss.project
                WHERE cs.project_id IS NULL AND cc.active = 1;
            """

            print >> sys.stdout,"[STATUS] Number of cohort sample entries from ISB-CGC projects with null project IDs: "+str(count_to_fix)
            print >> sys.stdout,"[STATUS] Correcting null project IDs for ISB-CGC cohorts - this could take a while!"

            cursor.execute(fix_project_ids_str)

            print >> sys.stdout, "[STATUS] ...done. Checking for still-null project IDs..."

            cursor.execute(null_project_count)
            not_fixed = cursor.fetchall()[0][0]

            print >> sys.stdout, "[STATUS] Number of cohort sample entries from ISB-CGC projects with null project IDs after correction: " + str(not_fixed)
            if not_fixed > 0:
                print >> sys.stdout, "[WARNING] Some of the samples were not corrected! You should double-check them."
        else:
            print >> sys.stdout, "[STATUS] No cohort samples were found with missing project IDs."
    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when fixing cohort project IDs; they may not have been fiixed"
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()


# Add the stored procedure "get_tcga_project_set" which fetches the list of all program/project IDs which are owned by
# the ISB-CGC superuser
def add_isb_cgc_project_sproc(cursor):
    try:
        sproc_def = """
            CREATE PROCEDURE `get_isbcgc_project_set`()
            BEGIN
            SELECT ps.id
            FROM projects_project ps
                    JOIN auth_user au
                    ON au.id = ps.owner_id
            WHERE au.username = 'isb' and au.is_superuser = 1 AND au.is_active = 1 AND ps.active = 1;
            END
        """

        cursor.execute("DROP PROCEDURE IF EXISTS `get_isbcgc_project_set`;")
        cursor.execute(sproc_def)
    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when adding the get_isbcgc_project_set sproc set; it may not have been added"
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()


# Query to correct CCLE samples from fix_cohort_samples, because despite having specific 'Study' values all CCLE samples are
# part of a single CCLE project

def fix_ccle(cursor):

    try:
        cursor.execute("""
            SELECT ps.id
            FROM projects_project ps
              JOIN auth_user au ON au.id = ps.owner_id
            WHERE ps.name = 'CCLE' AND ps.active = 1 AND au.username = 'isb' AND au.is_active = 1 AND au.is_superuser = 1;
        """)

        results = cursor.fetchall()

        if len(results) <= 0:
            print >> sys.stdout, "[STATUS] The CCLE project was not found, so cohorts containing its samples cannot be fixed."
            return

        ccle_id = results[0][0]

        if not ccle_id:
            print >> sys.stdout, "[WARNING] The CCLE project was not found, so the cohorts with these samples cannot be corrected."
            return

        count_ccle_cohort_samples = """
            SELECT COUNT(*)
            FROM cohorts_samples cs
            JOIN cohorts_cohort cc
                ON cc.id = cs.cohort_id
            WHERE cc.active = 1 AND cs.sample_barcode LIKE 'CCLE%%' and NOT(cs.project_id = %s);
        """

        fix_ccle_cohorts = """
            UPDATE cohorts_samples AS cs
                JOIN cohorts_cohort cc
                    ON cc.id = cs.cohort_id
            SET cs.project_id = %s
            WHERE cc.active = 1 AND cs.sample_barcode LIKE 'CCLE%%';
        """

        cursor.execute(count_ccle_cohort_samples, (ccle_id,))

        results = cursor.fetchall()

        if len(results) <= 0:
            print >> sys.stdout, "[STATUS] No samples with CCLE project IDs which need fixing - exiting."
            return

        ccle_count = results[0][0]

        if ccle_count <= 0:
            print >> sys.stdout, "[STATUS] No samples with CCLE project IDs which need fixing - exiting."
            return

        print >> sys.stdout, "[STATUS] There are " + str(ccle_count) + " CCLE samples in the cohorts_samples table with an incorrect project ID. Fixing..."

        cursor.execute(fix_ccle_cohorts, (ccle_id,))

        cursor.execute(count_ccle_cohort_samples, (ccle_id,))

        ccle_new_count = cursor.fetchall()[0][0]
        if ccle_new_count > 0:
            print >> sys.stdout, "[WARNING] Some CCLE samples still have the wrong project ID - double-check your database. (count: " + str(ccle_count) + ")"

    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when fixing CCLE cohorts; they may not have been updated!"
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()


def alter_metadata_tables(cursor):
    print >> sys.stdout, "[STATUS] Altering and updating tables."

    alter_metadata_samples_check = '''
        SELECT EXISTS (select * from INFORMATION_SCHEMA.COLUMNS where table_schema='dev' and table_name='metadata_samples' and column_name='sample_barcode');
    '''
    alter_metadata_samples = '''
            ALTER TABLE metadata_samples change SampleBarcode sample_barcode VARCHAR(45),
                change ParticipantBarcode case_barcode VARCHAR(45),
                change Study disease_code VARCHAR(45),
                change Project program_name VARCHAR(40);
    '''

    # TODO: We need to add projects_project_id, based on Study
    alter_metadata_data = '''
            ALTER TABLE metadata_data change SampleBarcode sample_barcode VARCHAR(45),
                change ParticipantBarcode case_barcode VARCHAR(45),
                change Study disease_code VARCHAR(45),
                change Project program_name VARCHAR(40);
    '''

    # Change the names of numerous columns
    update_metadata_attr = """
        UPDATE metadata_attr SET attribute = CASE attribute
            WHEN 'Project' THEN 'program_name'
            WHEN 'SampleBarcode' THEN 'sample_barcode'
            WHEN 'ParticipantBarcode' THEN 'case_barcode'
            WHEN 'Disease_Code' THEN 'disease_code'
        END
        WHERE attribute IN ('Project','Study','SampleBarcode','ParticipantBarcode');
    """

    # Drop study from the table completely, since it will no longer be used this way
    update_metadata_attr_study = """
        DELETE FROM metadata_attr WHERE attribute='Study';
    """


    try:
        cursor.execute(alter_metadata_samples_check)
        result = cursor.fetchone()
        if not result[0]:
            cursor.execute(alter_metadata_samples)
            cursor.execute(alter_metadata_data)
            cursor.execute(update_metadata_attr)
            cursor.execute(update_metadata_attr_study)

    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when updating metadata_samples, attr, and data: "
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()

# This function will create new metadata_tables for TCGA and CCLE. The old tables will remain while we refactor other code.
# This should only be used on local development environments.
def breakout_metadata_tables(cursor, db):
    print >> sys.stdout, "[STATUS] Breaking out metadata tables."
    new_shortlist = ['age_at_initial_pathologic_diagnosis', 'Disease_Code', 'gender', 'histological_type', 'hpv_status',
                     'neoplasm_histologic_grade', 'pathologic_stage', 'person_neoplasm_cancer_status', 'residual_tumor',
                     'SampleTypeCode', 'tobacco_smoking_history', 'tumor_tissue_site', 'tumor_type', 'vital_status', 'bmi']
    delete_tables = 'DROP TABLE IF EXISTS CCLE_metadata_data, CCLE_metadata_samples, CCLE_metadata_attr, TCGA_metadata_data, ' \
                    '                     TCGA_metadata_samples, TCGA_metadata_attr;'
    create_ccle_metadata_data = 'CREATE TABLE CCLE_metadata_data SELECT * FROM metadata_data WHERE program_name="CCLE";'
    create_ccle_metadata_samples = 'CREATE TABLE CCLE_metadata_samples SELECT {0} FROM metadata_samples WHERE program_name="CCLE";'.format(','.join(new_shortlist))
    create_ccle_metadata_attr = 'CREATE TABLE CCLE_metadata_attr (tree_map TinyInt(4)) ' \
                                '  SELECT attribute, code, spec from metadata_attr where shortlist=1;'
    create_tcga_metadata_data = 'CREATE TABLE TCGA_metadata_data SELECT * FROM metadata_data WHERE program_name="TCGA";'
    create_tcga_metadata_samples = 'CREATE TABLE TCGA_metadata_samples SELECT {0} FROM metadata_samples WHERE program_name="TCGA";'.format(','.join(new_shortlist))
    create_tcga_metadata_attr = 'CREATE TABLE TCGA_metadata_attr (tree_map TinyInt(4)) ' \
                                '  SELECT attribute, code, spec from metadata_attr where shortlist=1;'

    remove_ccle_metadata_data = 'DELETE from metadata_data where program_name="CCLE"';
    remove_ccle_metadata_samples = 'DELETE from metadata_samples where program_name="CCLE"';

    rename_metadata_tables = 'RENAME TABLE metadata_samples TO TCGA_metadata_samples,' \
                             '             metadata_data to TCGA_metadata_data,' \
                             '             metadata_attr to TCGA_metadata_attr;'

    insert_into_public_data_table = 'INSERT INTO projects_public_data_tables (data_table, samples_table, attr_table, sample_data_availability_table, program_id) ' \
                                    'values("{data_table}", "{samples_table}", "{attr_table}", "{sample_data_availability_table}", {program_id});'
    get_tcga_program_id = 'SELECT id from projects_program where name="TCGA";'
    get_ccle_program_id = 'SELECT id from projects_program where name="CCLE";'

    try:
        cursor.execute(delete_tables)
        cursor.execute(create_ccle_metadata_data)
        cursor.execute(create_ccle_metadata_samples)
        cursor.execute(create_ccle_metadata_attr)
        cursor.execute(create_tcga_metadata_data)
        cursor.execute(create_tcga_metadata_samples)
        cursor.execute(create_tcga_metadata_attr)

        # cursor.execute(remove_ccle_metadata_data)
        # cursor.execute(remove_ccle_metadata_samples)
        # cursor.execute(rename_metadata_tables)

        cursor.execute(get_ccle_program_id)
        result = cursor.fetchone()
        if len(result):
            cursor.execute(insert_into_public_data_table.format(data_table='CCLE_metadata_data_table',
                                                                samples_table='CCLE_metadata_samples_table',
                                                                attr_table='CCLE_metadata_attr',
                                                                sample_data_availability_table='',
                                                                program_id=int(result[0])))
        else:
            print >> sys.stdout, "[WARNING] No CCLE program found."

        cursor.execute(get_tcga_program_id)
        result = cursor.fetchone()
        if len(result):
            cursor.execute(insert_into_public_data_table.format(data_table='TCGA_metadata_data_table',
                                                                samples_table='TCGA_metadata_samples_table',
                                                                attr_table='TCGA_metadata_attr',
                                                                sample_data_availability_table='',
                                                                program_id=int(result[0])))
        else:
            print >> sys.stdout, "[WARNING] No CCLE program found."

        db.commit()

    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception in breakout_metadata_tables!"
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()


# This only needs to be run on cloudSQL instances - Completed on MVM
def alter_user_data_tables(cursor):
    get_table_names = 'select distinct table_name from information_schema.columns where column_name="participant_barcode";'
    alter_table_column = 'ALTER TABLE {0} change participant_barcode case_barcode VARCHAR(200),' \
                         '                change study_id project_id int(10);'
    try:
        cursor.execute(get_table_names)
        alter_stmts = []
        for item in cursor.fetchall():
            alter_stmts.append(alter_table_column.format(item[0]))

        cursor.execute(''.join(alter_stmts))
    except Exception as e:
        print >> sys.stdout, "[ERROR] Exception when altering user_metadata_tables!"
        print >> sys.stdout, e
        print >> sys.stdout, traceback.format_exc()

# ALL THESE FUNCTIONS CAME FROM userdata_bootstrap.py.
# THEY ARE BEING CONSOLIDATED INTO THIS ONE FILE DUE TO RUNTIME ORDERING.
def create_study_views(project, source_table, studies):
    db = get_mysql_connection()
    cursor = db.cursor()

    study_names = {}
    view_check_sql = "SELECT COUNT(TABLE_NAME) FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = %s;"
    create_view_sql = "CREATE OR REPLACE VIEW %s AS SELECT * FROM %s"
    where_proj = " WHERE program_name=%s"
    where_study = " AND disease_code=%s;"

    try:
        for study in studies:
            view_name = "%s_%s_%s" % (project, study, source_table,)

            # If project and study are the same we assume this is meant to
            # be a one-study project
            make_view = (create_view_sql % (view_name, source_table,)) + where_proj
            params = (project,)

            if project == study:
                make_view += ";"
            else:
                make_view += where_study
                params += (study,)

            cursor.execute(make_view, params)

            cursor.execute(view_check_sql, (view_name,))
            if cursor.fetchall()[0][0] <= 0:
                raise Exception("Unable to create view '" + view_name + "'!")

            cursor.execute("SELECT COUNT(*) FROM %s;" % view_name)
            if cursor.fetchall()[0][0] <= 0:
                print >> sys.stdout, "Creation of view '"+view_name+"' was successful, but no entries are found in " + \
                    "it. Double-check the "+source_table+" table for valid entries."
            else:
                print >> sys.stdout, "Creation of view '" + view_name + "' was successful."

            study_names[study] = {"view_name": view_name, "project": project}

        return study_names

    except Exception as e:
        print >> sys.stderr, e
        print >> sys.stderr, traceback.format_exc()

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


def bootstrap_metadata_attr_mapping():

    db = get_mysql_connection()
    cursor = db.cursor()

    table_check_sql = "SELECT COUNT(TABLE_NAME) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = %s;"

    make_mapping_table = """
      CREATE TABLE metadata_attr_map (
        metadata_attr_name VARCHAR(100), source_attr VARCHAR(100),coalesced_attr VARCHAR(100),
        CONSTRAINT u_attrSrcCoal UNIQUE (metadata_attr_name,source_attr,coalesced_attr)
      );
    """

    insert_mapping_vals = """
        INSERT INTO metadata_attr_map (metadata_attr_name,source_attr,coalesced_attr) VALUES(%s,%s,%s);
    """

    test_map_creation = """
        SELECT * FROM metadata_attr_map;
    """

    value_maps = [
        ('tumor_tissue_site', 'central_nervous_system', 'Central nervous system',),
        ('histological_type', 'leiomyosarcoma', 'Leiomyosarcoma (LMS)',),
        ('histological_type', 'medullary_carcinoma', 'Medullary Carcinoma',),
        ('histological_type', 'metaplastic_carcinoma', 'Metaplastic Carcinoma',),
    ]

    try:

        cursor.execute(table_check_sql, ('metadata_attr_map',))

        found_map_table = (cursor.fetchall()[0][0] <= 0)

        if found_map_table:
            print >> sys.stdout, "[STATUS] metadata_attr_map table found."
        else:
            print >> sys.stdout, "Building attribute mapping table..."

            cursor.execute(make_mapping_table)
            db.commit()

            for map in value_maps:
                cursor.execute(insert_mapping_vals,map)

            db.commit()

            cursor.execute(test_map_creation)

            entries = 0

            for row in cursor.fetchall():
                entries += 1

            if entries <= 0:
                raise Exception("metadata_attr mapping not successfully generated!")
            else:
                print >> sys.stdout, "metadata_attr mapping table successfully generated."

    except Exception as e:
        print >> sys.stderr, e
        print >> sys.stderr, traceback.format_exc()

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


def bootstrap_user_data_schema(public_feature_table, big_query_dataset, bucket_name, bucket_permissions, bqdataset_name):
    fetch_studies = "SELECT DISTINCT disease_code FROM metadata_samples WHERE program_name='TCGA';"
    insert_projects = "INSERT INTO projects_program (name, active, last_date_saved, is_public, owner_id) " + \
                      "VALUES (%s,%s,%s,%s,%s);"
    insert_studies = "INSERT INTO projects_project (name, active, last_date_saved, owner_id, program_id) " + \
                     "VALUES (%s,%s,%s,%s,%s);"
    insert_googleproj = "INSERT INTO accounts_googleproject (project_id, project_name, big_query_dataset) " + \
                        "VALUES (%s,%s,%s);"
    insert_googleproj_user = "INSERT INTO accounts_googleproject_user (user_id, googleproject_id)" \
                             "VALUES (%s,%s);"
    get_googleproj_id = "SELECT id from accounts_googleproject where id=%s;"
    insert_bucket = "INSERT INTO accounts_bucket (bucket_name, bucket_permissions, google_project_id) VALUES (%s, %s, %s);"
    insert_bqdataset = "INSERT INTO accounts_bqdataset (dataset_name, google_project_id) VALUES (%s, %s);"
    insert_user_data_tables = "INSERT INTO projects_user_data_tables (project_id, user_id, google_project_id, " + \
                              "google_bucket_id, metadata_data_table, metadata_samples_table, " + \
                              "feature_definition_table, google_bq_dataset_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s);"
    googleproj_name = "isb-cgc"
    tables = ['metadata_samples', 'metadata_data']

    studies = {}
    isb_userid = None
    table_study_data = {}
    study_table_views = None
    project_info = {}
    study_info = {}
    googleproj_id = None
    bucket_id = None
    bqdataset_id = None

    try:

        db = get_mysql_connection()
        cursor = db.cursor()
        cursorDict = db.cursor(cursors.DictCursor)

        cursor.execute("SELECT id FROM auth_user WHERE username = %s;", (SUPERUSER_NAME,))

        for row in cursor.fetchall():
            isb_userid = row[0]

        if isb_userid is None:
            raise Exception("Couldn't retrieve ID for isb user!")

        # Add the projects to the project table and store their generated IDs
        insertTime = time.strftime('%Y-%m-%d %H:%M:%S')

        cursor.execute(insert_projects, ("TCGA", True, insertTime, True, isb_userid,))
        cursor.execute(insert_projects, ("CCLE", True, insertTime, True, isb_userid,))
        cursor.execute(insert_googleproj, ("isb-cgc", googleproj_name, big_query_dataset,))

        db.commit()

        cursor.execute("SELECT id FROM accounts_googleproject WHERE project_name=%s;", (googleproj_name,))
        for row in cursor.fetchall():
            googleproj_id = row[0]

        cursor.execute(insert_googleproj_user, (isb_userid, googleproj_id))
        cursor.execute(insert_bucket, (bucket_name, bucket_permissions, googleproj_id,))
        db.commit()

        cursorDict.execute("SELECT name, id FROM projects_program;")
        for row in cursorDict.fetchall():
            project_info[row['name']] = row['id']


        cursor.execute("SELECT id FROM accounts_bucket WHERE bucket_name=%s;", (bucket_name,))
        for row in cursor.fetchall():
            bucket_id = row[0]

        cursor.execute(insert_bqdataset, (bqdataset_name, googleproj_id))
        db.commit()
        cursor.execute("SELECT id FROM accounts_bqdataset WHERE dataset_name=%s;", (bqdataset_name,))
        for row in cursor.fetchall():
            bqdataset_id = row[0]

        # Gather up the TCGA studies from the samples table
        cursor.execute(fetch_studies)
        for row in cursor.fetchall():
            if row[0] not in studies:
                studies[row[0]] = 1

        # Make the views
        for table in tables:
            study_table_views = create_study_views("TCGA", table, studies.keys())
            # Make CCLE and add it in manually
            ccle_view = create_study_views("CCLE", table, ["CCLE"])
            study_table_views["CCLE"] = ccle_view["CCLE"]

            table_study_data[table] = study_table_views

        # Add the studies to the study table and store their generated IDs
        for study in study_table_views:
            cursor.execute(insert_studies, (study, True, insertTime, isb_userid,
                                            project_info[study_table_views[study]['project']],))
        db.commit()

        cursorDict.execute("SELECT name, id FROM projects_project;")
        for row in cursorDict.fetchall():
            study_info[row['name']] = row['id']

        # Add the study views to the user_data_tables table
        for study in study_table_views:
            cursor.execute(insert_user_data_tables, (study_info[study], isb_userid, googleproj_id, bucket_id,
                                                     table_study_data['metadata_data'][study]['view_name'],
                                                     table_study_data['metadata_samples'][study]['view_name'],
                                                     public_feature_table, bqdataset_id))
        db.commit()

        # Compare the number of studies in projects_user_data_tables, projects_project, and our study set.
        # If they don't match, something might be wrong.
        study_count = 0
        study_udt_count = 0
        metadata_samples_study_count = len(studies.keys()) + (1 if "CCLE" not in studies.keys() else 0)

        cursor.execute("SELECT COUNT(DISTINCT id) FROM projects_project;")
        study_count = cursor.fetchall()[0][0]

        cursor.execute("SELECT COUNT(DISTINCT project_id) FROM projects_user_data_tables;")
        study_udt_count = cursor.fetchall()[0][0]

        if study_udt_count == study_count == metadata_samples_study_count:
            if study_udt_count <= 0:
                print >> sys.stdout, "[ERROR] No studies found! Double-check the creation script and databse settings."
            else:
                print >> sys.stdout, "[STATUS] Programs and studies appear to have been created successfully: " + \
                      study_count.__str__()+" studies added."
        else:
            print >> sys.stdout, "[WARNING] Unequal number of studies between metadata_samples, projects_project, and " + \
                    "projects_user_data_tables. projects_project: "+study_count.__str__()+", " + \
                    "projects_user_data_tables: " + study_udt_count.__str__()+", metadata_samples: " + \
                  metadata_samples_study_count.__str__()

    except Exception as e:
        print >> sys.stderr, e
        print >> sys.stderr, traceback.format_exc()

    finally:
        if cursor: cursor.close
        if cursorDict: cursorDict.close()
        if db and db.open: db.close

def bootstrap_file_data():
    print >> sys.stdout, 'Populating filelistings...'

    DCC_BUCKET = ''
    CGHUB_BUCKET = ''
    CCLE_BUCKET = ''
    insert_userupload = "INSERT INTO data_upload_userupload (status, `key`, owner_id) values ('complete', '', %s);"
    insert_useruploadedfile_TCGA = "INSERT INTO data_upload_useruploadedfile (upload_id, bucket, file) " \
                                   "SELECT %s,%s,datafilenamekey from metadata_data " \
                                   "    where datafileuploaded='true' and datafilenamekey!='' and disease_code=%s and repository=%s;"
    insert_useruploadedfile_CCLE = "INSERT INTO data_upload_useruploadedfile (upload_id, bucket, file) " \
                                   "SELECT %s,%s,datafilenamekey from metadata_data " \
                                   "    where datafileuploaded='true' and datafilenamekey!='' and program_name=%s;"

    update_projects_project = "UPDATE projects_user_data_tables set data_upload_id=%s where project_id=%s;"
    get_projects = "SELECT * FROM projects_project;"
    get_last_userupload = "SELECT * FROM data_upload_userupload order by id desc limit 1;"

    try:
        db = get_mysql_connection()
        cursor = db.cursor()
        cursorDict = db.cursor(cursors.DictCursor)

        cursorDict.execute(get_projects)
        for project in cursorDict.fetchall():

            # Create UserUpload entry
            cursor.execute(insert_userupload, (int(project['owner_id']),))

            # Get UserUpload Entries
            cursor.execute(get_last_userupload)
            last_userupload = cursor.fetchone()

            # Update the projects_project table with new upload id
            cursor.execute(update_projects_project, (last_userupload[0], project['id']))


            if project['name'] != 'CCLE': # TCGA

                # Create array of values to execute
                useruploadedfile_values = []  # [upload_id, bucket, study_name, repository]
                useruploadedfile_values.append([last_userupload[0], DCC_BUCKET, project['name'], 'DCC'])
                useruploadedfile_values.append([last_userupload[0], CGHUB_BUCKET, project['name'], 'CGHUB'])

                # Create UserUploadedFile for the project
                cursor.executemany(insert_useruploadedfile_TCGA, useruploadedfile_values)
            else: # CCLE

                # Create UserUploadedFile for the project
                cursor.execute(insert_useruploadedfile_CCLE, (last_userupload[0], CCLE_BUCKET, project['name'],))

            db.commit()



        # Create UserUploadedFile for each project
    except Exception as e:
        print >> sys.stderr, e
    finally:
        if cursor: cursor.close()
        if cursorDict: cursorDict.close()
        if db and db.open: db.close()


""" main """

def main():

    # To disable any of these by default, change the default to False
    cmd_line_parser = ArgumentParser(description="Script to catch up a database to current deployment needs.")
    cmd_line_parser.add_argument('-l', '--catchup-shortlist', type=bool, default=True,
                                 help="Add the shortlist column to metadata_attributes ans set its value.")
    cmd_line_parser.add_argument('-v', '--create-shortlist-view', type=bool, default=True,
                                 help="Create the view which lists all members of metadata_attributes with shortlist=1 (i.e. true).")
    cmd_line_parser.add_argument('-s', '--create-metadata-vals-sproc', type=bool, default=True,
                                 help="Create the get_metadata_values stored procedure, which retrieves all the possible values of the metadata shortlist attributes found in metadata_samples.")
    cmd_line_parser.add_argument('-m', '--create-ms-shortlist-view', type=bool, default=True,
                                 help="Create the metadata_samples_shortlist view, which acts as a smaller version of metadata_samples for use with the webapp.")
    cmd_line_parser.add_argument('-b', '--fix-bmi-case', type=bool, default=True,
                                 help="Fix the casing of the attribute value for the BMI row in metadata_attributes.")
    cmd_line_parser.add_argument('-c', '--fix-cohort-projects', type=bool, default=True,
                                 help="Fix cohorts which have null project IDs for ISB-CGC samples")
    cmd_line_parser.add_argument('-e', '--fix-ccle-cohort-projects', type=bool, default=True,
                                 help="Fix project IDs for CCLE samples in cohorts")
    cmd_line_parser.add_argument('-i', '--create-isbcgc-project-set-sproc', type=bool, default=True,
                                 help="Add the 'get_isbcgc_project_set' sproc to the database")
    cmd_line_parser.add_argument('-a', '--alter-metadata-tables', type=bool, default=True,
                                 help="Alter metadata tables to align with updated metadata tables")
    cmd_line_parser.add_argument('-r', '--breakout-metadata-tables', type=bool, default=True,
                                 help="Generate new program specific metadata tables based on the original metadata tables")
    cmd_line_parser.add_argument('-p', '--pub-feat-table', type=str, default='Public_Feature_Table',
                                 help="Public features table for projects_user_data_tables entries")

    # From userdata_bootstrap
    cmd_line_parser.add_argument('-q', '--bq-dataset', type=str, default='tcga_data_open',
                                 help="BigQuery dataset for this Google Project")
    cmd_line_parser.add_argument('-u', '--bucket-name', type=str, default='isb-cgc-dev',
                                 help="Name of the bucket the source data came from")
    cmd_line_parser.add_argument('-k', '--bucket-perm', type=str, default='read/write',
                                 help="Bucket access permissions")
    cmd_line_parser.add_argument('-d', '--bq-dataset-storage', type=str, default='test',
                                 help="BigQuery Dataset for TCGA Project Data")



    args = cmd_line_parser.parse_args()

    db = get_mysql_connection()
    cursor = db.cursor()

    try:
        args.alter_metadata_tables and alter_metadata_tables(cursor)
        args.catchup_shortlist and catchup_shortlist(cursor)
        args.create_shortlist_view and create_shortlist_view(cursor)
        args.create_metadata_vals_sproc and create_metadata_vals_sproc(cursor)
        args.create_ms_shortlist_view and create_samples_shortlist_view(cursor)
        args.fix_cohort_projects and fix_cohort_projects(cursor)
        args.fix_ccle_cohort_projects and fix_ccle(cursor)
        args.create_isbcgc_project_set_sproc and add_isb_cgc_project_sproc(cursor)

        # From userdata_bootstrap.py
        bootstrap_user_data_schema(args.pub_feat_table, args.bq_dataset, args.bucket_name, args.bucket_perm,
                                   args.bq_dataset_storage)
        bootstrap_metadata_attr_mapping()
        bootstrap_file_data()

        args.breakout_metadata_tables and breakout_metadata_tables(cursor, db)


        # Until we have a new sql dump, we need to manually update changed columns
        args.fix_bmi_case and cursor.execute("UPDATE metadata_attr SET attribute='BMI' WHERE attribute='bmi';")

    except Exception as e:
        print e
        print traceback.format_exc()

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()

if __name__ == "__main__":
    main()