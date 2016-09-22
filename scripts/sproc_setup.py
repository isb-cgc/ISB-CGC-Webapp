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

        metadata_vals_sproc_def = """CREATE PROCEDURE `get_metadata_values`()
            BEGIN
                SELECT DISTINCT bmi FROM metadata_samples;
                SELECT DISTINCT gender FROM metadata_samples;
                SELECT DISTINCT vital_status FROM metadata_samples;
                SELECT DISTINCT residual_tumor FROM metadata_samples;
                SELECT DISTINCT person_neoplasm_cancer_status FROM metadata_samples;
                SELECT DISTINCT age_at_initial_pathologic_diagnosis FROM metadata_samples;
                SELECT DISTINCT icd_o_3_histology FROM metadata_samples;
                SELECT DISTINCT histological_type FROM metadata_samples;
                SELECT DISTINCT Project FROM metadata_samples;
                SELECT DISTINCT pathologic_stage FROM metadata_samples;
                SELECT DISTINCT Study FROM metadata_samples;
                SELECT DISTINCT tumor_type FROM metadata_samples;
                SELECT DISTINCT hpv_status FROM metadata_samples;
                SELECT DISTINCT icd_o_3_site FROM metadata_samples;
                SELECT DISTINCT tobacco_smoking_history FROM metadata_samples;
                SELECT DISTINCT icd_10 FROM metadata_samples;
                SELECT DISTINCT tumor_tissue_site FROM metadata_samples;
                SELECT DISTINCT neoplasm_histologic_grade FROM metadata_samples;
                SELECT DISTINCT new_tumor_event_after_initial_treatment FROM metadata_samples;
                SELECT DISTINCT SampleTypeCode FROM metadata_samples;
                SELECT DISTINCT has_Illumina_DNASeq FROM metadata_samples;
                SELECT DISTINCT has_BCGSC_HiSeq_RNASeq FROM metadata_samples;
                SELECT DISTINCT has_UNC_HiSeq_RNASeq FROM metadata_samples;
                SELECT DISTINCT has_BCGSC_GA_RNASeq FROM metadata_samples;
                SELECT DISTINCT has_UNC_GA_RNASeq FROM metadata_samples;
                SELECT DISTINCT has_HiSeq_miRnaSeq FROM metadata_samples;
                SELECT DISTINCT has_GA_miRNASeq FROM metadata_samples;
                SELECT DISTINCT has_RPPA FROM metadata_samples;
                SELECT DISTINCT has_SNP6 FROM metadata_samples;
                SELECT DISTINCT has_27k FROM metadata_samples;
                SELECT DISTINCT has_450k FROM metadata_samples;
            END"""

        cursor.execute(metadata_vals_sproc_def)

    except Exception as e:
        print e
        print traceback.format_exc()

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()

if __name__ == "__main__":
    main()