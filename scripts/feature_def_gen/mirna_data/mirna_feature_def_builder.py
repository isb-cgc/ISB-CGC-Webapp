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


def get_feature_type():
    return 'MIRN'


class MIRNFeatureDefBuilder(FeatureDefBigqueryProvider):
    MYSQL_SCHEMA = [
        {
            'name': 'mirna_name',
            'type': 'string'
        },
        {
            'name': 'internal_feature_id',
            'type': 'string'
        },
        {
            'name': 'genomic_build',
            'type': 'string'
        },
    ]

    def get_mysql_schema(self):
        return self.MYSQL_SCHEMA

    def build_internal_feature_id(self, feature_type, mirna_name, genomic_build):
        return 'v2:{feature_type}:{mirna_name}:{genomic_build}'.format(
            feature_type=feature_type,
            mirna_name=mirna_name,
            genomic_build=genomic_build
        )

    def build_query(self, config):
        outer_template = \
            'SELECT build_id, mirna_id \n' \
            'FROM \n' \
            '{subquery_stmt}'

        build_queries = []
        for build in self.config.supported_genomic_builds:
            build_template = \
                '(' \
                'SELECT \'{build_id}\' AS build_id, mirna_id \n' \
                'FROM (' \
                '   SELECT mirna_id \n' \
                '   FROM \n' \
                '   {build_tables_stmt} \n' \
                '   GROUP BY mirna_id \n' \
                '))'

            # Find tables that match the platform
            build_tables = [t for t in config.data_table_list if t.genomic_build == build]

            table_queries = []
            for table_config in build_tables:
                table_query_template = \
                    '(' \
                    'SELECT {mirna_id_field} AS mirna_id ' \
                    'FROM [{table_id}] ' \
                    'WHERE {mirna_id_field} IS NOT NULL ' \
                    ')'

                table_query_str = table_query_template.format(
                    mirna_id_field=table_config.mirna_id_field,
                    table_id=table_config.table_id
                )

                table_queries.append(table_query_str)

            build_stmt = ',\n'.join(table_queries)
            build_query = build_template.format(build_id=build,
                                                build_tables_stmt=build_stmt)
            build_queries.append(build_query)

        sq_stmt = ',\n'.join(build_queries)
        sq_stmt += ';'

        outer_query = outer_template.format(subquery_stmt=sq_stmt)
        return outer_query

    def build_table_mapping(self, config):
        result = {}
        for table_item in config.data_table_list:
            result[table_item.internal_table_id] = table_item
        return result

    def unpack_query_response(self, row_item_array):
        feature_type = get_feature_type()
        result = []
        for row in row_item_array:
            genomic_build = row['f'][0]['v']
            mirna_name = row['f'][1]['v']

            result.append({
                'mirna_name': mirna_name,
                'genomic_build': genomic_build,
                'internal_feature_id': self.build_internal_feature_id(feature_type, mirna_name, genomic_build)
            })

        return result

