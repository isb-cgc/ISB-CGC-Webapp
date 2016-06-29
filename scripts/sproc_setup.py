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

        raw_counts_sproc_def = """CREATE PROCEDURE `get_raw_counts`()
            BEGIN

                SELECT DISTINCT gender, COUNT(1) as gender_count FROM metadata_samples GROUP BY gender;
                SELECT DISTINCT vital_status, COUNT(1) as count FROM metadata_samples GROUP BY vital_status;
                SELECT DISTINCT residual_tumor, COUNT(1) as count FROM metadata_samples GROUP BY residual_tumor;
                SELECT DISTINCT person_neoplasm_cancer_status, COUNT(1) as count FROM metadata_samples GROUP BY person_neoplasm_cancer_status;
                SELECT DISTINCT age_at_initial_pathologic_diagnosis, COUNT(1) as count FROM metadata_samples GROUP BY age_at_initial_pathologic_diagnosis;
                SELECT DISTINCT icd_o_3_histology, COUNT(1) as count FROM metadata_samples GROUP BY icd_o_3_histology;
                SELECT DISTINCT has_GA_miRNASeq, COUNT(1) as count FROM metadata_samples GROUP BY has_GA_miRNASeq;
                SELECT DISTINCT has_BCGSC_GA_RNASeq, COUNT(1) as count FROM metadata_samples GROUP BY has_BCGSC_GA_RNASeq;
                SELECT DISTINCT histological_type, COUNT(1) as count FROM metadata_samples GROUP BY histological_type;
                SELECT DISTINCT race, COUNT(1) as count FROM metadata_samples GROUP BY race;
                SELECT DISTINCT has_27k, COUNT(1) as count FROM metadata_samples GROUP BY has_27k;
                SELECT DISTINCT Project, COUNT(1) as count FROM metadata_samples GROUP BY Project;
                SELECT DISTINCT pathologic_stage, COUNT(1) as count FROM metadata_samples GROUP BY pathologic_stage;
                SELECT DISTINCT has_SNP6, COUNT(1) as count FROM metadata_samples GROUP BY has_SNP6;
                SELECT DISTINCT prior_dx, COUNT(1) as count FROM metadata_samples GROUP BY prior_dx;
                SELECT DISTINCT has_HiSeq_miRnaSeq, COUNT(1) as count FROM metadata_samples GROUP BY has_HiSeq_miRnaSeq;
                SELECT DISTINCT has_UNC_HiSeq_RNASeq, COUNT(1) as count FROM metadata_samples GROUP BY has_UNC_HiSeq_RNASeq;
                SELECT DISTINCT Study, COUNT(1) as count FROM metadata_samples GROUP BY Study;
                SELECT DISTINCT tumor_type, COUNT(1) as count FROM metadata_samples GROUP BY tumor_type;
                SELECT DISTINCT icd_o_3_site, COUNT(1) as count FROM metadata_samples GROUP BY icd_o_3_site;
                SELECT DISTINCT tobacco_smoking_history, COUNT(1) as count FROM metadata_samples GROUP BY tobacco_smoking_history;
                SELECT DISTINCT has_RPPA, COUNT(1) as count FROM metadata_samples GROUP BY has_RPPA;
                SELECT DISTINCT icd_10, COUNT(1) as count FROM metadata_samples GROUP BY icd_10;
                SELECT DISTINCT tumor_tissue_site, COUNT(1) as count FROM metadata_samples GROUP BY tumor_tissue_site;
                SELECT DISTINCT ethnicity, COUNT(1) as count FROM metadata_samples GROUP BY ethnicity;
                SELECT DISTINCT has_Illumina_DNASeq, COUNT(1) as count FROM metadata_samples GROUP BY has_Illumina_DNASeq;
                SELECT DISTINCT neoplasm_histologic_grade, COUNT(1) as count FROM metadata_samples GROUP BY neoplasm_histologic_grade;
                SELECT DISTINCT country, COUNT(1) as count FROM metadata_samples GROUP BY country;
                SELECT DISTINCT has_BCGSC_HiSeq_RNASeq, COUNT(1) as count FROM metadata_samples GROUP BY has_BCGSC_HiSeq_RNASeq;
                SELECT DISTINCT has_UNC_GA_RNASeq, COUNT(1) as count FROM metadata_samples GROUP BY has_UNC_GA_RNASeq;
                SELECT DISTINCT new_tumor_event_after_initial_treatment, COUNT(1) as count FROM metadata_samples GROUP BY new_tumor_event_after_initial_treatment;
                SELECT DISTINCT has_450k, COUNT(1) as count FROM metadata_samples GROUP BY has_450k;
                SELECT DISTINCT SampleTypeCode, COUNT(1) as count FROM metadata_samples GROUP BY SampleTypeCode;

            END"""

        cursor.execute(raw_counts_sproc_def)

    except Exception as e:
        print e
        print traceback.format_exc()

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()

if __name__ == "__main__":
    main()