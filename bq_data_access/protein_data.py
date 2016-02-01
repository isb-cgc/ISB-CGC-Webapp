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

RPPA_FEATURE_TYPE = 'RPPA'


def get_feature_type():
    return RPPA_FEATURE_TYPE


class RPPAFeatureDef(object):
    def __init__(self, gene, protein_name):
        self.gene = gene
        self.protein_name = protein_name

    @classmethod
    def from_feature_id(cls, feature_id):
        # Example ID: RPPA:GYG1:GYG-Glycogenin1
        regex = re_compile("^RPPA:"
                           # gene
                           "([a-zA-Z0-9]+):"
                           # protein name
                           "([a-zA-Z0-9._\-]+)$")

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        gene_label, protein_name = feature_fields[0]
        return cls(gene_label, protein_name)


class RPPAFeatureProvider(object):
    TABLES = [
        {
            'name': 'Protein',
            'info': 'Protein',
            'id': 'protein'
        }
    ]

    def __init__(self, feature_id):
        self.feature_def = None
        self.table_info = None
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.RPPA

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['value'])

    def build_query(self, project_name, dataset_name, table_name, feature_def,  cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        query_template = \
            ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, protein_expression AS value "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE ( gene_name='{gene}' AND protein_name='{protein}' ) "
             "AND SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
             ") ")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      gene=feature_def.gene, protein=feature_def.protein_name,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_RPPA: " + query)
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
                'value': float(row['f'][3]['v'])
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

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = RPPAFeatureDef.from_feature_id(feature_id)
        self.table_name = self.TABLES[0]['name']

