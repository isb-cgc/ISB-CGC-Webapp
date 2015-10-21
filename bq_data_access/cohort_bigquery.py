from copy import deepcopy

from api.api_helpers import authorize_credentials_with_Google

COHORT_DATASETS = {
    'prod': 'cloud_deployment_cohorts',
    'staging': 'cloud_deployment_cohorts',
    'dev': 'dev_deployment_cohorts'
}

COHORT_TABLES = {
    'prod': 'prod_cohorts',
    'staging': 'staging_cohorts'
}

class BigQueryCohortSupport(object):
    cohort_schema = [
        {
            "name": "cohort_id",
            "type": "INTEGER",
            "mode": "REQUIRED"
        },
        {
            "name": "patient_barcode",
            "type": "STRING"
        },
        {
            "name": "sample_barcode",
            "type": "STRING"
        },
        {
            "name": "aliquot_barcode",
            "type": "STRING"
        }
    ]

    patient_type = 'patient'
    sample_type = 'sample'
    aliquot_type = 'aliquot'

    @classmethod
    def get_schema(cls):
        return deepcopy(cls.cohort_schema)

    def __init__(self, project_id, dataset_id, table_id):
        self.project_id = project_id
        self.dataset_id = dataset_id
        self.table_id = table_id

    def _build_request_body_from_rows(self, rows):
        insertable_rows = []
        for row in rows:
            insertable_rows.append({
                'json': row
            })

        return {
            "rows": insertable_rows
        }

    def _streaming_insert(self, rows):
        bigquery_service = authorize_credentials_with_Google()
        table_data = bigquery_service.tabledata()

        body = self._build_request_body_from_rows(rows)

        response = table_data.insertAll(projectId=self.project_id,
                                        datasetId=self.dataset_id,
                                        tableId=self.table_id,
                                        body=body).execute()

        return response

    def _build_cohort_row(self, cohort_id,
                          patient_barcode=None, sample_barcode=None, aliquot_barcode=None):
        return {
            'cohort_id': cohort_id,
            'patient_barcode': patient_barcode,
            'sample_barcode': sample_barcode,
            'aliquot_barcode': aliquot_barcode
        }

    def add_cohort_with_sample_barcodes(self, cohort_id, barcodes):
        rows = []
        for sample_barcode in barcodes:
            patient_barcode = sample_barcode[:12]
            rows.append(self._build_cohort_row(cohort_id, patient_barcode, sample_barcode, None))

        response = self._streaming_insert(rows)
        return response
