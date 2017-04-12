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
    def __init__(self, table_id, platform_version, platform, gene_label_field, generating_center, value_label, value_field,
                 internal_table_id, project):
        self.table_id = table_id
        self.platform = platform
        self.platform_version = platform_version
        self.gene_label_field = gene_label_field
        self.generating_center = generating_center
        self.value_label = value_label
        self.value_field = value_field
        self.internal_table_id = internal_table_id
        self.project = project

    @classmethod
    def from_dict(cls, param):
        table_id = param['table_id']
        platform_version = param['platform_version']
        platform = param['platform']
        gene_label_field = param['gene_label_field']
        generating_center = param['generating_center']
        value_label = param['value_label']
        value_field = param['value_field']
        internal_table_id = param['internal_table_id']
        project = param['project']

        return cls(table_id, platform_version, platform, gene_label_field, generating_center, value_label, value_field,
                   internal_table_id, project)


class GEXPFeatureDefConfig(object):
    """
    Configuration class for GEXP feature definitions.
    """
    def __init__(self, reference, gene_label_field, supported_platform_versions, tables_array):
        self.reference_config = reference
        self.gene_label_field = gene_label_field
        self.supported_platform_versions = supported_platform_versions
        self.data_table_list = tables_array

    @classmethod
    def from_dict(cls, param):
        reference_config = DataSetConfig.from_dict(param['reference_config'])
        gene_label_field = param['gene_label_field']
        supported_platform_versions = param['supported_platform_versions']
        data_table_list = [GEXPTableConfig.from_dict(item) for item in param['tables']]

        return cls(reference_config, gene_label_field, supported_platform_versions, data_table_list)


