###
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
###

import logging

from scripts.feature_def_gen.feature_def_bq_provider import FeatureDefBigqueryProvider


logger = logging


# TODO remove duplicate code
def get_feature_type():
    return 'CNVR'


class CNVRFeatureDefBuilder(FeatureDefBigqueryProvider):
    BQ_JOB_POLL_SLEEP_TIME = 10
    BQ_JOB_POLL_MAX_RETRIES = 20

    MYSQL_SCHEMA = [
        {
            'name': 'gene_name',
            'type': 'string'
        },
        {
            'name': 'value_field',
            'type': 'string'
        },
        {
            'name': 'internal_feature_id',
            'type': 'string'
        },
        {
            'name': 'program_name',
            'type': 'string'
        },
        {
            'name': 'genomic_build',
            'type': 'string'
        },
    ]

    def __init__(self, config, **kwargs):
        super(CNVRFeatureDefBuilder, self).__init__(config, **kwargs)

        self.table_mapping = {}
        for index, table_item in enumerate(self.config.data_table_list):
            self.table_mapping[index] = table_item

    def get_mysql_schema(self):
        return self.MYSQL_SCHEMA

    def build_query(self, config):
        outer_template = \
            'SELECT table_index, gene_name, seq_name, start, end \n' \
            'FROM \n' \
            '{subquery_stmt}'

        table_queries = []
        for index, table_config in enumerate(config.data_table_list):
            query_template = ("("
                              "SELECT {index} AS table_index, gene_name, seq_name, start, end \
                               FROM [{gencode_reference_table_id}] \
                               WHERE feature=\'gene\'"
                              ")")

            query_str = query_template.format(
                index=index,
                gencode_reference_table_id=table_config.gencode_reference_table_id
            )

            table_queries.append(query_str)

        sq_stmt = ',\n'.join(table_queries)
        sq_stmt += ';'

        outer_query = outer_template.format(subquery_stmt=sq_stmt)
        return outer_query

    def build_internal_feature_id(self, feature_type, value_field, chromosome, start, end, table_config):
        return 'v2:{feature_type}:{value}:{chr}:{start}:{end}:{internal_table_id}'.format(
            feature_type=feature_type,
            value=value_field,
            chr=chromosome,
            start=start,
            end=end,
            internal_table_id=table_config.internal_table_id
        )

    def unpack_query_response(self, row_item_array):
        feature_type = get_feature_type()
        VALUES = ['avg_segment_mean', 'min_segment_mean', 'max_segment_mean', 'num_segments']

        result = []
        for row in row_item_array:
            table_index = int(row['f'][0]['v'])
            gene_name = row['f'][1]['v']
            seqname = row['f'][2]['v']
            chromosome = seqname[3:]
            start = row['f'][3]['v']
            end = row['f'][4]['v']

            table_config = self.table_mapping[table_index]

            for value_field in VALUES:
                result.append({
                    'gene_name': gene_name,
                    'value_field': value_field,
                    'genomic_build': table_config.genomic_build,
                    'program_name': table_config.program,
                    'internal_feature_id': self.build_internal_feature_id(feature_type, value_field, chromosome, start, end, table_config)
                })

        return result

