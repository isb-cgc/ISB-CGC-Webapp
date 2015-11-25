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

from bq_data_access.feature_value_types import DataTypes, IdentifierTypes

class BarcodeAdapter(object):
    identifier_length = {
        IdentifierTypes.PATIENT: 12,
        IdentifierTypes.SAMPLE: 16,
        IdentifierTypes.ALIQUOT: 28
    }

    supported_identifers = {
        DataTypes.CLIN: IdentifierTypes.PATIENT,
        DataTypes.GEXP: IdentifierTypes.PATIENT,
        DataTypes.METH: IdentifierTypes.PATIENT,
        DataTypes.CNVR: IdentifierTypes.PATIENT,
        DataTypes.RPPA: IdentifierTypes.PATIENT,
        DataTypes.MIRN: IdentifierTypes.PATIENT,
        DataTypes.GNAB: IdentifierTypes.PATIENT
    }

    @classmethod
    def get_identifier_type_for_data_type(cls, data_type):
        return cls.supported_identifers[data_type]

    @classmethod
    def convert(cls, data_type, barcode_list):
        identifier_type = cls.get_identifier_type_for_data_type(data_type)
        truncate_length = cls.identifier_length[identifier_type]
        result = []
        for barcode in barcode_list:
            truncated_barcode = barcode[:truncate_length]
            result.append(truncated_barcode)

        return result

class CohortQueryBuilder(object):
    @classmethod
    def build(cls, field_name, barcodes_list, delimiter=',', barcode_quote='\''):
        barcodes_quoted = []
        for barcode in barcodes_list:
            barcodes_quoted.append('{quote}{barcode}{quote}'.format(quote=barcode_quote, barcode=barcode))
        result = field_name + ' IN ({identifiers})'
        result = result.format(identifiers=delimiter.join(barcodes_quoted))
        return result
