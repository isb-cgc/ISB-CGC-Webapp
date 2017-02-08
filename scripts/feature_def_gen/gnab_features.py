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


VALUE_FIELD_NUM_MUTATIONS = 'num_mutations'
VALUES = frozenset(['variant_classification', 'variant_type', 'sequence_source', VALUE_FIELD_NUM_MUTATIONS])
FIELDNAMES = ['gene_name', 'value_field', 'internal_feature_id']

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
]


class GNABFeatureDefConfig(object):
    def __init__(self, target_config, maf_table_name):
        self.target_config = target_config
        self.maf_table_name = maf_table_name

    @classmethod
    def from_dict(cls, param):
        target_config = DataSetConfig.from_dict(param['target_config'])
        maf_table_name = param['maf_table_name']

        return cls(target_config, maf_table_name)


def build_internal_feature_id(feature_type, gene, value_field):
    return '{feature_type}:{gene}:{value}'.format(
        feature_type=feature_type,
        gene=gene,
        value=value_field
    )


# TODO remove duplicate code
def get_feature_type():
    return 'GNAB'


class GNABFeatureDefProvider(FeatureDefBigqueryProvider):
    def get_mysql_schema(self):
        return MYSQL_SCHEMA

    def build_query(self, config):
        query_template = \
            'SELECT Hugo_Symbol ' \
            'FROM [{main_project_name}:{main_dataset_name}.{table_name}] ' \
            'GROUP BY Hugo_Symbol'

        query_str = query_template.format(
            main_project_name=config.target_config.project_name,
            main_dataset_name=config.target_config.dataset_name,
            table_name=config.maf_table_name
        )

        return query_str

    def unpack_query_response(self, row_item_array):
        feature_type = get_feature_type()
        result = []
        for row in row_item_array:
            gene_name = row['f'][0]['v']

            for value_field in VALUES:
                result.append({
                    'gene_name': gene_name,
                    'value_field': value_field,
                    'internal_feature_id': build_internal_feature_id(feature_type, gene_name, value_field)
                })

        return result

