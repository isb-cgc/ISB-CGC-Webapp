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

METH_FEATURE_TYPE = 'METH'
IDENTIFIER_COLUMN_NAME = 'sample_id'

TABLES = [
    {
        'name': 'Methylation_chr1',
        'info': 'Methylation chr1',
        'id': 'methylation_chr1'
    },
    {
        'name': 'Methylation_chr2',
        'info': 'Methylation chr2',
        'id': 'methylation_chr2'
    },
    {
        'name': 'Methylation_chr3',
        'info': 'Methylation chr3',
        'id': 'methylation_chr3'
    },
    {
        'name': 'Methylation_chr4',
        'info': 'Methylation chr4',
        'id': 'methylation_chr4'
    },
    {
        'name': 'Methylation_chr5',
        'info': 'Methylation chr5',
        'id': 'methylation_chr5'
    },
    {
        'name': 'Methylation_chr6',
        'info': 'Methylation chr6',
        'id': 'methylation_chr6'
    },
    {
        'name': 'Methylation_chr7',
        'info': 'Methylation chr7',
        'id': 'methylation_chr7'
    },
    {
        'name': 'Methylation_chr8',
        'info': 'Methylation chr8',
        'id': 'methylation_chr8'
    },
    {
        'name': 'Methylation_chr9',
        'info': 'Methylation chr9',
        'id': 'methylation_chr9'
    },
    {
        'name': 'Methylation_chr10',
        'info': 'Methylation chr10',
        'id': 'methylation_chr10'
    },
    {
        'name': 'Methylation_chr11',
        'info': 'Methylation chr11',
        'id': 'methylation_chr11'
    },
    {
        'name': 'Methylation_chr12',
        'info': 'Methylation chr12',
        'id': 'methylation_chr12'
    },
    {
        'name': 'Methylation_chr13',
        'info': 'Methylation chr13',
        'id': 'methylation_chr13'
    },
    {
        'name': 'Methylation_chr14',
        'info': 'Methylation chr14',
        'id': 'methylation_chr14'
    },
    {
        'name': 'Methylation_chr15',
        'info': 'Methylation chr15',
        'id': 'methylation_chr15'
    },
    {
        'name': 'Methylation_chr16',
        'info': 'Methylation chr16',
        'id': 'methylation_chr16'
    },
    {
        'name': 'Methylation_chr17',
        'info': 'Methylation chr17',
        'id': 'methylation_chr17'
    },
    {
        'name': 'Methylation_chr18',
        'info': 'Methylation chr18',
        'id': 'methylation_chr18'
    },
    {
        'name': 'Methylation_chr19',
        'info': 'Methylation chr19',
        'id': 'methylation_chr19'
    },
    {
        'name': 'Methylation_chr20',
        'info': 'Methylation chr20',
        'id': 'methylation_chr20'
    },
    {
        'name': 'Methylation_chr21',
        'info': 'Methylation chr21',
        'id': 'methylation_chr21'
    },
    {
        'name': 'Methylation_chr22',
        'info': 'Methylation chr22',
        'id': 'methylation_chr22'
    },
    {
        'name': 'Methylation_chrX',
        'info': 'Methylation chrX',
        'id': 'methylation_chrX'
    },
    {
        'name': 'Methylation_chrY',
        'info': 'Methylation chrY',
        'id': 'methylation_chrY'
    }
]

VALUES = ['beta_value']


def get_feature_type():
    return METH_FEATURE_TYPE


class METHFeatureDef(object):
    def __init__(self, probe, platform, chromosome):
        self.probe = probe
        self.platform = platform
        self.chromosome = chromosome

    @classmethod
    def from_feature_id(cls, feature_id):
        # Example ID: METH:cg08246323:HumanMethylation450:methylation_chr16
        regex = re_compile("^METH:"
                           # TODO better validation for probe name
                           "([a-zA-Z0-9_.\-]+):"
                           # platform
                           "(HumanMethylation27|HumanMethylation450):"
                           # validate outside - chromosome 1-23, X, Y, M
                           "methylation_chr(\d|\d\d|X|Y|M)$")

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        probe, platform, chromosome = feature_fields[0]

        valid_chr_set = frozenset([str(x) for x in xrange(1, 24)] + ['X', 'Y', 'M'])
        if chromosome not in valid_chr_set:
            raise FeatureNotFoundException(feature_id)

        return cls(probe, platform, chromosome)

    def __str__(self):
        return "METH:{probe}:{platform}:methylation_chr{chr}".format(
            probe=self.probe,
            platform=self.platform,
            chr=self.chromosome
        )


class METHFeatureProvider(object):
    TABLES = TABLES

    def __init__(self, feature_id):
        self.feature_type = ''
        self.cpg_probe = ''
        self.table_name = ''
        self.platform = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.METH

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['beta_value'])

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        query_template = \
            ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, beta_value "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE ( Probe_Id='{probe_id}' AND Platform='{platform}') "
             "AND SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
             ") ")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      probe_id=feature_def.probe, platform=feature_def.platform,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_METH: " + query)
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
                'beta_value': float(row['f'][3]['v'])
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

    def get_table_name_from_feature_def(self, feature_def):
        for table_info in self.TABLES:
            if table_info['id'].endswith(feature_def.chromosome):
                return table_info['name']

        raise Exception("Table not found for " + str(feature_def))

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = METHFeatureDef.from_feature_id(feature_id)
        self.table_name = self.get_table_name_from_feature_def(self.feature_def)

