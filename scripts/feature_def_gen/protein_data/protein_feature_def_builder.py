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
    return 'RPPA'


def build_internal_feature_id(feature_type, gene, protein, table_config):
    return 'v2:{feature_type}:{gene}:{protein}:{internal_table_id}'.format(
        feature_type=feature_type,
        gene=gene,
        protein=protein,
        internal_table_id=table_config.internal_table_id
    )


class RPPAFeatureDefBuilder(FeatureDefBigqueryProvider):
    MYSQL_SCHEMA = [
        {
            'name': 'gene_name',
            'type': 'string'
        },
        {
            'name': 'protein_name',
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

    TABLE_ID_FIELD = "internal_feature_id"

    def get_mysql_schema(self):
        return self.MYSQL_SCHEMA

    def build_query(self, config):
        outer_template = \
            'SELECT internal_table_id, gene_label, protein_name \n' \
            'FROM \n' \
            '{subquery_stmt}'

        table_queries = []
        for table_config in config.data_table_list:
            query_template = \
                '( ' \
                'SELECT \'{table_id_field}\' AS internal_table_id, {gene_label_field} AS gene_label, protein_name ' \
                'FROM [{table_id}] ' \
                'WHERE {gene_label_field} IS NOT NULL ' \
                'GROUP BY gene_label, protein_name' \
                ')'

            query_str = query_template.format(
                table_id=table_config.table_id,
                table_id_field=table_config.internal_table_id,
                gene_label_field=table_config.gene_label_field
            )

            table_queries.append(query_str)

        sq_stmt = ',\n'.join(table_queries)
        sq_stmt += ';'

        outer_query = outer_template.format(subquery_stmt=sq_stmt)
        return outer_query

    def build_table_mapping(self, config):
        result = {}
        for table_item in config.data_table_list:
            result[table_item.internal_table_id] = table_item
        return result

    def unpack_query_response(self, row_item_array):
        table_config_mapping = self.build_table_mapping(self.config)
        feature_type = get_feature_type()
        result = []
        for row in row_item_array:
            internal_table_id = row['f'][0]['v']
            gene_name = row['f'][1]['v']
            protein_name = row['f'][2]['v']
            table_config = table_config_mapping[internal_table_id]

            result.append({
                'gene_name': gene_name,
                'protein_name': protein_name,
                'value_field': table_config.value_field,
                'internal_feature_id': build_internal_feature_id(feature_type, gene_name, protein_name, table_config),
                'genomic_build': table_config.genomic_build,
                'program_name': table_config.program
            })

        return result


