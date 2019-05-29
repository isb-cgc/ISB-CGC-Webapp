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
import traceback
import sys
import time
from MySQLdb import connect, cursors
from GenespotRE import secret_settings, settings
from argparse import ArgumentParser

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

"""                                    CATCHUP METHODS                                             """
""" Any methods added to the section which add or remove views, sprocs, functions, or tables MUST  """
""" double-check to make sure the alteration is necessary to avoid errors if the method is run     """
""" when the change wasn't needed! Eg. use 'CREATE OR REPLACE VIEW' or check for column existence. """

# Add the shortlist column to metadata_attributes and set its value.
# As of data migration all columns in a given program's metadata_attr will by default be the shortlist,
# but we need this for now to construct those tables
def catchup_shortlist(cursor):
    try:
        # Add the 'shortlist' column to metadata_attr and set it accordingly, if it's not already there
        cursor.execute("SHOW COLUMNS FROM metadata_attr;")
        shortlist_exists = False
        for row in cursor.fetchall():
            if row[0] == 'shortlist':
                shortlist_exists = True

        if not shortlist_exists:
            print("[STATUS] metadata_attr.shortlist not found, adding...", file=sys.stdout)
            cursor.execute("ALTER TABLE metadata_attr ADD COLUMN shortlist TINYINT NOT NULL DEFAULT 0;")
            set_metadata_shortlist_def = """
                UPDATE metadata_attr
                SET shortlist=1
                WHERE attribute IN ('age_at_initial_pathologic_diagnosis','BMI','disease_code','gender',
                  'histological_type','hpv_status','neoplasm_histologic_grade',
                  'new_tumor_event_after_initial_treatment','pathologic_stage','person_neoplasm_cancer_status','program_name',
                  'residual_tumor','SampleTypeCode','tobacco_smoking_history','tumor_tissue_site','tumor_type',
                  'vital_status');
            """
            cursor.execute(set_metadata_shortlist_def)
    except Exception as e:
        print("[ERROR] Exception when setting the metadata shortlist in metadata_attr; it may not have been made.", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)

# *** DEPRECATED ***
# Create the view which lists all members of metadata_attributes with shortlist=1 (i.e. true).
# As of data migration this is no longer needed as we only store the 'shortlisted' columns in the webapp
def create_shortlist_view(cursor):
    try:
        # Create the metadata_shortlist view, which is our formal set of attributes displayed in the WebApp
        metadata_shortlist_view_def = """
            CREATE OR REPLACE VIEW metadata_shortlist AS
                SELECT attribute,code FROM metadata_attr WHERE shortlist=1;
        """
        cursor.execute(metadata_shortlist_view_def)
    except Exception as e:
        print("[ERROR] Exception when creating the metadata shortlist view! It may not have been made.", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)
# *** DEPRECATED ***

# Create the get_metadata_values stored procedure, which retrieves all the possible values of the metadata shortlist
# attributes found in metadata_samples.
#
# This stored procedure uses the metadata_shortlist view to determine what the members of the shortlist are
# and returns a series of result sets containing the complete value domain for those attributes which have
# categorical (i.e. non-continuous) values
def create_metadata_vals_sproc(cursor):
    try:
        metadata_vals_sproc_def = """
            CREATE PROCEDURE `get_metadata_values`(IN pid INT)
                BEGIN
                    DECLARE samples_table_var VARCHAR(100);
                    DECLARE attr_table_var VARCHAR(100);
                    DECLARE done INT DEFAULT FALSE;
                    DECLARE col VARCHAR(128);
                    DECLARE attr_cur CURSOR FOR SELECT attribute FROM tmp_attr_view;
                    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

                    SELECT samples_table into samples_table_var from projects_public_data_tables where program_id=pid;
                    SELECT attr_table into attr_table_var from projects_public_data_tables where program_id=pid;
                    set @attr = CONCAT('CREATE OR REPLACE VIEW tmp_attr_view as SELECT attribute FROM ', attr_table_var,' WHERE NOT(code="N");');

                    PREPARE stmt from @attr;
                    EXECUTE stmt;
                    DEALLOCATE PREPARE stmt;

                    OPEN attr_cur;

                    shortlist_loop: LOOP
                        FETCH attr_cur INTO col;
                        IF done THEN
                            LEAVE shortlist_loop;
                        END IF;
                        SET @s = CONCAT('SELECT DISTINCT ',col,' FROM ',samples_table_var,';');
                        PREPARE get_vals FROM @s;
                        EXECUTE get_vals;
                    END LOOP shortlist_loop;

                    CLOSE attr_cur;

                    DROP VIEW IF EXISTS tmp_attr_view;
                END"""

        cursor.execute("DROP PROCEDURE IF EXISTS `get_metadata_values`;")
        cursor.execute(metadata_vals_sproc_def)

    except Exception as e:
        print("[ERROR] Exception when making the metadata values sproc; it may not have been made!", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)

# Create the get_metadata_values stored procedure, which retrieves all the possible values of the attributes found in
# metadata_samples for the indicated program.
#
# This stored procedure uses the projects_public_data_tables table to determine the name of the program's attribute
# table
def create_program_attr_sproc(cursor):
    try:
        program_attr_sproc_def = """
            CREATE PROCEDURE get_program_attr(IN pid INT)
              BEGIN
                  DECLARE prog_attr_table VARCHAR(100);

                  SELECT pdt.attr_table INTO prog_attr_table FROM projects_public_data_tables pdt WHERE pdt.program_id = pid;

                  SET @sel = CONCAT('SELECT attribute, code FROM ',prog_attr_table,';');
                  PREPARE selstmt FROM @sel; EXECUTE selstmt;
                  DEALLOCATE PREPARE selstmt;
              END
        """

        cursor.execute("DROP PROCEDURE IF EXISTS `get_program_attr`;")
        cursor.execute(program_attr_sproc_def)

    except Exception as e:
        print("[ERROR] Exception when making the metadata attr sproc; it may not have been made!", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)


def create_program_display_sproc(cursor):
    try:
        prog_displ_sproc_def = """
            CREATE PROCEDURE get_program_display_strings(IN pid INT)
              BEGIN
                SELECT attr_name,value_name,display_string FROM attr_value_display WHERE (program_id IS NULL AND pid<0) OR (program_id = pid);
              END
        """

        cursor.execute("DROP PROCEDURE IF EXISTS `get_program_display_strings`;")
        cursor.execute(prog_displ_sproc_def)

    except Exception as e:
        print("[ERROR] Exception when making the program display atring sproc; it may not have been made!", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)


# Create the display-string storage table for attributes and their values which are not displayed as they're stored in the database,
# eg. Sample Type Code, Smoking History. The attribute is always required (to associate the correct display string for a value), but
# if this is a display string for an attribute value_name can be null. Program ID is optional, to allow for different programs to have
# different display values.
def make_attr_display_table(cursor, db):
    try:
        table_create_statement = """
            CREATE TABLE IF NOT EXISTS attr_value_display (
              attr_name VARCHAR(100) NOT NULL, value_name VARCHAR(100), display_string VARCHAR(256) NOT NULL, preformatted TINYINT(1) DEFAULT 1 NOT NULL, program_id INT
            );
        """

        cursor.execute(table_create_statement)

        # some test values - will replace with actual LOAD INTO at a later time
        insert_statement = """
            INSERT INTO attr_value_display(attr_name,value_name,display_string,program_id) VALUES(%s,%s,%s,%s)
        """

        # get the ISB superuser ID
        cursor.execute("""
            SELECT id
            FROM auth_user
            WHERE username = 'isb' AND is_superuser = 1 AND is_active = 1
        """)

        suid = cursor.fetchall()[0][0]

        public_program_ids = []

        # get the public program IDs
        cursor.execute("""
            SELECT id
            FROM projects_program
            WHERE owner_id = %s AND is_public = 1 AND active = 1
        """, (suid,))

        for row in cursor.fetchall():
            public_program_ids.append(row[0])

        displs = {
            'BMI': {
                'underweight': 'Underweight: BMI less than 18.5',
                'normal weight': 'Normal weight: BMI is 18.5 - 24.9',
                'overweight': 'Overweight: BMI is 25 - 29.9',
                'obese': 'Obese: BMI is 30 or more',
            },
            'SampleTypeCode': {
                '01': 'Primary Solid Tumor',
                '02': 'Recurrent Solid Tumor',
                '03': 'Primary Blood Derived Cancer - Peripheral Blood',
                '04': 'Recurrent Blood Derived Cancer - Bone Marrow',
                '05': 'Additional - New Primary',
                '06': 'Metastatic',
                '07': 'Additional Metastatic',
                '08': 'Human Tumor Original Cells',
                '09': 'Primary Blood Derived Cancer - Bone Marrow',
                '10': 'Blood Derived Normal',
                '11': 'Solid Tissue Normal',
                '12': 'Buccal Cell Normal',
                '13': 'EBV Immortalized Normal',
                '14': 'Bone Marrow Normal',
                '20': 'Control Analyte',
                '40': 'Recurrent Blood Derived Cancer - Peripheral Blood',
                '50': 'Cell Lines',
                '60': 'Primary Xenograft Tissue',
                '61': 'Cell Line Derived Xenograft Tissue',
                'None': 'NA',
            },
            'tobacco_smoking_history': {
                '1': 'Lifelong Non-smoker',
                '2': 'Current Smoker',
                '3': 'Current Reformed Smoker for > 15 years',
                '4': 'Current Reformed Smoker for <= 15 years',
                '5': 'Current Reformed Smoker, Duration Not Specified',
                '6': 'Smoker at Diagnosis',
                '7': 'Smoking History Not Documented',
                'None': 'NA',
            },
            'somatic_mutation': {
                'Missense_Mutation': 'Missense Mutation',
                'Frame_Shift_Del': 'Frame Shift - Deletion',
                'Frame_Shift_Ins': 'Frame Shift - Insertion',
                'De_novo_Start_OutOfFrame': 'De novo Start Out of Frame',
                'De_novo_Start_InFrame': 'De novo Start In Frame',
                'In_Frame_Del': 'In Frame Deletion',
                'In_Frame_Ins': 'In Frame Insertion',
                'Nonsense_Mutation': 'Nonsense Mutation',
                'Start_Codon_SNP': 'Start Codon - SNP',
                'Start_Codon_Del': 'Start Codon - Deletion',
                'Start_Codon_Ins': 'Start Codon - Insertion',
                'Stop_Codon_Del': 'Stop Codon - Deletion',
                'Stop_Codon_Ins': 'Stop Codon - Insertion',
                'Nonstop_Mutation': 'Nonstop Mutation',
                'Silent': 'Silent',
                'RNA': 'RNA',
                'Intron': 'Intron',
                'lincRNA': 'lincRNA',
                'Splice_Site': 'Splice Site',
                "3'UTR": '3\' UTR',
                "5'UTR": '5\' UTR',
                'IGR': 'IGR',
                "5'Flank": '5\' Flank',
            }
        }

        for pid in public_program_ids:
            for attr in displs:
                for val in displs[attr]:
                    vals = (attr,val,displs[attr][val],pid,)
                    cursor.execute(insert_statement,vals)

            vals = ('tobacco_smoking_history',None,'Tobacco Smoking History',pid,)
            cursor.execute(insert_statement,vals)
            vals = ('SampleTypeCode', None, 'Sample Type', pid,)
            cursor.execute(insert_statement, vals)
            vals = ('hpv_status', None, 'HPV Status', pid,)
            cursor.execute(insert_statement, vals)

        db.commit()

    except Exception as e:
        print("[ERROR] Exception when adding the attr_value_display table - it may not have been properly generated!", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)


# *** DEPRECATED ***
# Create the metadata_samples_shortlist view, which acts as a smaller version of metadata_samples for use with the
# webapp.
#
# Note that as of data migration this view is deprecated due to each program's metadata_samples table only containing
# the shortlisted attributes
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
        print("[ERROR] Exception when creating the metadata_samples shortlist view; it may not have been made", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)
# *** DEPRECATED ***


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
                                    WHERE au.username = 'isb' AND au.is_active=1 AND p.active=1 AND au.is_superuser=1
                                ) ps ON ps.name = ms.disease_code
                ) AS ss ON ss.sample_barcode = cs.sample_barcode
                JOIN cohorts_cohort AS cc
                ON cc.id = cs.cohort_id
                SET cs.project_id = ss.project
                WHERE cs.project_id IS NULL AND cc.active = 1;
            """

            print("[STATUS] Number of cohort sample entries from ISB-CGC projects with null project IDs: "+str(count_to_fix), file=sys.stdout)
            print("[STATUS] Correcting null project IDs for ISB-CGC cohorts - this could take a while!", file=sys.stdout)

            cursor.execute(fix_project_ids_str)

            print("[STATUS] ...done. Checking for still-null project IDs...", file=sys.stdout)

            cursor.execute(null_project_count)
            not_fixed = cursor.fetchall()[0][0]

            print("[STATUS] Number of cohort sample entries from ISB-CGC projects with null project IDs after correction: " + str(not_fixed), file=sys.stdout)
            if not_fixed > 0:
                print("[WARNING] Some of the samples were not corrected! You should double-check them.", file=sys.stdout)
        else:
            print("[STATUS] No cohort samples were found with missing project IDs.", file=sys.stdout)
    except Exception as e:
        print("[ERROR] Exception when fixing cohort project IDs; they may not have been fiixed", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)


# Add the stored procedure "get_isbcgc_project_set" which fetches the list of all program/project IDs which are owned by
# the ISB-CGC superuser
def add_isb_cgc_project_sproc(cursor):
    try:
        sproc_def = """
            CREATE PROCEDURE `get_isbcgc_project_set`()
                BEGIN
                SELECT pp.id
                FROM projects_project pp
                        JOIN auth_user au
                        ON au.id = pp.owner_id
                WHERE au.username = 'isb' and au.is_superuser = 1 AND au.is_active = 1 AND pp.active = 1;
                END
        """

        cursor.execute("DROP PROCEDURE IF EXISTS `get_isbcgc_project_set`;")
        cursor.execute(sproc_def)
    except Exception as e:
        print("[ERROR] Exception when adding the get_isbcgc_project_set sproc set; it may not have been added", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)


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
            print("[STATUS] The CCLE project was not found, so cohorts containing its samples cannot be fixed.", file=sys.stdout)
            return

        ccle_id = results[0][0]

        if not ccle_id:
            print("[WARNING] The CCLE project was not found, so the cohorts with these samples cannot be corrected.", file=sys.stdout)
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
            print("[STATUS] No samples with CCLE project IDs which need fixing - exiting.", file=sys.stdout)
            return

        ccle_count = results[0][0]

        if ccle_count <= 0:
            print("[STATUS] No samples with CCLE project IDs which need fixing - exiting.", file=sys.stdout)
            return

        print("[STATUS] There are " + str(ccle_count) + " CCLE samples in the cohorts_samples table with an incorrect project ID. Fixing...", file=sys.stdout)

        cursor.execute(fix_ccle_cohorts, (ccle_id,))

        cursor.execute(count_ccle_cohort_samples, (ccle_id,))

        ccle_new_count = cursor.fetchall()[0][0]
        if ccle_new_count > 0:
            print("[WARNING] Some CCLE samples still have the wrong project ID - double-check your database. (count: " + str(ccle_count) + ")", file=sys.stdout)

    except Exception as e:
        print("[ERROR] Exception when fixing CCLE cohorts; they may not have been updated!", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)


def alter_metadata_tables(cursor):
    print("[STATUS] Altering and updating tables.", file=sys.stdout)

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
    update_metadata_attr_project = """
        DELETE FROM metadata_attr WHERE attribute='Study';
    """

    try:
        cursor.execute(alter_metadata_samples_check)
        result = cursor.fetchone()
        if not result[0]:
            cursor.execute(alter_metadata_samples)
            cursor.execute(alter_metadata_data)
            cursor.execute(update_metadata_attr)
            cursor.execute(update_metadata_attr_project)

    except Exception as e:
        print("[ERROR] Exception when updating metadata_samples, attr, and data: ", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)


# This function will create new metadata_tables for TCGA and CCLE. The old tables will remain while we refactor other code.
# This should only be used on local development environments.
def breakout_metadata_tables(cursor, db):
    print("[STATUS] Breaking out metadata tables.", file=sys.stdout)

    new_shortlist = ['age_at_initial_pathologic_diagnosis', 'country', 'ethnicity', 'menopause_status', 'race',
        'disease_code', 'gender', 'histological_type', 'hpv_status', 'neoplasm_histologic_grade', 'pathologic_stage',
        'person_neoplasm_cancer_status', 'residual_tumor','SampleTypeCode', 'tobacco_smoking_history',
        'tumor_tissue_site', 'tumor_type', 'vital_status', 'BMI', ]

    col_to_drop = []

    cursor.execute("SELECT column_name FROM INFORMATION_SCHEMA.columns WHERE table_name = 'metadata_samples';")

    for row in cursor.fetchall():
        if row[0] not in new_shortlist and not '_barcode' in row[0] and not '_id' in row[0]:
            col_to_drop.append(row[0])

    delete_tables = 'DROP TABLE IF EXISTS CCLE_metadata_data_HG19, CCLE_metadata_samples, CCLE_metadata_attr, TCGA_metadata_data_HG19, TCGA_metadata_samples, TCGA_metadata_attr;'

    create_ccle_metadata_data = 'CREATE TABLE CCLE_metadata_data_HG19 LIKE metadata_data;'
    ccle_metadata_data_insertion = 'INSERT INTO CCLE_metadata_data_HG19 SELECT * FROM metadata_data WHERE program_name="CCLE";'

    create_ccle_metadata_samples = 'CREATE TABLE CCLE_metadata_samples LIKE metadata_samples;'
    ccle_metadata_samples_insertion = 'INSERT INTO CCLE_metadata_samples SELECT * FROM metadata_samples WHERE program_name="CCLE";'
    alter_ccle_metadata_samples = 'ALTER TABLE CCLE_metadata_samples DROP {0};'.format(', DROP '.join(col_to_drop))

    create_ccle_metadata_attr = 'CREATE TABLE CCLE_metadata_attr LIKE metadata_attr;'
    alter_ccle_metadata_attr_ds = 'ALTER TABLE CCLE_metadata_attr DROP COLUMN shortlist;'
    ccle_metadata_attr_insertion = 'INSERT INTO CCLE_metadata_attr SELECT attribute, code, spec from metadata_attr where shortlist=1 and attribute in ("{0}");'.format('","'.join(new_shortlist))
    alter_ccle_metadata_attr_id = 'ALTER TABLE CCLE_metadata_attr ADD COLUMN id INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);'

    cursor.execute('SELECT * FROM metadata_attr WHERE attribute IS NULL;')
    res = cursor.fetchall()
    if len(res) > 0:
        cursor.execute('DELETE FROM metadata_attr WHERE attribute IS NULL;')

    alter_tcga_metadata_attr_ds = 'ALTER TABLE metadata_attr DROP COLUMN shortlist;'
    tcga_metadata_attr_insertion = 'DELETE FROM metadata_attr WHERE attribute NOT IN ("{0}");'.format('","'.join(new_shortlist))
    alter_tcga_metadata_attr_id = 'ALTER TABLE metadata_attr ADD COLUMN id INT NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (id);'

    remove_ccle_metadata_data = 'DELETE from metadata_data where program_name="CCLE";'
    remove_ccle_metadata_samples = 'DELETE from metadata_samples where program_name="CCLE";'

    rename_metadata_tables = 'RENAME TABLE metadata_samples TO TCGA_metadata_samples, metadata_data to TCGA_metadata_data_HG19, metadata_attr to TCGA_metadata_attr;'

    insert_into_public_metadata_table = """
      INSERT INTO projects_public_metadata_tables (samples_table, attr_table, sample_data_availability_table, sample_data_type_availability_table, biospec_table, clin_table, data_tables_id, program_id)
      VALUES("{samples_table}", "{attr_table}", "{sample_data_availability_table}", "{sample_data_type_availability_table}", "{biospec_table}", "{clin_table}", {data_tables}, {program_id});
    """

    insert_into_public_data_table = """
        INSERT INTO projects_public_data_tables (data_table, build, program_id)
        VALUES("{data_table}", "{build}", {program});
    """

    check_already_exists = 'SELECT * FROM projects_public_data_tables WHERE program_id=%s;'
    get_tcga_program_id = "SELECT id from projects_program where name='TCGA';"
    get_ccle_program_id = "SELECT id from projects_program where name='CCLE';"

    try:
        cursor.execute(delete_tables)

        cursor.execute(create_ccle_metadata_data)
        cursor.execute(ccle_metadata_data_insertion)

        cursor.execute(create_ccle_metadata_samples)
        cursor.execute(ccle_metadata_samples_insertion)
        cursor.execute(alter_ccle_metadata_samples)

        cursor.execute(create_ccle_metadata_attr)
        cursor.execute(alter_ccle_metadata_attr_ds)
        cursor.execute(ccle_metadata_attr_insertion)
        cursor.execute(alter_ccle_metadata_attr_id)

        cursor.execute(alter_tcga_metadata_attr_ds)
        cursor.execute(tcga_metadata_attr_insertion)
        cursor.execute(alter_tcga_metadata_attr_id)

        cursor.execute(remove_ccle_metadata_data)
        cursor.execute(remove_ccle_metadata_samples)
        cursor.execute(rename_metadata_tables)

        cursor.execute(get_ccle_program_id)
        result = cursor.fetchone()
        if result and len(result):
            prog_id = int(result[0])
            cursor.execute(check_already_exists, (prog_id,))
            result = cursor.fetchone()
            if not result or not len(result):
                cursor.execute(insert_into_public_data_table.format(data_table='CCLE_metadata_data_HG19',
                                                                    build='HG19',
                                                                    program = prog_id))

                cursor.execute("SELECT id FROM projects_public_data_tables WHERE program_id = %s AND build = %s", (prog_id, 'HG19',))

                data_tables_id = cursor.fetchall()[0][0]

                cursor.execute(insert_into_public_metadata_table.format(samples_table='CCLE_metadata_samples',
                                                                    attr_table='CCLE_metadata_attr',
                                                                    sample_data_availability_table='CCLE_metadata_sample_data_availability',
                                                                    sample_data_type_availability_table='CCLE_metadata_sample_data_type_availability',
                                                                    biospec_table='CCLE_metadata_biospecimen',
                                                                    clin_table='CCLE_metadata_clinical',
                                                                    data_tables = data_tables_id,
                                                                    program_id=prog_id))
        else:
            print("[WARNING] No CCLE program found.", file=sys.stdout)

        cursor.execute(get_tcga_program_id)
        result = cursor.fetchone()
        if len(result):
            prog_id = int(result[0])
            cursor.execute(check_already_exists, (prog_id,))
            result = cursor.fetchone()
            if not result or not len(result):
                cursor.execute(insert_into_public_data_table.format(data_table='TCGA_metadata_data_HG19',
                                                                    build='HG19',
                                                                    program=prog_id))

                cursor.execute("SELECT id FROM projects_public_data_tables WHERE program_id = %s AND build = %s",
                               (prog_id, 'HG19',))

                data_tables_id = cursor.fetchall()[0][0]


                cursor.execute(insert_into_public_metadata_table.format(samples_table='TCGA_metadata_samples',
                                                                    attr_table='TCGA_metadata_attr',
                                                                    sample_data_availability_table='TCGA_metadata_sample_data_availability',
                                                                    sample_data_type_availability_table='TCGA_metadata_sample_data_type_availability',
                                                                    biospec_table='TCGA_metadata_biospecimen',
                                                                    clin_table='TCGA_metadata_clinical',
                                                                    data_tables=data_tables_id,
                                                                    program_id=prog_id))
        else:
            print("[WARNING] No TCGA program found.", file=sys.stdout)

        db.commit()

    except Exception as e:
        print("[ERROR] Exception in breakout_metadata_tables!", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)


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
        print("[ERROR] Exception when altering user_metadata_tables!", file=sys.stdout)
        print(e, file=sys.stdout)
        print(traceback.format_exc(), file=sys.stdout)

# ALL THESE FUNCTIONS CAME FROM userdata_bootstrap.py.
# THEY ARE BEING CONSOLIDATED INTO THIS ONE FILE DUE TO RUNTIME ORDERING.
def create_project_views(project, source_table, studies):
    db = get_mysql_connection()
    cursor = db.cursor()

    study_names = {}
    view_check_sql = "SELECT COUNT(TABLE_NAME) FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = %s;"
    create_view_sql = "CREATE OR REPLACE VIEW %s AS SELECT * FROM %s"
    where_project = " WHERE disease_code=%s;"

    try:
        for study in studies:
            view_name = "%s_%s_%s" % (project, study, source_table[5:],)

            # If project and study are the same we assume this is meant to
            # be a one-study project
            make_view = (create_view_sql % (view_name, source_table,))
            params = None

            if project == study:
                make_view += ";"
            else:
                make_view += where_project
                params = (study,)

            if params:
                cursor.execute(make_view, params)
            else:
                cursor.execute(make_view)

            cursor.execute(view_check_sql, (view_name,))
            if cursor.fetchall()[0][0] <= 0:
                raise Exception("Unable to create view '" + view_name + "'!")

            cursor.execute("SELECT COUNT(*) FROM %s;" % view_name)
            if cursor.fetchall()[0][0] <= 0:
                print("Creation of view '"+view_name+"' was successful, but no entries are found in " + \
                    "it. Double-check the "+source_table+" table for valid entries.", file=sys.stdout)
            else:
                print("Creation of view '" + view_name + "' was successful.", file=sys.stdout)

            study_names[study] = {"view_name": view_name, "project": project}

        return study_names

    except Exception as e:
        print(e, file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)

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
            print("[STATUS] metadata_attr_map table found.", file=sys.stdout)
        else:
            print("Building attribute mapping table...", file=sys.stdout)

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
                print("metadata_attr mapping table successfully generated.", file=sys.stdout)

    except Exception as e:
        print(e, file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


def create_public_programs(big_query_dataset, bucket_name, bucket_permissions):
    db = None
    cursor = None

    try:
        db = get_mysql_connection()
        cursor = db.cursor()

        insert_projects = "INSERT INTO projects_program (name, active, last_date_saved, is_public, owner_id) " + \
                          "VALUES (%s,%s,%s,%s,%s);"
        insert_googleproj = "INSERT INTO accounts_googleproject (project_id, project_name, big_query_dataset) " + \
                            "VALUES (%s,%s,%s);"
        insert_googleproj_user = "INSERT INTO accounts_googleproject_user (user_id, googleproject_id)" \
                                 "VALUES (%s,%s);"
        insert_bucket = "INSERT INTO accounts_bucket (bucket_name, bucket_permissions, google_project_id) VALUES (%s, %s, %s);"

        googleproj_name = "isb-cgc"
        googleproj_id = None

        cursor.execute("SELECT id FROM auth_user WHERE username = %s AND is_active = 1 AND is_superuser = 1;", (SUPERUSER_NAME,))

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

    except Exception as e:
        print('[ERROR] Exception while making public program entries: '+e.message, file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)
    finally:
        if cursor: cursor.close
        if db and db.open: db.close



def bootstrap_user_data_schema(public_feature_table, big_query_dataset, bucket_name, bucket_permissions, bqdataset_name):
    fetch_studies = "SELECT DISTINCT disease_code FROM TCGA_metadata_samples WHERE program_name='TCGA';"
    insert_studies = "INSERT INTO projects_project (name, active, last_date_saved, owner_id, program_id) " + \
                     "VALUES (%s,%s,%s,%s,%s);"
    insert_bqdataset = "INSERT INTO accounts_bqdataset (dataset_name, google_project_id) VALUES (%s, %s);"
    insert_user_data_tables = "INSERT INTO projects_user_data_tables (project_id, user_id, google_project_id, " + \
                              "google_bucket_id, metadata_data_table, metadata_samples_table, " + \
                              "feature_definition_table, google_bq_dataset_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s);"

    tables = ['metadata_samples', 'metadata_data_HG19']

    googleproj_name = "isb-cgc"
    studies = {}
    isb_userid = None
    table_project_data = {}
    project_table_views = None
    project_info = {}
    project_info = {}
    googleproj_id = None
    bucket_id = None
    bqdataset_id = None

    db = None
    cursor = None
    cursorDict = None

    try:

        db = get_mysql_connection()
        cursor = db.cursor()
        cursorDict = db.cursor(cursors.DictCursor)

        cursor.execute("SELECT id FROM auth_user WHERE username = %s;", (SUPERUSER_NAME,))

        for row in cursor.fetchall():
            isb_userid = row[0]

        if isb_userid is None:
            raise Exception("Couldn't retrieve ID for isb user!")

        cursorDict.execute("SELECT name, id FROM projects_program;")
        for row in cursorDict.fetchall():
            project_info[row['name']] = row['id']

        cursor.execute("SELECT id FROM accounts_googleproject WHERE project_name=%s;", (googleproj_name,))
        for row in cursor.fetchall():
            googleproj_id = row[0]

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
            project_table_views = create_project_views("TCGA", 'TCGA_'+table, list(studies.keys()))
            # Make CCLE and add it in manually
            ccle_view = create_project_views("CCLE", 'CCLE_'+table, ["CCLE"])
            project_table_views["CCLE"] = ccle_view["CCLE"]

            table_project_data[table] = project_table_views

        insertTime = time.strftime('%Y-%m-%d %H:%M:%S')
        # Add the studies to the study table and store their generated IDs
        for study in project_table_views:
            cursor.execute(insert_studies, (study, True, insertTime, isb_userid,
                                            project_info[project_table_views[study]['project']],))
        db.commit()

        cursorDict.execute("SELECT name, id FROM projects_project;")
        for row in cursorDict.fetchall():
            project_info[row['name']] = row['id']

        # Add the project views to the user_data_tables table
        for study in project_table_views:
            cursor.execute(insert_user_data_tables, (project_info[study], isb_userid, googleproj_id, bucket_id,
                                                     table_project_data['metadata_data_HG19'][study]['view_name'],
                                                     table_project_data['metadata_samples'][study]['view_name'],
                                                     public_feature_table, bqdataset_id))
        db.commit()

        # Compare the number of studies in projects_user_data_tables, projects_project, and our study set.
        # If they don't match, something might be wrong.
        project_count = 0
        project_udt_count = 0
        metadata_samples_project_count = len(list(studies.keys())) + (1 if "CCLE" not in list(studies.keys()) else 0)

        cursor.execute("SELECT COUNT(DISTINCT id) FROM projects_project;")
        project_count = cursor.fetchall()[0][0]

        cursor.execute("SELECT COUNT(DISTINCT project_id) FROM projects_user_data_tables;")
        project_udt_count = cursor.fetchall()[0][0]

        if project_udt_count == project_count == metadata_samples_project_count:
            if project_udt_count <= 0:
                print("[ERROR] No studies found! Double-check the creation script and databse settings.", file=sys.stdout)
            else:
                print("[STATUS] Programs and studies appear to have been created successfully: " + \
                      project_count.__str__()+" studies added.", file=sys.stdout)
        else:
            print("[WARNING] Unequal number of studies between metadata_samples, projects_project, and " + \
                    "projects_user_data_tables. projects_project: "+project_count.__str__()+", " + \
                    "projects_user_data_tables: " + project_udt_count.__str__()+", metadata_samples: " + \
                  metadata_samples_project_count.__str__(), file=sys.stdout)

    except Exception as e:
        print(e, file=sys.stderr)
        print(traceback.format_exc(), file=sys.stderr)

    finally:
        if cursor: cursor.close
        if cursorDict: cursorDict.close()
        if db and db.open: db.close

def bootstrap_file_data():
    print('Populating filelistings...', file=sys.stdout)

    DCC_BUCKET = ''
    CGHUB_BUCKET = ''
    CCLE_BUCKET = ''
    insert_userupload = "INSERT INTO data_upload_userupload (status, `key`, owner_id) values ('complete', '', %s);"
    insert_useruploadedfile_TCGA = "INSERT INTO data_upload_useruploadedfile (upload_id, bucket, file) " \
                                   "SELECT %s,%s,datafilenamekey from TCGA_metadata_data_HG19 " \
                                   "    where datafileuploaded='true' and datafilenamekey != '' and disease_code=%s and repository=%s;"
    insert_useruploadedfile_CCLE = "INSERT INTO data_upload_useruploadedfile (upload_id, bucket, file) " \
                                   "SELECT %s,%s,datafilenamekey from CCLE_metadata_data_HG19 " \
                                   "    where datafileuploaded='true' and datafilenamekey != '' and program_name=%s;"

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
                useruploadedfile_values = []  # [upload_id, bucket, project_name, repository]
                useruploadedfile_values.append([last_userupload[0], DCC_BUCKET, project['name'], 'DCC'])
                useruploadedfile_values.append([last_userupload[0], CGHUB_BUCKET, project['name'], 'CGHUB'])

                # Create UserUploadedFile for the project
                cursor.executemany(insert_useruploadedfile_TCGA, useruploadedfile_values)
            else: # CCLE

                # Create UserUploadedFile for the project
                cursor.execute(insert_useruploadedfile_CCLE, (last_userupload[0], CCLE_BUCKET, project['name'],))

            db.commit()

    except Exception as e:
        print(traceback.format_exc(), file=sys.stdout)
    finally:
        if cursor: cursor.close()
        if cursorDict: cursorDict.close()
        if db and db.open: db.close()


""" main """

def main():

    # To disable any of these by default, change the default to False
    cmd_line_parser = ArgumentParser(description="Script to catch up a database to current deployment needs.")

    # These are no longer needed, so they default to false
    cmd_line_parser.add_argument('-v', '--create-shortlist-view', type=bool, default=False,
                                 help="Create the view which lists all members of metadata_attributes with shortlist=1 (i.e. true).")
    cmd_line_parser.add_argument('-m', '--create-ms-shortlist-view', type=bool, default=False,
                                 help="Create the metadata_samples_shortlist view, which acts as a smaller version of metadata_samples for use with the webapp.")

    # Still need these three just for build purposes
    cmd_line_parser.add_argument('-b', '--fix-bmi-case', type=bool, default=True,
                                 help="Fix the casing of the attribute value for the BMI row in metadata_attributes.")
    cmd_line_parser.add_argument('-n', '--fix-disease-code', type=bool, default=True,
                                 help="Fix the casing of the Disease_Code column")
    cmd_line_parser.add_argument('-l', '--catchup-shortlist', type=bool, default=True,
                                 help="Add the shortlist column to metadata_attributes and set its value.")

    cmd_line_parser.add_argument('-g', '--make-attr-display-table', type=bool, default=True,
                                 help="Create the attr_value_display table, which stores the display strings for the attributes and values for any program which has them.")

    cmd_line_parser.add_argument('-s', '--create-program-attr-sproc', type=bool, default=True,
                                 help="Create the get_program_attr stored procedure, which retrieves all the attributes found in a program's metadata_attributes table.")
    cmd_line_parser.add_argument('-j', '--create-metadata-vals-sproc', type=bool, default=True,
                                 help="Create the get_metadata_values stored procedure, which retrieves all the possible values of the attributes found in a program's metadata_samples table.")
    cmd_line_parser.add_argument('-t', '--create-program-display-sproc', type=bool, default=True,
                                 help="Create the get_program_display_strings stored procedure, which retrieves all display strings of the attributes and their values found in a program's metadata_samples table.")

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

    # Build-mode: an argument which supercedes all others and runs a pre-defined set of methods
    # This set should be adjusted as needed to make minor adjustments to the database so it
    # will reflect current test/live deployments for ease of development
    cmd_line_parser.add_argument('-z', '--buildmode', type=bool, default=True,
                                 help="Runs the build set of methods, superceding all other arguments.")

    args = cmd_line_parser.parse_args()

    db = get_mysql_connection()
    cursor = db.cursor()

    try:

        if args.buildmode:
            print("[STATUS] Database catchup running in build mode.", file=sys.stdout)

            # buildmode specifies a specfic set of methods to run in a certain order

            # Until we have a new sql dump, we need to manually update changed columns
            cursor.execute("UPDATE metadata_attr SET attribute='BMI' WHERE attribute='bmi';")
            cursor.execute("UPDATE metadata_attr SET attribute='disease_code' WHERE attribute='Disease_Code';")

            # Insert the public programs into the projects_program table; they're needed by numerous other things later on
            create_public_programs(args.bq_dataset, args.bucket_name, args.bucket_perm)

            alter_metadata_tables(cursor)
            # this shortlist it used to make the shortened metadata_samples table, so it needs to remain
            catchup_shortlist(cursor)

            create_metadata_vals_sproc(cursor)
            create_program_attr_sproc(cursor)
            create_program_display_sproc(cursor)

            fix_cohort_projects(cursor)
            fix_ccle(cursor)
            add_isb_cgc_project_sproc(cursor)

            breakout_metadata_tables(cursor, db)

            # Specific alterations for making projecrs from public programs to sync with user data, etc.
            bootstrap_user_data_schema(args.pub_feat_table, args.bq_dataset, args.bucket_name, args.bucket_perm,
                                       args.bq_dataset_storage)
            bootstrap_metadata_attr_mapping()
            bootstrap_file_data()

            make_attr_display_table(cursor, db)
            create_program_display_sproc(cursor)

        else:
            # Argument-specific method runs - some methods are required for now; those will have no argument
            # flag

            # Until we have a new sql dump, we need to manually update changed columns
            args.fix_bmi_case and cursor.execute("UPDATE metadata_attr SET attribute='BMI' WHERE attribute='bmi';")
            args.fix_disease_code and cursor.execute(
                "UPDATE metadata_attr SET attribute='disease_code' WHERE attribute='Disease_Code';")

            # Insert the public programs into the projects_program table;
            # they're needed by numerous other things later on
            create_public_programs(args.bq_dataset, args.bucket_name, args.bucket_perm)

            args.alter_metadata_tables and alter_metadata_tables(cursor)
            args.catchup_shortlist and catchup_shortlist(cursor)

            args.create_metadata_vals_sproc and create_metadata_vals_sproc(cursor)
            args.create_program_attr_sproc and create_program_attr_sproc(cursor)
            args.create_program_display_sproc and create_program_display_sproc(cursor)

            args.fix_cohort_projects and fix_cohort_projects(cursor)
            args.fix_ccle_cohort_projects and fix_ccle(cursor)
            args.create_isbcgc_project_set_sproc and add_isb_cgc_project_sproc(cursor)

            args.breakout_metadata_tables and breakout_metadata_tables(cursor, db)

            # These methods build the 'project' level structure which is required for public data to
            # be treated on a per-project basis
            bootstrap_user_data_schema(args.pub_feat_table, args.bq_dataset, args.bucket_name, args.bucket_perm,
                                       args.bq_dataset_storage)
            bootstrap_metadata_attr_mapping()
            bootstrap_file_data()

            args.make_attr_display_table and make_attr_display_table(cursor, db)
            args.create_program_display_sproc and create_program_display_sproc(cursor)


    except Exception as e:
        print(e)
        print(traceback.format_exc())

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()

if __name__ == "__main__":
    main()