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
        'table_id': 'mRNA_BCGSC_GA_RPKM',
        'platform': 'Illumina GA',
        'center': 'BCGSC',
        'id': 'mrna_bcgsc_illumina_ga',
        'value_label': 'RPKM',
        'value_field': 'RPKM'
    },
    {
        'table_id': 'mRNA_BCGSC_HiSeq_RPKM',
        'platform': 'Illumina HiSeq',
        'center': 'BCGSC',
        'id': 'mrna_bcgsc_illumina_hiseq',
        'value_label': 'RPKM',
        'value_field': 'RPKM'
    },
    {
        'table_id': 'mRNA_UNC_GA_RSEM',
        'platform': 'Illumina GA',
        'center': 'UNC',
        'id': 'mrna_unc_illumina_ga',
        'value_label': 'RSEM',
        'value_field': 'normalized_count'
    },
    {
        'table_id': 'mRNA_UNC_HiSeq_RSEM',
        'platform': 'Illumina HiSeq',
        'center': 'UNC',
        'id': 'mrna_unc_illumina_hiseq',
        'value_label': 'RSEM',
        'value_field': 'normalized_count'
    }
]

GEXP_FEATURE_TYPE = 'GEXP'


def get_feature_type():
    return GEXP_FEATURE_TYPE


class GEXPFeatureDef(object):
    def __init__(self, gene, value_field, table_id):
        self.gene = gene
        self.value_field = value_field
        self.table_id = table_id

    @classmethod
    def get_table_info(cls, table_id):
        table_info = None
        for table_entry in TABLES:
            if table_id == table_entry['id']:
                table_info = table_entry

        return table_info

    @classmethod
    def from_feature_id(cls, feature_id):
        # Example ID: GEXP:TP53:mrna_bcgsc_illumina_hiseq
        gexp_tables = "|".join([table['id'] for table in TABLES])

        regex = re_compile("^GEXP:"
                           # gene
                           "([a-zA-Z0-9]+):"
                           # table
                           "(" + gexp_tables +
                           ")$")

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        gene_label, table_id = feature_fields[0]
        value_field = cls.get_table_info(table_id)['value_field']
        return cls(gene_label, value_field, table_id)


class GEXPFeatureProvider(object):
    TABLES = TABLES

    def __init__(self, feature_id):
        self.feature_def = None
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.GEXP

    def process_data_point(self, data_point):
        return str(data_point['value'])

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        query_template = \
            ("SELECT ParticipantBarcode AS patient_id, SampleBarcode AS sample_id, AliquotBarcode AS aliquot_id, {value_field} AS value "
             "FROM [{project_name}:{dataset_name}.{table_name}] AS gexp "
             "WHERE original_gene_symbol='{gene_symbol}' "
             "AND SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
             ") ")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      gene_symbol=feature_def.gene, value_field=feature_def.value_field,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_GEXP: " + query)
        return query

    def do_query(self, project_id, project_name, dataset_name, table_name, feature_def,
                 cohort_dataset, cohort_table, cohort_id_array):
        bigquery_service = authorize_credentials_with_Google()

        query = self.build_query(project_name, dataset_name, table_name, feature_def,
                                 cohort_dataset, cohort_table, cohort_id_array)
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

    # TODO refactor, duplicate code shared with GEXPFeatureDef
    def get_table_info(self, table_id):
        table_info = None
        for table_entry in self.TABLES:
            if table_id == table_entry['id']:
                table_info = table_entry

        return table_info

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = GEXPFeatureDef.from_feature_id(feature_id)

        table_info = self.get_table_info(self.feature_def.table_id)
        self.table_name = table_info['table_id']


