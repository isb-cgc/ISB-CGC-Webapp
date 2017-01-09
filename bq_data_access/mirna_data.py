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

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType, DataTypes
from bq_data_access.feature_data_provider import FeatureDataProvider
from bq_data_access.utils import DurationLogged

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
        'name': 'miRNA_Expression',
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
    # Regular expression for parsing the feature definition.
    #
    # Example ID: MIRN:hsa-mir-1244-1:mirna_illumina_ga_rpm
    regex = re_compile("^MIRN:"
                       # mirna name
                       "([a-zA-Z0-9._\-]+):"
                       # table
                       "(" + "|".join([table['feature_id'] for table in TABLES]) +
                       ")$")

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
        feature_fields = cls.regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        mirna_name, table_id = feature_fields[0]
        table_info = cls.get_table_info(table_id)
        platform = table_info['platform']
        value_field = table_info['value_field']

        return cls(mirna_name, platform, value_field, table_id)


class MIRNFeatureProvider(FeatureDataProvider):
    TABLES = TABLES

    def __init__(self, feature_id, **kwargs):
        self.feature_def = None
        self.table_info = None
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)
        super(MIRNFeatureProvider, self).__init__(**kwargs)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.MIRN

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array, project_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])
        project_id_stmt = ''
        if project_id_array is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

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
             "    WHERE cohort_id IN ({cohort_id_list})"
             "         AND (project_id IS NULL")

        query_template += (" OR project_id IN ({project_id_list})))" if project_id_array is not None else "))")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      mirna_name_field=mirna_name_field, mirna_name=feature_def.mirna_name,
                                      platform=feature_def.platform,
                                      value_field=feature_def.value_field,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt)

        logging.debug("BQ_QUERY_MIRN: " + query)
        return query

    @DurationLogged('MIRN', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array. The array will contain dicts with
        the following fields:
        - 'patient_id': Patient barcode
        - 'sample_id': Sample barcode
        - 'aliquot_id': Aliquot barcode
        - 'value': Value of the selected column from the miRNA data table

        Args:
            query_result_array: A BigQuery query response object

        Returns:
            Array of dict objects.
        """
        result = []

        for row in query_result_array:
            result.append({
                'patient_id': row['f'][0]['v'],
                'sample_id': row['f'][1]['v'],
                'aliquot_id': row['f'][2]['v'],
                'value': float(row['f'][3]['v'])
            })

        return result

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

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            MIRNFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception:
            # MIRNFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
