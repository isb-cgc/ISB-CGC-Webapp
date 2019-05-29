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

from builtins import object
import logging

from bq_data_access.data_types.definitions import PlottableDataType

logger = logging


MIRN_FEATURE_TYPE = PlottableDataType.MIRN


class MIRNTableConfig(object):
    """
    Configuration class for a BigQuery table accessible through MIRN feature
    definitions.
    
    """
    def __init__(self, table_id, mirna_id_field, value_label, value_field, genomic_build, internal_table_id, program):
        """
        Args:
            table_id: Full BigQuery table identifier - project-name:dataset_name.table_name 
        """
        self.table_id = table_id
        self.mirna_id_field = mirna_id_field
        self.genomic_build = genomic_build
        self.value_label = value_label
        self.value_field = value_field
        self.internal_table_id = internal_table_id
        self.program = program

    @classmethod
    def from_dict(cls, param):
        table_id = param['table_id']
        mirna_id_field = param['mirna_id_field']
        genomic_build = param['genomic_build']
        value_label = param['value_label']
        value_field = param['value_field']
        internal_table_id = param['internal_table_id']
        program = param['program']

        return cls(table_id, mirna_id_field, value_label, value_field, genomic_build, internal_table_id, program)


class MIRNDataSourceConfig(object):
    """
    Configuration class for MIRN feature definitions.
    """
    def __init__(self, supported_genomic_builds, tables_array):
        self.supported_genomic_builds = supported_genomic_builds
        self.data_table_list = tables_array

    @classmethod
    def from_dict(cls, param):
        supported_genomic_builds = param['supported_genomic_builds']
        data_table_list = [MIRNTableConfig.from_dict(item) for item in param['tables']]

        return cls(supported_genomic_builds, data_table_list)
