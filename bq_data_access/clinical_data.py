from api.api_helpers import authorize_credentials_with_Google
from api.schema.tcga_clinical import schema as clinical_schema

from django.conf import settings

import logging

from bq_data_access.feature_value_types import DataTypes, BigQuerySchemaToValueTypeConverter
from bq_data_access.cohort_utils import CohortQueryBuilder
from bq_data_access.feature_value_types import DataPointIdentifierTools


CLINICAL_FEATURE_TYPE = 'CLIN'

TABLES = [
    {
        'name': 'Clinical',
        'info': 'Clinical',
        'id': 'tcga_clinical'
    }
]

def filter_by_name(keyword):
    result = []

    for item in clinical_schema:
        type = item['type']
        name = item['name']
        if name.find(keyword.lower()) != -1:
            result.append(item)

    return result


def get_all_features():
    result = [feature for feature in clinical_schema]
    return result


def feature_search(keyword, disable_filter=False):
    search_result = None
    if disable_filter:
        search_result = get_all_features()
    else:
        search_result = filter_by_name(keyword)

    found_features = []
    for feature_item in search_result:
        tcga_clinical_id = feature_item['name']
        name_parts = []
        for part in tcga_clinical_id.split('_'):
            name_parts.append(part.capitalize())
        human_readable_name = ' '.join(name_parts)
        internal_id = 'CLIN:' + tcga_clinical_id

        found_features.append({
            'feature_type': 'CLIN',
            'gene': None,
            'internal_id': internal_id,
            'label': human_readable_name
        })

    return found_features


class InvalidClinicalFeatureIDException(Exception):
    def __init__(self, feature_id, reason):
        self.feature_id = feature_id
        self.reason = reason

    def __str__(self):
        return "Invalid internal clinical feature ID '{feature_id}', reason '{reason}'".format(
            feature_id=self.feature_id,
            reason=self.reason
        )

# TODO Clean up
def get_table_name():
    return TABLES[0]['name']

def build_query(project_name, dataset_name, table_name, column_name, cohort_dataset, cohort_table, cohort_id_array):
    # Generate the 'IN' statement string: (%s, %s, ..., %s)
    cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

    query_template =\
        ("SELECT clin.ParticipantBarcode, biospec.sample_id, clin.{column_name} "
         "FROM ( "
            " SELECT ParticipantBarcode, {column_name} "
            " FROM [{project_name}:{dataset_name}.{table_name}] "
            " ) AS clin "
         " JOIN ( "
            " SELECT ParticipantBarcode, SampleBarcode as sample_id "
            " FROM [{project_name}:tcga_data_open.Biospecimen] "
            " ) AS biospec "
         " ON clin.ParticipantBarcode = biospec.ParticipantBarcode "
         "WHERE biospec.sample_id IN ( "
         "    SELECT sample_barcode "
         "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
         "    WHERE cohort_id IN ({cohort_id_list}) "
         ")"
         "GROUP BY clin.ParticipantBarcode, biospec.sample_id, clin.{column_name}")

    query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                  column_name=column_name,
                                  cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                  cohort_id_list=cohort_id_stmt)

    logging.debug("BQ_QUERY_CLIN: " + query)
    return query

def do_query(project_id, project_name, dataset_name, table_name, column_name, cohort_dataset, cohort_table, cohort_id_array):
    bigquery_service = authorize_credentials_with_Google()
    query = build_query(project_name, dataset_name, table_name, column_name, cohort_dataset, cohort_table, cohort_id_array)
    query_body = {
        'query': query
    }

    table_data = bigquery_service.jobs()
    query_response = table_data.query(projectId=project_id, body=query_body).execute()

    result = []
    num_result_rows = int(query_response['totalRows'])
    if num_result_rows == 0:
        return result

    for row in query_response['rows']:
        result.append({
            'patient_id': row['f'][0]['v'],
            'sample_id': row['f'][1]['v'],
            'aliquot_id': None,
            'value': row['f'][2]['v']
        })

    return result

class ClinicalFeatureProvider(object):
    def __init__(self, feature_id):
        self.feature_type = ''
        self.clinical_field = ''
        self.table_name = ''
        self.column_name = ''
        self.value_type = None
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return self.value_type

    def get_feature_type(self):
        return DataTypes.CLIN

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = do_query(project_id, project_name, dataset_name, self.table_name, self.column_name, cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def parse_value_type(self, type_string):
        pass

    # TODO raise exception if column is unknown
    def get_column_name_and_value_type(self, column_id):
        column_name = None
        value_type = None
        for clinical_field in clinical_schema:
            name, schema_field_type = clinical_field['name'], clinical_field['type']
            if name == column_id:
                column_name = name
                value_type = BigQuerySchemaToValueTypeConverter.get_value_type(schema_field_type)

        return column_name, value_type

    def parse_internal_feature_id(self, feature_id):
        try:
            feature_type, clinical_field = feature_id.split(':')
            self.feature_type = feature_type
            self.table_name = get_table_name()
            self.column_name, self.value_type = self.get_column_name_and_value_type(clinical_field)
        except:
            raise InvalidClinicalFeatureIDException(feature_id, 'bad format')

        if self.column_name is None:
            raise InvalidClinicalFeatureIDException(feature_id, 'field not recognized')
