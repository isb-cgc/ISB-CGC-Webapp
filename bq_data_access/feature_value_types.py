"""

Copyright 2015, Institute for Systems Biology

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

from protorpc.messages import Enum


def enum(**enums):
    return type('Enum', (), enums)

# TODO decouple from protorpc.messages
class ValueType(Enum):
    STRING = 1
    INTEGER = 2
    FLOAT = 3
    BOOLEAN = 4
    UNKNOWN = 5 # We can get queries that return no data, which may be of an unknown type


def is_log_transformable(attr_type):
    return isinstance(attr_type, ValueType) and (attr_type == ValueType.FLOAT or attr_type == ValueType.INTEGER)

IdentifierTypes = enum(PATIENT=1, SAMPLE=2, ALIQUOT=3)
DataTypes = enum(CLIN=1, GEXP=2, METH=3, CNVR=4, RPPA=5, MIRN=6, GNAB=7, USER=8)

IDENTIER_FIELDS_FOR_DATA_TYPES = {
    #TODO: change clin to match new BQ clin table in tcga_data_open
    DataTypes.CLIN: {
        IdentifierTypes.PATIENT: 'ParticipantBarcode'
    },
    #TODO: change gexp to match new BQ gexp table in tcga_data_open; not yet uploaded yet
    DataTypes.GEXP: {
        IdentifierTypes.PATIENT: 'ParticipantBarcode',
        IdentifierTypes.SAMPLE: 'SampleBarcode',
        IdentifierTypes.ALIQUOT: 'AliquotBarcode'
    },
    DataTypes.METH: {
        IdentifierTypes.PATIENT: 'ParticipantBarcode',
        IdentifierTypes.SAMPLE: 'SampleBarcode',
        IdentifierTypes.ALIQUOT: 'AliquotBarcode'
    },
    DataTypes.CNVR: {
        IdentifierTypes.PATIENT: 'ParticipantBarcode',
        IdentifierTypes.SAMPLE: 'SampleBarcode',
        IdentifierTypes.ALIQUOT: 'AliquotBarcode'
    },
    DataTypes.RPPA: {
        IdentifierTypes.PATIENT: 'ParticipantBarcode',
        IdentifierTypes.SAMPLE: 'SampleBarcode',
        IdentifierTypes.ALIQUOT: 'AliquotBarcode'
    },
    DataTypes.MIRN: {
        IdentifierTypes.PATIENT: 'ParticipantBarcode',
        IdentifierTypes.SAMPLE: 'SampleBarcode',
        IdentifierTypes.ALIQUOT: 'AliquotBarcode'
    },
    DataTypes.GNAB: {
        IdentifierTypes.PATIENT: 'ParticipantBarcode',
        IdentifierTypes.SAMPLE: 'Tumor_SampleBarcode',
        IdentifierTypes.ALIQUOT: 'Tumor_AliquotBarcode'
    },
    DataTypes.USER: {
        IdentifierTypes.SAMPLE: 'sample_barcode'
    }
}

class DataPointIdentifierTools(object):
    @classmethod
    def get_id_field_name_for_data_type(cls, data_type, identifier_type):
        return IDENTIER_FIELDS_FOR_DATA_TYPES[data_type][identifier_type]

class BigQuerySchemaToValueTypeConverter(object):
    field_to_value_types = {
        'STRING': ValueType.STRING,
        'INTEGER': ValueType.INTEGER,
        'FLOAT': ValueType.FLOAT,
        'BOOLEAN': ValueType.BOOLEAN
    }

    @classmethod
    def get_value_type(cls, schema_field):
        return cls.field_to_value_types[schema_field]

class StringToDataTypeConverter(object):
    @classmethod
    def get_datatype(cls, x):
        pass