__author__ = 'llim'

import logging

from api.api_helpers import authorize_credentials_with_Google

from django.conf import settings

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType, DataTypes

RPPA_FEATURE_TYPE = 'RPPA'
IDENTIFIER_COLUMN_NAME = 'sample_id'

TABLES = [
    {
        'name': 'Protein',
        'info': 'Protein',
        'id': 'protein'
    }
]

VALUES = ['protein_expression']

def get_feature_type():
    return RPPA_FEATURE_TYPE

def get_table_info():
    return TABLES[0]

def build_feature_label(row):
    # Example: 'Protein | Gene:EGFR, Protein:EGFR_pY1068, Value:protein_expression'
    label = "Protein | Gene:" + row['gene_name'] + ", Protein:" + row['protein_name'] + ", Value:" + row['value_field']
    return label

def build_internal_feature_id(gene, protein):
    return '{feature_type}:{gene}:{protein}'.format(
        feature_type=get_feature_type(),
        gene=gene,
        protein=protein
    )

def build_query(project_name, dataset_name, table_name, gene, protein, cohort_dataset, cohort_table, cohort_id_array):
    # Generate the 'IN' statement string: (%s, %s, ..., %s)
    cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

    query_template = \
        ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, protein_expression AS value "
         "FROM [{project_name}:{dataset_name}.{table_name}] "
         "WHERE ( gene_name='{gene}' AND protein_name='{protein}' ) "
         "AND SampleBarcode IN ( "
         "    SELECT sample_barcode "
         "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
         "    WHERE cohort_id IN ({cohort_id_list}) "
         ") ")

    query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                  gene=gene, protein=protein,
                                  cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                  cohort_id_list=cohort_id_stmt)

    logging.debug("BQ_QUERY_RPPA: " + query)
    return query

def do_query(project_id, project_name, dataset_name, table_name, gene, protein, cohort_dataset, cohort_table, cohort_id_array):
    bigquery_service = authorize_credentials_with_Google()

    query = build_query(project_name, dataset_name, table_name, gene, protein, cohort_dataset, cohort_table, cohort_id_array)
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
            'aliquot_id': row['f'][2]['v'],
            'value': float(row['f'][3]['v'])
        })

    return result

def build_feature_query():
    query_template = ("SELECT gene_name, protein_name \
                       FROM [{project_name}:{dataset_name}.{table_name}] \
                       WHERE gene_name IS NOT NULL \
                       GROUP BY gene_name, protein_name")
    query_str = query_template.format(dataset_name=settings.BIGQUERY_DATASET2,
                                      project_name=settings.BIGQUERY_PROJECT_NAME, table_name='Protein')

    return [query_str]

def build_feature_table_stmt():
    stmt = ("CREATE TABLE IF NOT EXISTS {table_name} ( "
            "id int(11) unsigned NOT NULL AUTO_INCREMENT, "
            "gene_name tinytext, "
            "protein_name tinytext, "
            "num_search_hits tinytext, "
            "value_field tinytext, "
            "internal_feature_id tinytext, "
            "PRIMARY KEY (id))").format(table_name='feature_defs_rppa')

    fieldnames = ['gene_name', 'protein_name', 'num_search_hits', 'value_field', 'internal_feature_id']

    return fieldnames, stmt

def insert_features_stmt():
    stmt = ("INSERT INTO {table_name} "
            "(gene_name, protein_name, num_search_hits, value_field, internal_feature_id) "
            "VALUES (%s, %s, %s, %s, %s)").format(table_name='feature_defs_rppa')

    return stmt

def parse_response(row):
    result = []

    gene = row[0]['v']
    protein = row[1]['v']

    for value in VALUES:
        result.append({
            'gene_name': gene,
            'protein_name': protein,
            'num_search_hits': 0,
            'value_field': value,
            'internal_feature_id': build_internal_feature_id(gene, protein)
        })

    return len(VALUES), result

class RPPAFeatureProvider(object):
    def __init__(self, feature_id):
        self.feature_type = ''
        self.table_info = None
        self.gene_label = ''
        self.protein_label = ''
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.RPPA

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['value'])

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = do_query(project_id, project_name, dataset_name, self.table_name, self.gene_label, self.protein_label,
                          cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def parse_internal_feature_id(self, feature_id):
        # TODO better feature ID input validation
        feature_type, gene_label, protein_label = feature_id.split(':')
        self.feature_type = feature_type
        self.gene_label = gene_label
        self.protein_label = protein_label
        self.table_info = get_table_info()

        logging.debug(repr(self.table_info))
        if self.table_info is None:
            raise FeatureNotFoundException(feature_id)

        self.table_name = self.table_info['name']

