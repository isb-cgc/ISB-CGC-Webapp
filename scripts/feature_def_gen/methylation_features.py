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

from builtins import str
from builtins import range
from builtins import object
import logging

from bq_data_access.data_types.definitions import PlottableDataType

logger = logging

METH_FEATURE_TYPE = PlottableDataType.METH


class METHTableConfig(object):
    """
    Configuration class for a BigQuery table accessible through METH feature
    definitions.
    
    Args:
        table_name: Full BigQuery table identifier - project-name:dataset_name.table_name 
    
    """
    def __init__(self, table_id, chromosome, genomic_build, value_field,
                 internal_table_id, program):
        self.table_id = table_id
        self.chromosome = chromosome
        self.genomic_build = genomic_build
        self.value_field = value_field
        self.internal_table_id = internal_table_id
        self.program = program

    def __str__(self):
        return "METHTableConfig(table_id: {}, chr: {}, build: {}, value_field: {}, internal_table_id: {}, program: {})".format(
            str(self.table_id),str(self.chromosome),str(self.genomic_build),str(self.value_field),str(self.internal_table_id),str(self.program)
        )

    def __repr__(self):
        return self.__str__()

    @classmethod
    def from_dict(cls, param):
        table_id = param['table_id']
        chromosome = param['chromosome']
        genomic_build = param['genomic_build']
        value_field = param['value_field']
        internal_table_id = param['internal_table_id']
        program = param['program']

        return cls(table_id, chromosome, genomic_build, value_field, internal_table_id, program)


class METHDataSourceConfig(object):
    """
    Configuration class for METH feature definitions.
    """
    CHROMOSOMES = [str(c) for c in range(1, 23)]
    CHROMOSOMES.extend(['X', 'Y'])

    def __init__(self, methylation_annotation_table_id, supported_genomic_builds, table_templates):
        self.methylation_annotation_table_id = methylation_annotation_table_id
        # TODO Remove "supported_genomic_builds" if not needed
        self.supported_genomic_builds = supported_genomic_builds

        self.data_table_list = []

        for c in self.CHROMOSOMES:
            for table_template in table_templates:
                table_config = {key: table_template[key] for key in ['genomic_build', 'value_field', 'program']}
                table_config.update({
                    "table_id": table_template['table_id_prefix'] + c,
                    "chromosome": c,
                    "internal_table_id": table_template['genomic_build'] + '_chr' + c.lower()
                })
                self.data_table_list.append(METHTableConfig.from_dict(table_config))

    @classmethod
    def from_dict(cls, param):
        methylation_annotation_table_id = param['methylation_annotation_table_id']
        supported_genomic_builds = param['supported_genomic_builds']

        return cls(methylation_annotation_table_id, supported_genomic_builds, param['table_structure'])


