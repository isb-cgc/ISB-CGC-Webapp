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

from builtins import object
from bq_data_access.v2.clinical_data import CLINICAL_FEATURE_TYPE
from bq_data_access.v2.feature_search.common import InvalidFieldException, EmptyQueryException
from bq_data_access.data_types.clinical import BIGQUERY_CONFIG
from scripts.feature_def_gen.clinical_features import CLINDataSourceConfig
from bq_data_access.v2.schema.program_schemas import TABLE_TO_SCHEMA_MAP


class ClinicalSearcher(object):
    config_instance = CLINDataSourceConfig.from_dict(BIGQUERY_CONFIG)
    feature_search_valid_fields = ['keyword']

    @classmethod
    def get_datatype_identifier(cls):
        return CLINICAL_FEATURE_TYPE

    @classmethod
    def get_searchable_fields(cls):
        return [
            {'name': 'keyword',
             'label': 'Keyword',
             'static': False},
        ]

    @classmethod
    def build_feature_label(cls, column_name):
        name_parts = []
        for part in column_name.split('_'):
            name_parts.append(part.capitalize())
        human_readable_name = ' '.join(name_parts)
        return human_readable_name

    def filter_by_name(self, keyword):
        result = []
        found_columns = set()
        for table_config in self.config_instance.data_table_list:
            schema = TABLE_TO_SCHEMA_MAP[table_config.table_id]

            for field_item in schema:
                name = field_item['name']
                if (name not in found_columns) and (name.find(keyword.replace(' ', '_').lower()) != -1):
                    found_columns.update([name])
                    result.append(field_item)

        return result

    def validate_feature_search_input(self, parameters):
        # Check that the input contains only allowed fields
        for field, keyword in parameters.items():
            if field not in self.feature_search_valid_fields:
                raise InvalidFieldException(self.get_datatype_identifier(), keyword, field)

        # At least one field has to have a non-empty keyword
        found_field = False
        for field, keyword in parameters.items():
            if len(keyword) > 0:
                found_field = True
                continue

        if not found_field:
            raise EmptyQueryException(self.get_datatype_identifier())

    def search(self, parameters):
        self.validate_feature_search_input(parameters)
        search_result = self.filter_by_name(parameters['keyword'])

        found_features = []
        for feature_item in search_result:
            column_name = feature_item['name']
            human_readable_name = self.build_feature_label(column_name)
            internal_id = 'v2:CLIN:' + column_name
            value_type = "N"

            if feature_item['type'] == "STRING" :
                value_type = "C"

            found_features.append({
                'feature_type': 'CLIN',
                'column_name': column_name,
                'internal_feature_id': internal_id,
                'label': human_readable_name,
                'type': value_type
            })

        return found_features
