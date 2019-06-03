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


VALUE_FIELD_NUM_MUTATIONS = 'num_mutations'
VALUES = frozenset(['Variant_Classification', 'Variant_type', VALUE_FIELD_NUM_MUTATIONS])

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


class GNABFeatureDefBuilder(FeatureDefBigqueryProvider):
    def get_mysql_schema(self):
        return MYSQL_SCHEMA

    def build_internal_feature_id(self, feature_type, gene, value_field, table_config):
        # Example ID: v2:GNAB:SMYD3:hg19_mc3:Variant_Classification
        return 'v2:{feature_type}:{gene}:{internal_table_id}:{value_field}'.format(
            feature_type=feature_type,
            gene=gene,
            internal_table_id=table_config.internal_table_id,
            value_field=value_field
        )

    def get_feature_type(self):
        return 'GNAB'

    def build_query(self, config):
        outer_template = \
            'SELECT table_id, gene_label \n' \
            'FROM \n' \
            '{subquery_stmt}'

        table_queries = []
        for table_config in config.data_table_list:
            query_template = \
                '(' \
                'SELECT \'{table_id}\' AS table_id, {gene_label_field} AS gene_label ' \
                'FROM [{table_id}] ' \
                'GROUP BY gene_label' \
                ')'

            query_str = query_template.format(
                gene_label_field=table_config.gene_label_field,
                table_id=table_config.table_id
            )

            table_queries.append(query_str)

        sq_stmt = ',\n'.join(table_queries)
        sq_stmt += ';'

        outer_query = outer_template.format(subquery_stmt=sq_stmt)
        return outer_query

    def build_table_mapping(self, config):
        result = {}
        for table_item in config.data_table_list:
            result[table_item.table_id] = table_item
        return result

    def unpack_query_response(self, row_item_array):
        table_config_mapping = self.build_table_mapping(self.config)
        feature_type = self.get_feature_type()
        result = []
        for row in row_item_array:
            table_id = row['f'][0]['v']
            gene_name = row['f'][1]['v']
            table_config = table_config_mapping[table_id]

            for value_field in VALUES:
                internal_feature_id = self.build_internal_feature_id(feature_type, gene_name, value_field, table_config)

                result.append({
                    'gene_name': gene_name,
                    'genomic_build': table_config.genomic_build,
                    'value_field': value_field,
                    'program_name': table_config.program,
                    'internal_feature_id': internal_feature_id
                })

        return result
