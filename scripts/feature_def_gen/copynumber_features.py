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

from builtins import str
from builtins import object
import logging

from bq_data_access.data_types.definitions import PlottableDataType

logger = logging

CNV_FEATURE_TYPE = PlottableDataType.CNVR


class CNVRTableConfig(object):
    """
    Configuration class for a BigQuery table accessible through GNAB feature
    definitions.
    
    Args:
        table_id: Full BigQuery table identifier - project-name:dataset_name.table_name 
    
    """
    def __init__(self, table_id, gencode_reference_table_id, genomic_build, gene_label_field, internal_table_id, program, value_field):
        self.table_id = table_id
        self.gencode_reference_table_id = gencode_reference_table_id
        self.genomic_build = genomic_build
        self.gene_label_field = gene_label_field
        self.internal_table_id = internal_table_id
        self.program = program
        self.value_field = value_field

    @classmethod
    def from_dict(cls, param):
        table_id = param['table_id']
        gencode_reference_table_id = param['gencode_reference_table_id']
        genomic_build = param['genomic_build']
        gene_label_field = param['gene_label_field']
        internal_table_id = param['internal_table_id']
        program = param['program']
        value_field = param['value_field']

        return cls(table_id, gencode_reference_table_id, genomic_build, gene_label_field, internal_table_id, program, value_field)

    def __str__(self):
        return "Table: {}, GenCode Ref Table: {}, Build: {}, Program: {}, Value Field: {}".format(
            self.table_id,
            self.gencode_reference_table_id,
            self.genomic_build,
            self.program,
            self.value_field
        )

    def __repr__(self):
        return self.__str__()

class CNVRDataSourceConfig(object):
    """
    Configuration class for GNAB feature definitions.
    """
    def __init__(self, tables_array):
        self.data_table_list = tables_array

    def __str__(self):
        return str(self.data_table_list)

    def __repr__(self):
        return self.__str__()


    @classmethod
    def from_dict(cls, param):
        data_table_list = [CNVRTableConfig.from_dict(item) for item in param['tables']]

        return cls(data_table_list)

