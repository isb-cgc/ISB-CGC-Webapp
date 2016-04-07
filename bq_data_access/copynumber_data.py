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

CNVR_FEATURE_TYPE = 'CNVR'
IDENTIFIER_COLUMN_NAME = 'sample_id'


def get_feature_type():
    return CNVR_FEATURE_TYPE


class CNVRFeatureDef(object):
    # Regular expression for parsing the feature definition.
    #
    # Example ID: CNVR:max_segment_mean:X:133276258:133276370
    regex = re_compile("^CNVR:"
                       # value
                       "(avg_segment_mean|std_dev_segment_mean|min_segment_mean|max_segment_mean|num_segments):"
                       # validate outside - chromosome 1-23, X, Y, M
                       "(\d|\d\d|X|Y|M):"
                       # coordinates start:end
                       "(\d+):(\d+)$")

    def __init__(self, value_field, chromosome, start, end):
        self.value_field = value_field
        self.chromosome = chromosome
        self.start = start
        self.end = end

    @classmethod
    def from_feature_id(cls, feature_id):
        feature_fields = cls.regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        logging.debug(feature_fields)
        value_field, chromosome, start, end = feature_fields[0]

        valid_chr_set = frozenset([str(x) for x in xrange(1, 24)] + ['X', 'Y', 'M'])
        if chromosome not in valid_chr_set:
            raise FeatureNotFoundException(feature_id)

        return cls(value_field, chromosome, start, end)


class CNVRFeatureProvider(FeatureDataProvider):
    TABLES = [
        {
            'name': 'CNV',
            'info': 'CNV',
            'id': 'cnv'
        }
    ]

    def __init__(self, feature_id, **kwargs):
        self.table_name = ''
        self.feature_def = None
        self.parse_internal_feature_id(feature_id)
        super(CNVRFeatureProvider, self).__init__(**kwargs)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.CNVR

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        value_field_bqsql = {
            'avg_segment_mean': 'AVG(Segment_Mean)',
            'std_dev_segment_mean': 'STDDEV(Segment_Mean)',
            'min_segment_mean': 'MIN(Segment_Mean)',
            'max_segment_mean': 'MAX(Segment_Mean)',
            'num_segments': 'COUNT(*)'
        }

        query_template = \
            ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, {value_field} AS value "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE ( Chromosome='{chr}' AND ( "
             "        ( Start<{start} AND End>{start} ) OR "
             "        ( Start>{start}-1 AND Start<{end}+1 ) ) ) "
             "AND SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
             ") "
             "GROUP BY ParticipantBarcode, SampleBarcode, AliquotBarcode")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      value_field=value_field_bqsql[feature_def.value_field],
                                      chr=feature_def.chromosome,
                                      start=feature_def.start, end=feature_def.end,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_CNVR: " + query)
        return query

    @DurationLogged('CNVR', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        result = []

        for row in query_result_array:
            result.append({
                'patient_id': row['f'][0]['v'],
                'sample_id': row['f'][1]['v'],
                'aliquot_id': row['f'][2]['v'],
                'value': row['f'][3]['v']
            })

        return result

    def get_table_name(self):
        return self.TABLES[0]['name']

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = CNVRFeatureDef.from_feature_id(feature_id)
        self.table_name = self.get_table_name()

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
