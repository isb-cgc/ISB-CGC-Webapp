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
from re import compile as re_compile
from api.api_helpers import authorize_credentials_with_Google

from django.conf import settings

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType, DataTypes

GNAB_FEATURE_TYPE = 'GNAB'
IDENTIFIER_COLUMN_NAME = 'sample_id'


def get_feature_type():
    return GNAB_FEATURE_TYPE


class GNABFeatureDef(object):
    def __init__(self, gene, value_field):
        self.gene = gene
        self.value_field = value_field

    @classmethod
    def from_feature_id(cls, feature_id):
        # Example ID: GNAB:SMYD3:sequence_source
        regex = re_compile("^GNAB:"
                           # gene
                           "([a-zA-Z0-9_.\-]+):"
                           # value field
                           "(variant_classification|variant_type|sequence_source|num_mutations)$")

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        gene_label, value_field = feature_fields[0]

        return cls(gene_label, value_field)


class GNABFeatureProvider(object):
    TABLES = [
        {
            'name': 'MAF',
            'info': 'MAF',
            'id': 'maf'
        }
    ]

    VALUE_FIELD_NUM_MUTATIONS = 'num_mutations'

    def __init__(self, feature_id):
        self.feature_def = None
        self.table_info = None
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        if self.feature_def.value_field == self.VALUE_FIELD_NUM_MUTATIONS:
            return ValueType.FLOAT
        else:
            return ValueType.STRING

    def get_feature_type(self):
        return DataTypes.GNAB

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['value'])

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        query_template = \
            ("SELECT ParticipantBarcode, Tumor_SampleBarcode, Tumor_AliquotBarcode, "
             "{value_field} AS value "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE Hugo_Symbol='{gene}' "
             "AND Tumor_SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
             ") ")

        value_field_bqsql = self.feature_def.value_field

        if self.feature_def.value_field == self.VALUE_FIELD_NUM_MUTATIONS:
            value_field_bqsql = 'count(*)'
            query_template += ("GROUP BY ParticipantBarcode, Tumor_SampleBarcode, Tumor_AliquotBarcode, "
                               "Normal_SampleBarcode, Normal_AliquotBarcode")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      gene=feature_def.gene, value_field=value_field_bqsql,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_GNAB: " + query)
        return query

    def do_query(self, project_id, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        bigquery_service = authorize_credentials_with_Google()

        query = self.build_query(project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array)
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
                'value': row['f'][3]['v'],
            })

        return result

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = self.do_query(project_id, project_name, dataset_name, self.table_name, self.feature_def,
                               cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def get_table_info(self):
        return self.TABLES[0]

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = GNABFeatureDef.from_feature_id(feature_id)
        self.table_info = self.get_table_info()

        if self.table_info is None:
            raise FeatureNotFoundException(feature_id)

        self.table_name = self.table_info['name']
