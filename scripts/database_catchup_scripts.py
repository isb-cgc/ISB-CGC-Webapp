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


def main():
    db = get_mysql_connection()
    cursor = db.cursor()

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
                WHERE attribute IN ('age_at_initial_pathologic_diagnosis','BMI','Study','gender','has_27k','has_450k',
                  'has_BCGSC_GA_RNASeq','has_BCGSC_HiSeq_RNASeq','has_GA_miRNASeq','has_HiSeq_miRnaSeq',
                  'has_Illumina_DNASeq','has_RPPA','has_SNP6','has_UNC_GA_RNASeq','has_UNC_HiSeq_RNASeq',
                  'histological_type','hpv_status','icd_10','icd_o_3_histology','icd_o_3_site','neoplasm_histologic_grade',
                  'new_tumor_event_after_initial_treatment','pathologic_stage','person_neoplasm_cancer_status','Project',
                  'residual_tumor','SampleTypeCode','tobacco_smoking_history','tumor_tissue_site','tumor_type',
                  'vital_status');
            """
            cursor.execute(set_metadata_shortlist_def)

        # Create the metadata_shortlist view, which is our formal set of attributes displayed in the WebApp
        metadata_shortlist_view_def = """
            CREATE OR REPLACE VIEW metadata_shortlist AS
                SELECT attribute,code FROM metadata_attr WHERE shortlist=1;
        """
        cursor.execute(metadata_shortlist_view_def)

        # This stored procedure uses the metadata_shortlist view to determine what the members of the shortlist are
        # and returns a series of result sets containing the complete value domain for those attributes which have
        # categorical (i.e. non-continuous) values
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

        # The primary view used by the WebApp to obtain data for counting and display, so we're not constantly
        # dealing with all of metadata_samples
        # *** THIS MUST BE RERUN ANY TIME AN ATTRIBUTE IS ADDED OR REMOVED FROM THE SHORTLIST ***
        # *** OR THE SHORTLIST WILL NO LONGER BE ACCURATE ***

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
            view_cols += ','+row[0]

        cursor.execute(metadata_samples_shortlist_view_def % view_cols)

        # Until we have a new sql dump, we need to manually update changed columns
        cursor.execute("UPDATE metadata_attr SET attribute='BMI' WHERE attribute='bmi';")


    except Exception as e:
        print e
        print traceback.format_exc()

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()

if __name__ == "__main__":
    main()