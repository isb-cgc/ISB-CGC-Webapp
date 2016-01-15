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

from api.api_helpers import authorize_credentials_with_Google
from django.conf import settings

import logging

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

def build_feature_label(gene, info):
    # print info
    # Example: 'EGFR mRNA (Illumina HiSeq, UNC RSEM)'
    label = gene + " mRNA (" + info['platform'] + ", " + info['center'] + " " + info['value_label'] + ")"
    return label

def build_internal_feature_id(gene, table_id):
    return '{feature_type}:{gene}:{table}'.format(
        feature_type=get_feature_type(),
        gene=gene,
        table=table_id
    )

def get_table_info(table_id):
    table_info = None
    for table_entry in TABLES:
        if table_id == table_entry['id']:
            table_info = table_entry

    return table_info

def build_query(project_name, dataset_name, table_name, gene_symbol, value_field, cohort_dataset, cohort_table, cohort_id_array):
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
                                  gene_symbol=gene_symbol, value_field=value_field,
                                  cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                  cohort_id_list=cohort_id_stmt)

    logging.debug("BQ_QUERY_GEXP: " + query)
    return query

def do_query(project_id, project_name, dataset_name, table_name, gene_symbol, value_field,
             cohort_dataset, cohort_table, cohort_id_array):
    bigquery_service = authorize_credentials_with_Google()

    query = build_query(project_name, dataset_name, table_name, gene_symbol, value_field,
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

class MRNAFeatureProvider(object):
    def __init__(self, feature_id):
        self.feature_type = ''
        self.gene_label = ''
        self.table_id = ''
        self.table_info = None
        self.value_field = ''
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.GEXP

    def process_data_point(self, data_point):
        return str(data_point['value'])

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = do_query(project_id, project_name, dataset_name, self.table_name, self.gene_label, self.value_field,
                          cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def parse_internal_feature_id(self, feature_id):
        # TODO better feature ID input validation
        feature_type, gene_label, table_id = feature_id.split(':')
        self.feature_type = feature_type
        self.gene_label = gene_label
        self.table_id = table_id
        self.table_info = get_table_info(table_id)

        if self.table_info is None:
            raise FeatureNotFoundException(feature_id)

        self.table_name = self.table_info['table_id']
        self.value_field = self.table_info['value_field']

