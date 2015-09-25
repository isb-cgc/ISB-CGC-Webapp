from protorpc.messages import Enum

def enum(**enums):
    return type('Enum', (), enums)

# TODO decouple from protorpc.messages
class ValueType(Enum):
    STRING = 1
    INTEGER = 2
    FLOAT = 3
    BOOLEAN = 4

IdentifierTypes = enum(PATIENT=1, SAMPLE=2, ALIQUOT=3)
DataTypes = enum(CLIN=1, GEXP=2, METH=3, CNVR=4, RPPA=5, MIRN=6, GNAB=7)

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