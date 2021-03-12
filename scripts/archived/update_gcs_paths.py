from __future__ import division
from builtins import str
from past.utils import old_div
import requests
import os
import logging
import datetime

logger = logging.getLogger('main_logger')

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "isb_cgc.settings")

import django
django.setup()

from cohorts.metadata_helpers import get_sql_connection
from projects.models import Public_Data_Tables, Program
from google_helpers.bigquery.gcs_path_support import BigQueryGcsPathSupport, BigQuerySupport

from isb_cgc import settings

db = None
cursor = None

INDEXD_URI = settings.INDEXD_URI + "?ids="
LIMIT = settings.INDEXD_REQ_LIMIT

EXECUTION_PROJECT = "isb-cgc"
STORAGE_DATASET = "gcs_path_import_staging"

try:
    db = get_sql_connection()
    cursor = db.cursor()

    program_paths = {}

    query_base = """
        SELECT file_gdc_id, case_barcode, sample_barcode, case_gdc_id, sample_gdc_id
        FROM {metadata_data_table}
        WHERE file_gdc_id IS NOT NULL AND NOT(file_gdc_id = '')
        LIMIT {limit} OFFSET {offset};
    """

    count_query_base_cloudsql = """
        SELECT COUNT(*)
        FROM (
          SELECT file_gdc_id
          FROM {data_table}
          GROUP BY file_gdc_id
        ) uuids;
    """

    count_query_base = """
        #standardSQL
        SELECT COUNT(*)
        FROM (
          SELECT file_gdc_id
          FROM `{data_table}`
          GROUP BY file_gdc_id
        );
    """

    missing_uuid_check = """
        #standardSQL
        SELECT curr.file_gdc_id AS curr_file_gdc_id, inc.file_gdc_id AS inc_file_gdc_id
        FROM `{curr_data_table}` curr
        LEFT JOIN `{inc_data_table}` inc
        ON inc.file_gdc_id = curr.file_gdc_id
        WHERE inc.file_gdc_id IS NULL OR inc.file_gdc_id = '';
    """

    missing_path_check = """
        #standardSQL
        SELECT curr.file_gdc_id AS curr_file_gdc_id, inc.file_gdc_id AS inc_file_gdc_id, inc.file_gcs_path
        FROM `{curr_data_table}` curr
        LEFT JOIN `{inc_data_table}` inc
        ON inc.file_gdc_id = curr.file_gdc_id
        WHERE inc.file_gcs_path = '' OR inc.file_gcs_path IS NULL;
    """

    program_tables = Public_Data_Tables.objects.filter(program__in=Program.get_public_programs())

    for table in program_tables:
        if table.program.name.lower() == 'ccle' and table.build.lower() == 'hg19':
            data_table_bq = table.data_table.lower()

            prog_build_table = "{}_metadata_data_{}_new_paths_{}".format(
                table.program.name.lower(),
                table.build.lower(),
                datetime.datetime.now().strftime("%Y%m%d_%H%M")
            )

            gcs_support = BigQueryGcsPathSupport(
                EXECUTION_PROJECT,
                STORAGE_DATASET,
                prog_build_table
            )

            result = gcs_support.add_temp_path_table()

            if 'status' in result and result['status'] == 'TABLE_MADE':
                logger.info("Table {} successfully made.".format(prog_build_table))

            offset=0
            files_found = True

            logger.info("Fetching IndexD paths for {} Build {}...".format(table.program.name, table.build))

            cursor.execute(count_query_base_cloudsql.format(data_table=table.data_table))
            uuid_count = cursor.fetchall()[0][0]

            expected_iter = (old_div(uuid_count,100) + (1 if uuid_count % 100 > 0 else 0))

            logger.info("Expected calls: {}".format(str(expected_iter)))

            iterations = 0

            while files_found and iterations < expected_iter:
                cursor.execute(query_base.format(limit=LIMIT,offset=offset,metadata_data_table=table.data_table))
                files = cursor.fetchall()
                files_found = len(files) > 0

                if files_found:

                    indexd_req_string = ",".join([x[0] for x in files])
                    files_this_fetch = {
                        x[0]: {
                            'case_barcode': x[1],
                            'sample_barcode': x[2],
                            'case_gdc_id': x[3],
                            'sample_gdc_id':x[4],
                            'gcs_path': ''
                        } for x in files
                    }

                    try:
                        indexd_resp = requests.get(url=INDEXD_URI + indexd_req_string)
                    except Exception as e:
                        logger.warning("[WARNING] Exception during fetch - retrying...")
                        try:
                            indexd_resp = requests.get(url=INDEXD_URI + indexd_req_string)
                        except Exception as e:
                            logger.error("[ERROR] Unable to fetch this batch! Skipping...")
                            continue

                    reported = False

                    if 'records' in indexd_resp.json():
                        for record in indexd_resp.json()['records']:
                            for url in record['urls']:
                                if 'gs://' in url:
                                    if record['did'] in files_this_fetch:
                                        files_this_fetch[record['did']]['gcs_path'] = url
                                    else:
                                        logger.info("Unexpected record in response: {}".format(record['did']))
                                        if not reported:
                                            logger.info("Original request block: {}".format(indexd_req_string))
                                            reported = True

                    offset += len(files)

                    # Insert rows
                    result = gcs_support.add_rows(files_this_fetch)
                    if 'insertErrors' in result:
                        logger.error("[ERROR] While inserting {} rows at offset {} into {}, saw insertion errors!".format(
                            str(len(files)), str(offset), prog_build_table
                        ))

                    iterations += 1

            # Compare tables via BQ
            compare_count = BigQuerySupport.execute_query_and_fetch_results(count_query_base.format(
                data_table="{}.{}.{}".format(EXECUTION_PROJECT, table.bq_dataset, data_table_bq))
            )
            main_table_count = int(compare_count[0]['f'][0]['v'])

            compare_count = BigQuerySupport.execute_query_and_fetch_results(count_query_base.format(
                data_table="{}.{}.{}".format(EXECUTION_PROJECT, STORAGE_DATASET, prog_build_table))
            )
            new_table_count = int(compare_count[0]['f'][0]['v'])

            if main_table_count != new_table_count:
                logger.warning("[WARNING] Possible missing paths: count mismatch for {} and {}".format(data_table_bq,prog_build_table))
                logger.warning("[WARNING] Current table GDC file UUID count: {}".format(str(main_table_count)))
                logger.warning("[WARNING] New table GDC file UUID count: {}".format(str(new_table_count)))
            else:
                logger.info("[STATUS] {} Build {} path fetch complete - counts match ({} vs. {})".format(
                    table.program.name,
                    table.build,
                    str(main_table_count),
                    str(new_table_count)
                ))

            missing_uuid_table = "{}_metadata_data_{}_uuid_check_{}".format(
                table.program.name.lower(),
                table.build.lower(),
                datetime.datetime.now().strftime("%Y%m%d_%H%M")
            )

            logger.info("Creating missing UUID table {}".format(missing_uuid_table))
            check_for_uuids = BigQuerySupport.execute_query_to_table(
                missing_uuid_check.format(
                    curr_data_table="{}.{}.{}".format(EXECUTION_PROJECT, table.bq_dataset, data_table_bq),
                    inc_data_table="{}.{}.{}".format(EXECUTION_PROJECT, STORAGE_DATASET, prog_build_table)
                ),
                EXECUTION_PROJECT,
                STORAGE_DATASET,
                missing_uuid_table
            )

            missing_path_table = "{}_metadata_data_{}_path_check_{}".format(
                table.program.name.lower(),
                table.build.lower(),
                datetime.datetime.now().strftime("%Y%m%d_%H%M")
            )

            logger.info("Creating missing path table {}".format(missing_path_table))

            check_for_paths = BigQuerySupport.execute_query_to_table(
                missing_path_check.format(
                    curr_data_table="{}.{}.{}".format(EXECUTION_PROJECT, table.bq_dataset, data_table_bq),
                    inc_data_table="{}.{}.{}".format(EXECUTION_PROJECT, STORAGE_DATASET, prog_build_table)
                ),
                EXECUTION_PROJECT,
                STORAGE_DATASET,
                missing_path_table
            )

except Exception as e:
    logger.error("[ERROR] While updating GCS paths: ")
    logger.exception(e)
finally:
    if cursor: cursor.close
    if db and db.open: db.close
