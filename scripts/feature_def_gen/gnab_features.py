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
import logging

from bq_data_access.data_types.definitions import PlottableDataType

from jsonschema import validate as schema_validate, ValidationError

logger = logging


VALUE_FIELD_NUM_MUTATIONS = 'num_mutations'
VALUES = frozenset(['variant_classification', 'variant_type', 'sequence_source', VALUE_FIELD_NUM_MUTATIONS])
FIELDNAMES = ['gene_name', 'value_field', 'internal_feature_id']


GNAB_FEATURE_TYPE = PlottableDataType.GNAB


class GNABTableConfig(object):
    """
    Configuration class for a BigQuery table accessible through GNAB feature
    definitions.
    """
    def __init__(self, table_id, genomic_build, gene_label_field, internal_table_id, program):
        """
        Args:
            table_id: Full BigQuery table identifier - project-name:dataset_name.table_name 
        """
        self.table_id = table_id
        self.genomic_build = genomic_build
        self.gene_label_field = gene_label_field
        self.internal_table_id = internal_table_id
        self.program = program

    @classmethod
    def from_dict(cls, param):
        table_id = param['table_id']
        genomic_build = param['genomic_build']
        gene_label_field = param['gene_label_field']
        internal_table_id = param['internal_table_id']
        program = param['program']

        return cls(table_id, genomic_build, gene_label_field, internal_table_id, program)


class GNABDataSourceConfig(object):
    """
    Configuration class for GNAB feature definitions.
    """

    SCHEMA = {
        "type": "object",
        "properties": {
            "tables": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "program": {"enum": ["tcga", "target"]},
                        "table_id": {
                            "type": "string"
                        },
                        "internal_table_id": {
                            "type": "string"
                        },
                        "genomic_build": {"enum": ["hg19", "hg38"]},
                        "gene_label_field": {
                            "type": "string"
                        }
                    },
                    "required": ["program", "table_id", "internal_table_id", "gene_label_field", "genomic_build"]
                }
            }
        }
    }

    def __init__(self, supported_genomic_builds, tables_array):
        self.supported_genomic_builds = supported_genomic_builds
        self.data_table_list = tables_array

    @classmethod
    def from_dict(cls, param):
        """
        Throws:
            ValidationError if the data object does not match the required schema.
        """
        schema_validate(param, cls.SCHEMA)

        supported_genomic_builds = param['supported_genomic_builds']
        data_table_list = [GNABTableConfig.from_dict(item) for item in param['tables']]

        return cls(supported_genomic_builds, data_table_list)


