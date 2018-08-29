import requests
import os
import logging

logger = logging.getLogger('main_logger')

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "GenespotRE.settings")

import django
django.setup()

from cohorts.metadata_helpers import get_sql_connection
from projects.models import Public_Data_Tables, Program

from GenespotRE import settings

db = None
cursor = None

INDEXD_URI = settings.INDEXD_URI + "?ids="
LIMIT = settings.INDEXD_REQ_LIMIT

try:
    db = get_sql_connection()
    cursor = db.cursor()

    program_paths = {}

    query_base = """
        SELECT file_gdc_id, case_barcode, sample_barcode, case_gdc_id, sample_gdc_id
        FROM {metadata_data_table}
        LIMIT {limit} OFFSET {offset};
    """

    program_tables = Public_Data_Tables.objects.filter(program__in=Program.get_public_programs())

    for table in program_tables:
        program_paths[table.program.name] = {}
        program_paths[table.program.name][table.build] = None

        offset=0
        files_found = True

        while files_found:
            cursor.execute(query_base.format(limit=LIMIT,offset=offset,metadata_data_table=table.data_table))
            files = cursor.fetchall()
            files_found = len(files) > 0

            indexd_req_string = ",".join([x[0] for x in files])
            program_paths[table.program.name][table.build] = {
                x[0]: {
                    'case_barcode': x[1],
                    'sample_barcode': x[2],
                    'case_gdc_id': x[3],
                    'sample_gdc_id':x[4],
                    'gcs_path': ''
                } for x in files
            }

            build_obj = program_paths[table.program.name][table.build]

            indexd_resp = requests.get(url=INDEXD_URI + indexd_req_string)

            if 'records' in indexd_resp.json():
                for record in indexd_resp.json()['records']:
                    for url in record['urls']:
                        if 'gs://' in url:
                            build_obj[record['did']]['gcs_path'] = url

            offset += len(files)

except Exception as e:
    logger.error("[ERROR] While updating GCS paths: ")
    logger.exception(e)
finally:
    if cursor: cursor.close
    if db and db.open: db.close
