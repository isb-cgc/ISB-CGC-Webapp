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

# TODO: This isn't complete and isn't being called anywhere yet
def breakout_metadata_tables(cursor):
    create_ccle_metadata_data = 'CREATE TABLE CCLE_metadata_data SELECT * FROM metadata_data WHERE program_name="CCLE";'
    create_ccle_metadata_samples = 'CREATE TABLE CCLE_metadata_samples SELECT * FROM metadata_samples WHERE program_name="CCLE";'

    rename_metadata_tables = 'RENAME TABLE metadata_samples TO TCGA_metadata_samples,' \
                             '             metadata_data to TCGA_metadata_data;'

    try:
        cursor.execute(create_ccle_metadata_data)
        cursor.execute(create_ccle_metadata_samples)
        cursor.execute(rename_metadata_tables)
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