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

from scripts.feature_def_gen.feature_def_utils import DataSetConfig

logger = logging


class GEXPTableConfig(object):
    """
    Configuration class for a BigQuery table accessible through GEXP feature
    definitions.
    
    Args:
        table_name: Full BigQuery table identifier - project-name:dataset_name.table_name 
    
    """
    def __init__(self, table_name, platform, generating_center, value_label, value_field, internal_table_id):
        self.table_name = table_name
        self.platform = platform
        self.generating_center = generating_center
        self.value_label = value_label
        self.value_field = value_field
        self.internal_table_id = internal_table_id

    @classmethod
    def from_dict(cls, param):
        table_name = param['table_id']
        platform = param['platform']
        generating_center = param['generating_center']
        value_label = param['value_label']
        value_field = param['value_field']
        internal_table_id = param['feature_id']

        return cls(table_name, platform, generating_center, value_label, value_field, internal_table_id)


class GEXPFeatureDefConfig(object):
    """
    Configuration class for GEXP feature definitions.
    """
    def __init__(self, reference, target_config, gene_label_field, tables_array):
        self.reference_config = reference
        self.target_config = target_config
        self.gene_label_field = gene_label_field
        self.data_table_list = tables_array

    @classmethod
    def from_dict(cls, param):
        reference_config = DataSetConfig.from_dict(param['reference_config'])
        target_config = DataSetConfig.from_dict(param['target_config'])
        gene_label_field = param['gene_label_field']
        data_table_list = [GEXPTableConfig.from_dict(item) for item in param['tables']]

        return cls(reference_config, target_config, gene_label_field, data_table_list)


