"""

Copyright 2015, Institute for Systems Biology

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

import logging
from api.api_helpers import authorize_credentials_with_Google

from django.conf import settings

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType, DataTypes

GNAB_FEATURE_TYPE = 'GNAB'
IDENTIFIER_COLUMN_NAME = 'sample_id'

TABLES = [
    {
        'name': 'MAF',
        'info': 'MAF',
        'id': 'maf'
    }
]

VALUE_FIELD_NUM_MUTATIONS = 'num_mutations'
VALUES = frozenset(['variant_classification', 'variant_type', 'sequence_source', VALUE_FIELD_NUM_MUTATIONS])

def get_feature_type():
    return GNAB_FEATURE_TYPE

def get_table_info():
    return TABLES[0]

def get_table_id():
    return get_table_info()['id']

def build_feature_label(row):
    # Example: 'Mutation | Gene:EGFR, Value:variant_classification'
    label = "Mutation | Gene:" + row['gene_name'] + ", Value:" + row['value_field']
    return label

def build_internal_feature_id(gene, value_field):
    return '{feature_type}:{gene}:{table}:{value}'.format(
        feature_type=get_feature_type(),
        gene=gene,
        table=get_table_id(),
        value=value_field)

def build_internal_feature_id(gene, value_field):
    return '{feature_type}:{gene}:{value}'.format(
        feature_type=get_feature_type(),
        gene=gene,
        value=value_field
    )

def validate_input(query_table_id):
    valid_tables = set([x['id'] for x in TABLES])
    if query_table_id not in valid_tables:
        raise Exception("Invalid table ID for maf")

def build_query(project_name, dataset_name, table_name, gene, value_field, cohort_dataset, cohort_table, cohort_id_array):
    # Generate the 'IN' statement string: (%s, %s, ..., %s)
    cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

    query_template = \
        ("SELECT ParticipantBarcode, Tumor_SampleBarcode, Tumor_AliquotBarcode, "
         "Normal_SampleBarcode, Normal_AliquotBarcode, {value_field} AS value "
         "FROM [{project_name}:{dataset_name}.{table_name}] "
         "WHERE Hugo_Symbol='{gene}' "
         "AND Tumor_SampleBarcode IN ( "
         "    SELECT sample_barcode "
         "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
         "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
         ") ")

    if value_field == 'num_mutations':
        value_field = 'count(*)'
        query_template += ("GROUP BY ParticipantBarcode, Tumor_SampleBarcode, Tumor_AliquotBarcode, "
                           "Normal_SampleBarcode, Normal_AliquotBarcode")

    query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                  gene=gene, value_field=value_field,
                                  cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                  cohort_id_list=cohort_id_stmt)

    logging.debug("BQ_QUERY_GNAB: " + query)
    return query

def do_query(project_id, project_name, dataset_name, table_name, gene_label, value_field, cohort_dataset, cohort_table, cohort_id_array):
    bigquery_service = authorize_credentials_with_Google()

    query = build_query(project_name, dataset_name, table_name, gene_label, value_field, cohort_dataset, cohort_table, cohort_id_array)
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
            'value': row['f'][5]['v'],
        })
        result.append({
            'patient_id': row['f'][0]['v'],
            'sample_id': row['f'][3]['v'],
            'aliquot_id': row['f'][4]['v'],
            'value': row['f'][5]['v'],
        })

    return result

def build_feature_query():
    query_template = ("SELECT Hugo_Symbol \
                       FROM [{project_name}:{dataset_name}.{table_name}] \
                       GROUP BY Hugo_Symbol")

    query_str = query_template.format(dataset_name=settings.BIGQUERY_DATASET2,
                                      project_name=settings.BIGQUERY_PROJECT_NAME, table_name='MAF')

    return [query_str]

def build_feature_table_stmt():
    stmt = ("CREATE TABLE IF NOT EXISTS {table_name} ( "
            "id int(11) unsigned NOT NULL AUTO_INCREMENT, "
            "gene_name tinytext, "
            "num_search_hits tinytext, "
            "value_field tinytext, "
            "internal_feature_id tinytext, "
            "PRIMARY KEY (id))").format(table_name='feature_defs_gnab')

    fieldnames = ['gene_name', 'num_search_hits', 'value_field', 'internal_feature_id']

    return fieldnames, stmt

def insert_features_stmt():
    stmt = ("INSERT INTO {table_name} "
            "(gene_name, num_search_hits, value_field, internal_feature_id) "
            "VALUES (%s, %s, %s, %s)").format(table_name='feature_defs_gnab')

    return stmt

def parse_response(row):
    result = []

    gene = row[0]['v']

    for value in VALUES:
        result.append({
            'gene_name': gene,
            'num_search_hits': 0,
            'value_field': value,
            'internal_feature_id': build_internal_feature_id(gene, value)
        })

    return len(VALUES), result

class GNABFeatureProvider(object):
    def __init__(self, feature_id):
        self.feature_type = ''
        self.gene_label = ''
        self.table_info = None
        self.value_field = ''
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        if self.value_field == VALUE_FIELD_NUM_MUTATIONS:
            return ValueType.FLOAT
        else:
            return ValueType.STRING

    def get_feature_type(self):
        return DataTypes.GNAB

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['value'])

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = do_query(project_id, project_name, dataset_name,
                          self.table_name, self.gene_label, self.value_field,
                          cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def parse_internal_feature_id(self, feature_id):
        # TODO Better input validation
        feature_type, gene_label, value_field = feature_id.split(':')
        if value_field not in VALUES:
            raise FeatureNotFoundException(feature_id)

        self.feature_type = feature_type
        self.gene_label = gene_label
        self.value_field = value_field
        self.table_info = get_table_info()

        if self.table_info is None:
            raise FeatureNotFoundException(feature_id)

        self.table_name = self.table_info['name']
