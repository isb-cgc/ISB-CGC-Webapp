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
            WHERE attribute IN ('age_at_initial_pathologic_diagnosis','BMI','Study','gender','has_27k','has_450k',
              'has_BCGSC_GA_RNASeq','has_BCGSC_HiSeq_RNASeq','has_GA_miRNASeq','has_HiSeq_miRnaSeq',
              'has_Illumina_DNASeq','has_RPPA','has_SNP6','has_UNC_GA_RNASeq','has_UNC_HiSeq_RNASeq',
              'histological_type','hpv_status','icd_10','icd_o_3_histology','icd_o_3_site','neoplasm_histologic_grade',
              'new_tumor_event_after_initial_treatment','pathologic_stage','person_neoplasm_cancer_status','Project',
              'residual_tumor','SampleTypeCode','tobacco_smoking_history','tumor_tissue_site','tumor_type',
              'vital_status');
        """
        cursor.execute(set_metadata_shortlist_def)

# Create the view which lists all members of metadata_attributes with shortlist=1 (i.e. true).
def create_shortlist_view(cursor):
    # Create the metadata_shortlist view, which is our formal set of attributes displayed in the WebApp
    metadata_shortlist_view_def = """
        CREATE OR REPLACE VIEW metadata_shortlist AS
            SELECT attribute,code FROM metadata_attr WHERE shortlist=1;
    """
    cursor.execute(metadata_shortlist_view_def)

# Create the get_metadata_values stored procedure, which retrieves all the possible values of the metadata shortlist
# attributes found in metadata_samples.
#
# This stored procedure uses the metadata_shortlist view to determine what the members of the shortlist are
# and returns a series of result sets containing the complete value domain for those attributes which have
# categorical (i.e. non-continuous) values
def create_metadata_vals_sproc(cursor):
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

# Create the metadata_samples_shortlist view, which acts as a smaller version of metadata_samples for use with the
# webapp.
#
# The primary view used by the WebApp to obtain data for counting and display, so we're not constantly
# dealing with all of metadata_samples
# *** THIS MUST BE RERUN ANY TIME AN ATTRIBUTE IS ADDED OR REMOVED FROM THE SHORTLIST ***
# *** OR THE SHORTLIST WILL NO LONGER BE ACCURATE ***
def create_samples_shortlist_view(cursor):

    # Base VIEW definition
    metadata_samples_shortlist_view_def = """
        CREATE OR REPLACE VIEW metadata_samples_shortlist AS
            SELECT SampleBarcode,ParticipantBarcode%s FROM metadata_samples;
    """

    # Gather the metadata attribute 'shortlist' from metadata_attributes
    # and add it to the VIEW definition
    cursor.execute("SELECT attribute FROM metadata_attr WHERE shortlist=1;")
    view_cols = ''
    for row in cursor.fetchall():
        view_cols += ',' + row[0]

    cursor.execute(metadata_samples_shortlist_view_def % view_cols)

# Cohorts made prior to the release of user data will have null values in their study IDs for each sample
# in the cohort. This script assumes that any sample with a null study ID is an ISB-CGC sample from metadata_samples
# and uses the value of the Study column to look up the appropriate ID in projects_study and apply it to the cohort

def fix_cohort_studies(cursor):

    fix_study_ids_str = """
        UPDATE cohorts_samples AS cs
        JOIN (
                SELECT ms.SampleBarcode AS SampleBarcode,ps.id AS study
                        FROM metadata_samples ms
                                JOIN (SELECT id,name FROM projects_study WHERE owner_id = 1 AND active=1) ps
                        ON ps.name = ms.Study
        ) AS ss
        ON ss.SampleBarcode = cs.sample_id
        JOIN cohorts_cohort AS cc
        ON cc.id = cs.cohort_id
        SET cs.study_id = ss.study
        WHERE cs.study_id IS NULL AND cc.active = 1;
    """

    null_study_count = """
        SELECT COUNT(*)
        FROM cohorts_samples cs
                JOIN metadata_samples ms
                        ON ms.SampleBarcode = cs.sample_id
                JOIN (SELECT id,name FROM projects_study WHERE owner_id = 1 AND active = 1) ps
                        ON ps.name = ms.Study
                JOIN cohorts_cohort AS cc
                        ON cc.id = cs.cohort_id
        where cs.study_id IS NULL AND cc.active = 1;
    """

    cursor.execute(null_study_count)
    print >> sys.stdout,"[STATUS] Number of cohort sample entries from ISB-CGC studies with null study IDs: "+cursor.fetchall()[0][0]
    print >> sys.stdout,"[STATUS] Correcting null study IDs for ISB-CGC cohorts - this could take a while!"
    cursor.execute(fix_study_ids_str)
    print >> sys.stdout, "[STATUS] ...done. Checking for still-null study IDs..."
    cursor.execute(null_study_count)
    not_fixed = cursor.fetchall()[0][0]
    print >> sys.stdout, "[STATUS] Number of cohort sample entries from ISB-CGC studies with null study IDs after correction: " + not_fixed
    if not_fixed > 0:
        print >> sys.stdout, "[WARNING] Some of the samples were not corrected! You should double-check them."


# Query to correct CCLE samples, which ran into the 'disease code' and 'study' collision problem

def fix_ccle(cursor):

    cursor.execute("SELECT id FROM projects_study WHERE name = 'CCLE' AND active = 1 AND owner_id = 1;")
    ccle_id = cursor.fetchall()[0][0]

    cursor.execute("""
        SELECT COUNT(*)
        FROM cohorts_samples cs
        JOIN cohorts_cohort cc
            ON cc.id = cs.cohort_id
        WHERE cc.active = 1 AND cs.sample_id LIKE 'CCLE%' and NOT(cs.study_id = %s);
    """,(ccle_id,))

    ccle_count = cursor.fetchall()[0][0]

    if ccle_count <= 0:
        print >> sys.stdout, "[STATUS] No samples with CCLE study IDs which need fixing - exiting."
        return

    print >> sys.stdout, "[STATUS] There are "+str(ccle_count)+" CCLE samples in the cohorts_samples table with an incorrect study ID. Fixing..."

    fix_ccle_cohorts = """
        UPDATE cohorts_samples AS cs
            JOIN cohorts_cohort cc
                ON cc.id = cs.cohort_id
        SET cs.study_id = %s
        WHERE cc.active = 1 AND cs.sample_id LIKE 'CCLE%';
    """

    cursor.execute(fix_ccle_cohorts,(ccle_id,))

    cursor.execute("""
        SELECT COUNT(*)
        FROM cohorts_samples cs
            JOIN cohorts_cohort cc
                ON cc.id = cs.cohort_id
        WHERE cc.active = 1 AND cs.sample_id LIKE 'CCLE%' and NOT(cs.study_id = %s);
    """,(ccle_id,))

    ccle_new_count = cursor.fetchall()[0][0]
    if ccle_new_count > 0:
        print >> sys.stdout, "[WARNING] Some CCLE samples still have the wrong study ID - double-check your database. (count: "+str(ccle_count)+")"


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
    cmd_line_parser.add_argument('-c', '--fix-cohort-studies', type=bool, default=True,
                                 help="Fix cohorts which have null study IDs for ISB-CGC samples")
    cmd_line_parser.add_argument('-e', '--fix-ccle-cohort-studies', type=bool, default=True,
                                 help="Fix study IDs for CCLE samples in cohorts")

    args = cmd_line_parser.parse_args()


    db = get_mysql_connection()
    cursor = db.cursor()

    try:

        args.catchup_shortlist and catchup_shortlist(cursor)
        args.create_shortlist_view and create_shortlist_view(cursor)
        args.create_metadata_vals_sproc and create_metadata_vals_sproc(cursor)
        args.create_ms_shortlist_view and create_samples_shortlist_view(cursor)
        args.fix_cohort_studies and fix_cohort_studies(cursor)
        args.fix_ccle_cohort_studies and fix_ccle(cursor)

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