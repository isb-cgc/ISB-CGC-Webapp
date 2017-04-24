"""

Copyright 2016, Institute for Systems Biology

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

from feature_def_bq_provider import FeatureDefBigqueryProvider

from scripts.feature_def_gen.feature_def_utils import DataSetConfig

logger = logging




class MIRNTableConfig(object):
    def __init__(self, table_name, platform, info, value_label, value_field, internal_table_id, expr_table):
        self.table_name = table_name
        self.platform = platform
        self.info = info
        self.value_label = value_label
        self.value_field = value_field
        self.internal_table_id = internal_table_id
        self.is_expression_table = expr_table

    @classmethod
    def from_dict(cls, param):
        logger.info(cls.__name__ + ".from_dict - table: \'" + param['name'] + "\'")
        table_name = param['name']
        platform = param['platform']
        info = param['info']
        value_label = param['value_label']
        value_field = param['value_field']
        internal_table_id = param['feature_id']
        expression_table = param['expression_table']

        return cls(table_name, platform, info, value_label, value_field, internal_table_id, expression_table)


class MIRNFeatureDefConfig(object):
    def __init__(self, reference, target_config, tables_array):
        self.reference_config = reference
        self.target_config = target_config
        self.data_table_list = tables_array

    @classmethod
    def from_dict(cls, param):
        reference_config = DataSetConfig.from_dict(param['reference_config'])
        target_config = DataSetConfig.from_dict(param['target_config'])
        data_table_list = [MIRNTableConfig.from_dict(item) for item in param['tables']]

        return cls(reference_config, target_config, data_table_list)


# TODO remove duplicate code
def get_feature_type():
    return 'MIRN'


class MIRNFeatureDefProvider(FeatureDefBigqueryProvider):
    MYSQL_SCHEMA = [
        {
            'name': 'mirna_name',
            'type': 'string'
        },
        {
            'name': 'platform',
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
    ]

    def get_mysql_schema(self):
        return self.MYSQL_SCHEMA

    def build_internal_feature_id(self, feature_type, mirna_name, feature_table_id):
        return '{feature_type}:{mirna_name}:{feature_table_id}'.format(
            feature_type=feature_type,
            mirna_name=mirna_name,
            feature_table_id=feature_table_id
        )

    def build_table_query(self, config, table_config):
        if table_config.is_expression_table:
            mir_name = 'mirna_id'
            query_template =\
                'SELECT \'{table_name}\' AS table_name, {mir_name} AS mirna_name, Platform ' \
                'FROM [{main_project_name}:{main_dataset_name}.{table_name}] ' \
                'GROUP BY mirna_name, Platform '
        else:
            mir_name = 'miRNA_ID'
            query_template = \
                'SELECT \'{table_name}\' AS table_name, {mir_name} AS mirna_name ' \
                'FROM [{main_project_name}:{main_dataset_name}.{table_name}] ' \
                'GROUP BY mirna_name'

        query = query_template.format(
            mir_name=mir_name,
            main_project_name=config.target_config.project_name,
            main_dataset_name=config.target_config.dataset_name,
            table_name=table_config.table_name
        )

        return query

    def build_table_mapping(self, config):
        result = {}
        for table_item in config.data_table_list:
            result[table_item.table_name] = table_item
        return result

    def build_subqueries_for_tables(self, config):
        query_strings = []
        for table_item in config.data_table_list:
            query = self.build_table_query(config, table_item)
            query_strings.append(query)

        return query_strings

    def merge_queries(self, query_strings):
        # Union of the subqueries
        result = []

        for subquery in query_strings:
            result.append("   ({query})".format(query=subquery))

        sq_stmt = ',\n'.join(result)
        sq_stmt += ';'

        query_tpl = \
            'SELECT table_name, mirna_name \n' \
            'FROM \n' \
            '{subquery_stmt}'

        query = query_tpl.format(subquery_stmt=sq_stmt)

        return query

    def build_table_mapping(self, config):
        result = {}
        for table_item in config.data_table_list:
            result[table_item.table_name] = table_item
        return result

    def build_query(self, config):
        query_strings = self.build_subqueries_for_tables(config)
        query = self.merge_queries(query_strings)
        return query

    def unpack_query_response(self, row_item_array):
        table_config_mapping = self.build_table_mapping(self.config)

        feature_type = get_feature_type()
        result = []
        for row in row_item_array:
            table_name = row['f'][0]['v']
            mirna_name = row['f'][1]['v']

            table_config = table_config_mapping[table_name]

            result.append({
                'mirna_name': mirna_name,
                'platform': table_config.platform,
                'value_field': table_config.value_label,
                'internal_feature_id': self.build_internal_feature_id(feature_type, mirna_name, table_config.internal_table_id)
            })

        return result

