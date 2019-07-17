#
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from builtins import str
from builtins import range
from builtins import object
import logging
from re import compile as re_compile
from django.conf import settings

from bq_data_access.v1.feature_data_provider import FeatureDataProvider
from bq_data_access.v1.errors import FeatureNotFoundException
from bq_data_access.v1.feature_value_types import ValueType, DataTypes
from bq_data_access.v1.utils import DurationLogged

METH_FEATURE_TYPE = 'METH'
IDENTIFIER_COLUMN_NAME = 'sample_id'

TABLES = [
    {
        'name': 'DNA_Methylation_chr1',
        'info': 'Methylation chr1',
        'id': 'methylation_chr1'
    },
    {
        'name': 'DNA_Methylation_chr2',
        'info': 'Methylation chr2',
        'id': 'methylation_chr2'
    },
    {
        'name': 'DNA_Methylation_chr3',
        'info': 'Methylation chr3',
        'id': 'methylation_chr3'
    },
    {
        'name': 'DNA_Methylation_chr4',
        'info': 'Methylation chr4',
        'id': 'methylation_chr4'
    },
    {
        'name': 'DNA_Methylation_chr5',
        'info': 'Methylation chr5',
        'id': 'methylation_chr5'
    },
    {
        'name': 'DNA_Methylation_chr6',
        'info': 'Methylation chr6',
        'id': 'methylation_chr6'
    },
    {
        'name': 'DNA_Methylation_chr7',
        'info': 'Methylation chr7',
        'id': 'methylation_chr7'
    },
    {
        'name': 'DNA_Methylation_chr8',
        'info': 'Methylation chr8',
        'id': 'methylation_chr8'
    },
    {
        'name': 'DNA_Methylation_chr9',
        'info': 'Methylation chr9',
        'id': 'methylation_chr9'
    },
    {
        'name': 'DNA_Methylation_chr10',
        'info': 'Methylation chr10',
        'id': 'methylation_chr10'
    },
    {
        'name': 'DNA_Methylation_chr11',
        'info': 'Methylation chr11',
        'id': 'methylation_chr11'
    },
    {
        'name': 'DNA_Methylation_chr12',
        'info': 'Methylation chr12',
        'id': 'methylation_chr12'
    },
    {
        'name': 'DNA_Methylation_chr13',
        'info': 'Methylation chr13',
        'id': 'methylation_chr13'
    },
    {
        'name': 'DNA_Methylation_chr14',
        'info': 'Methylation chr14',
        'id': 'methylation_chr14'
    },
    {
        'name': 'DNA_Methylation_chr15',
        'info': 'Methylation chr15',
        'id': 'methylation_chr15'
    },
    {
        'name': 'DNA_Methylation_chr16',
        'info': 'Methylation chr16',
        'id': 'methylation_chr16'
    },
    {
        'name': 'DNA_Methylation_chr17',
        'info': 'Methylation chr17',
        'id': 'methylation_chr17'
    },
    {
        'name': 'DNA_Methylation_chr18',
        'info': 'Methylation chr18',
        'id': 'methylation_chr18'
    },
    {
        'name': 'DNA_Methylation_chr19',
        'info': 'Methylation chr19',
        'id': 'methylation_chr19'
    },
    {
        'name': 'DNA_Methylation_chr20',
        'info': 'Methylation chr20',
        'id': 'methylation_chr20'
    },
    {
        'name': 'DNA_Methylation_chr21',
        'info': 'Methylation chr21',
        'id': 'methylation_chr21'
    },
    {
        'name': 'DNA_Methylation_chr22',
        'info': 'Methylation chr22',
        'id': 'methylation_chr22'
    },
    {
        'name': 'DNA_Methylation_chrX',
        'info': 'Methylation chrX',
        'id': 'methylation_chrX'
    },
    {
        'name': 'DNA_Methylation_chrY',
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

        valid_chr_set = frozenset([str(x) for x in range(1, 24)] + ['X', 'Y', 'M'])
        if chromosome not in valid_chr_set:
            raise FeatureNotFoundException(feature_id)

        return cls(probe, platform, chromosome)

    def __str__(self):
        return "METH:{probe}:{platform}:methylation_chr{chr}".format(
            probe=self.probe,
            platform=self.platform,
            chr=self.chromosome
        )


class METHFeatureProvider(FeatureDataProvider):
    TABLES = TABLES

    def __init__(self, feature_id, **kwargs):
        self.feature_type = ''
        self.cpg_probe = ''
        self.feature_def = None
        self.table_name = ''
        self.platform = ''
        self.parse_internal_feature_id(feature_id)
        super(METHFeatureProvider, self).__init__(**kwargs)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.METH

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['beta_value']

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array, project_id_array):
        cohort_project_name=settings.GCLOUD_PROJECT_ID
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])
        project_id_stmt = ''
        if project_id_array is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

        query_template = \
            ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, beta_value "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE ( Probe_Id='{probe_id}' AND Platform='{platform}') "
             "AND SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{cohort_project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})"
             "         AND (project_id IS NULL")

        query_template += (" OR project_id IN ({project_id_list})))" if project_id_array is not None else "))")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      probe_id=feature_def.probe, platform=feature_def.platform, cohort_project_name=cohort_project_name,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt)

        logging.debug("BQ_QUERY_METH: " + query)
        return query

    @DurationLogged('METH', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array. The array will contain dicts with
        the following fields:
        - 'case_id': Patient barcode
        - 'sample_id': Sample barcode
        - 'aliquot_id': Aliquot barcode
        - 'value': Value of the selected column from the clinical data table

        Args:
            query_result_array: A BigQuery query response object

        Returns:
            Array of dict objects.
        """
        result = []

        for row in query_result_array:
            result.append({
                'case_id': row['f'][0]['v'],
                'sample_id': row['f'][1]['v'],
                'aliquot_id': row['f'][2]['v'],
                'beta_value': float(row['f'][3]['v'])
            })

        return result

    def get_table_name_from_feature_def(self, feature_def):
        for table_info in self.TABLES:
            if table_info['id'].endswith(feature_def.chromosome):
                return table_info['name']

        raise Exception("Table not found for " + str(feature_def))

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = METHFeatureDef.from_feature_id(feature_id)
        self.table_name = self.get_table_name_from_feature_def(self.feature_def)

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            METHFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception:
            # METHFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
