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

TABLES = [
    {
        'name': 'miRNA_BCGSC_GA_mirna',
        'info': 'miRNA (GA, BCGSC RPM)',
        'platform': 'IlluminaGA',
        'feature_id': 'mirna_illumina_ga_rpm',
        'value_field': 'reads_per_million_miRNA_mapped'
    },
    {
        'name': 'miRNA_BCGSC_HiSeq_mirna',
        'info': 'miRNA (HiSeq, BCGSC RPM)',
        'platform': 'IlluminaHiSeq',
        'feature_id': 'mirna_illumina_hiseq_rpm',
        'value_field': 'reads_per_million_miRNA_mapped'
    },
    {
        'name': 'miRNA_Expression_Values',
        'platform': 'both',
        'info': 'miRNA',
        'feature_id': 'expression',
        'value_field': 'normalized_count'
    }
]

TABLE_IDX_MIRNA_EXPRESSION = 2

VALUE_READS_PER_MILLION = 'RPM'
VALUE_NORMALIZED_COUNT = 'normalized_count'

MIRN_FEATURE_TYPE = 'MIRN'
COHORT_FIELD_NAME = 'sample_id'


def get_feature_type():
    return MIRN_FEATURE_TYPE


def get_mirna_expression_table_info():
    return TABLES[TABLE_IDX_MIRNA_EXPRESSION]


def get_table_info(platform, value):
    table_info = None
    if value == VALUE_NORMALIZED_COUNT:
        table_info = get_mirna_expression_table_info()
    else:
        for table_entry in TABLES:
            if platform == table_entry['platform']:
                table_info = table_entry
    return table_info


class MIRNFeatureDef(object):
    def __init__(self, mirna_name, platform, value_field, table_id):
        self.mirna_name = mirna_name
        self.platform = platform
        self.value_field = value_field
        self.table_id = table_id

    @classmethod
    def get_table_info(cls, table_id):
        table_info = None
        for table_entry in TABLES:
            if table_id == table_entry['feature_id']:
                table_info = table_entry

        return table_info

    @classmethod
    def from_feature_id(cls, feature_id):
        # Example ID: MIRN:hsa-mir-1244-1:IlluminaGA:RPM
        mirna_tables = "|".join([table['feature_id'] for table in TABLES])

        regex = re_compile("^MIRN:"
                           # mirna name
                           "([a-zA-Z0-9._\-]+):"
                           # table
                           "(" + mirna_tables +
                           ")$")

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        mirna_name, table_id = feature_fields[0]
        table_info = cls.get_table_info(table_id)
        platform = table_info['platform']
        value_field = table_info['value_field']

        return cls(mirna_name, platform, value_field, table_id)


class MIRNFeatureProvider(object):
    TABLES = TABLES

    def __init__(self, feature_id):
        self.feature_def = None
        self.table_info = None
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.MIRN

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['value'])

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        query_template = \
            ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, {value_field} AS value, {mirna_name_field} "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE {mirna_name_field}='{mirna_name}' ")

        if table_name == get_mirna_expression_table_info()['name']:
            mirna_name_field = 'mirna_id'
            query_template += " AND Platform='{platform}' "
        else:
            mirna_name_field = 'miRNA_ID'

        query_template += \
            ("AND SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
             ") ")
        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      mirna_name_field=mirna_name_field, mirna_name=feature_def.mirna_name,
                                      platform=feature_def.platform,
                                      value_field=feature_def.value_field,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_MIRN: " + query)
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

    def validate_internal_feature_id(self, feature_id):
        pass

    def get_table_info(self, table_id):
        table_info = None
        for table_entry in self.TABLES:
            if table_id == table_entry['feature_id']:
                table_info = table_entry

        return table_info

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = MIRNFeatureDef.from_feature_id(feature_id)
        self.table_info = self.get_table_info(self.feature_def.table_id)
        self.table_name = self.table_info['name']
