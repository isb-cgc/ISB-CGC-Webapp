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

from bq_data_access.v2.errors import FeatureNotFoundException
from bq_data_access.v2.feature_value_types import ValueType, DataTypes
from bq_data_access.v2.utils import DurationLogged
from bq_data_access.data_types.cnvr import BIGQUERY_CONFIG
from scripts.feature_def_gen.copynumber_features import CNVRDataSourceConfig


logger = logging.getLogger('main_logger')

CNVR_FEATURE_TYPE = 'CNVR'
IDENTIFIER_COLUMN_NAME = 'sample_id'


def get_feature_type():
    return CNVR_FEATURE_TYPE


class CNVRFeatureDef(object):
    config_instance = CNVRDataSourceConfig.from_dict(BIGQUERY_CONFIG)

    # Regular expression for parsing the feature definition.
    #
    # Example ID: CNVR:max_segment_mean:X:133276258:133276370:cnvr_masked_hg19
    regex = re_compile("^v2:CNVR:"
                       # value
                       "(avg_segment_mean|min_segment_mean|max_segment_mean|num_segments):"
                       # validate outside - chromosome 1-23, X, Y, M
                       "(\d|\d\d|X|Y|M):"
                       # coordinates start:end
                       "(\d+):(\d+):"
                       # Table identifier
                       "(" + "|".join([table.internal_table_id for table in config_instance.data_table_list]) + ")$")

    def __init__(self, value_field, chromosome, start, end, internal_table_id):
        self.value_field = value_field
        self.chromosome = chromosome
        self.start = start
        self.end = end
        self.internal_table_id = internal_table_id

    def get_table_configuration(self):
        for table_config in self.config_instance.data_table_list:
            if table_config.internal_table_id == self.internal_table_id:
                return table_config

    @classmethod
    def from_feature_id(cls, feature_id):
        feature_fields = cls.regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        value_field, chromosome, start, end, internal_table_id = feature_fields[0]

        valid_chr_set = frozenset([str(x) for x in xrange(1, 24)] + ['X', 'Y', 'M'])
        if chromosome not in valid_chr_set:
            raise FeatureNotFoundException(feature_id)

        return cls(value_field, chromosome, start, end, internal_table_id)


class CNVRDataQueryHandler(object):
    def __init__(self, feature_id):
        self.feature_def = None
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    @classmethod
    def get_feature_type(cls):
        return DataTypes.CNVR

    @classmethod
    def can_convert_feature_id(cls):
        return False

    @classmethod
    def convert_feature_id(cls, feature_id):
        return None

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def build_query_for_program(self, feature_def, cohort_table, cohort_id_array, project_id_array):
        """
        Returns:
            Tuple (query_body, run_query).
            The "query_body" value is the BigQuery query string.
            The "run_query" is always True.
        """
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        value_field_bqsql = {
            'avg_segment_mean': 'AVG(segment_mean)',
            'min_segment_mean': 'MIN(segment_mean)',
            'max_segment_mean': 'MAX(segment_mean)',
            'num_segments': 'COUNT(*)'
        }

        query_template = \
            ("SELECT case_barcode AS case_id, sample_barcode AS sample_id, aliquot_barcode AS aliquot_id, {value_field} AS value {brk}"
             "FROM [{table_id}] {brk}"
             "WHERE ( chromosome='{chr}' AND ( {brk}"
             "        ( start_pos<{start} AND end_pos>{start} ) OR {brk}"
             "        ( start_pos>{start}-1 AND start_pos<{end}+1 ) ) ) {brk}"
             "AND sample_barcode IN ( {brk}"
             "    SELECT sample_barcode {brk}"
             "    FROM [{cohort_dataset_and_table}] {brk}"
             "    WHERE cohort_id IN ({cohort_id_list}) {brk}"
             ") {brk}"
             "GROUP BY case_id, sample_id, aliquot_id {brk}")

        table_config = feature_def.get_table_configuration()

        query = query_template.format(table_id=table_config.table_id,
                                      value_field=value_field_bqsql[feature_def.value_field],
                                      chr=feature_def.chromosome,
                                      start=feature_def.start, end=feature_def.end,
                                      cohort_dataset_and_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt,
                                      brk='\n')

        logging.debug("BQ_QUERY_CNVR: " + query)
        return query, [table_config.table_id.split(":")[-1]], True

    def build_query(self, project_set, cohort_table, cohort_id_array, project_id_array):
        query, tables_used, run_query = self.build_query_for_program(self.feature_def, cohort_table, cohort_id_array, project_id_array)
        return query, tables_used, run_query

    @DurationLogged('CNVR', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        result = []

        for row in query_result_array:
            result.append({
                'case_id': row['f'][0]['v'],
                'sample_id': row['f'][1]['v'],
                'aliquot_id': row['f'][2]['v'],
                'value': row['f'][3]['v']
            })

        return result

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = CNVRFeatureDef.from_feature_id(feature_id)

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            CNVRFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception:
            # CNVRFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
