"""

Copyright 2017, Institute for Systems Biology

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

from enum import Enum

from bq_data_access.data_types.clinical import BIGQUERY_CONFIG
from scripts.feature_def_gen.clinical_features import CLINDataSourceConfig
from bq_data_access.v2.schema.program_schemas import TABLE_TO_SCHEMA_MAP


class ClinicalColumnNameMappingStatus(Enum):
    SUCCESS = 0
    ALL_COLUMNS_NOT_FOUND = 1


class ClinicalColumnFeatureSupport(object):
    @classmethod
    def get_features_ids_for_column_names(cls, column_name_list):
        config_instance = CLINDataSourceConfig.from_dict(BIGQUERY_CONFIG)
        column_set = set(column_name_list)

        # Create a set of all valid column names
        valid_column_set = set()

        for table_config in config_instance.data_table_list:
            schema = TABLE_TO_SCHEMA_MAP[table_config.table_id]
            valid_column_set.update([item['name'] for item in schema])

        # All input columns should be in the table schemas
        result = column_set.intersection(valid_column_set)
        if result != column_set:
            not_found_columns = list(column_set.difference(valid_column_set))

            return {
                "status": ClinicalColumnNameMappingStatus.ALL_COLUMNS_NOT_FOUND,
                "not_found_columns": not_found_columns
            }

        feature_ids = {}
        for column_name in column_set:
            clinical_feature_id = "v2:CLIN:{}".format(column_name)
            feature_ids[column_name] = clinical_feature_id

        return {
            "status": ClinicalColumnNameMappingStatus.SUCCESS,
            "clinical_feature_ids": feature_ids
        }









