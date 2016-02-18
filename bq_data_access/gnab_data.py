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

import logging
from re import compile as re_compile

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType, DataTypes
from bq_data_access.feature_data_provider import FeatureDataProvider
from bq_data_access.utils import DurationLogged

GNAB_FEATURE_TYPE = 'GNAB'
IDENTIFIER_COLUMN_NAME = 'sample_id'


def get_feature_type():
    return GNAB_FEATURE_TYPE


class GNABFeatureDef(object):
    # Regular expression for parsing the feature definition.
    #
    # Example ID: GNAB:SMYD3:sequence_source
    regex = re_compile("^GNAB:"
                       # gene
                       "([a-zA-Z0-9_.\-]+):"
                       # value field
                       "(variant_classification|variant_type|sequence_source|num_mutations)$")

    def __init__(self, gene, value_field):
        self.gene = gene
        self.value_field = value_field

    @classmethod
    def from_feature_id(cls, feature_id):
        feature_fields = cls.regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        gene_label, value_field = feature_fields[0]

        return cls(gene_label, value_field)


class GNABFeatureProvider(FeatureDataProvider):
    TABLES = [
        {
            'name': 'MAF',
            'info': 'MAF',
            'id': 'maf'
        }
    ]

    VALUE_FIELD_NUM_MUTATIONS = 'num_mutations'

    def __init__(self, feature_id, **kwargs):
        self.feature_def = None
        self.table_info = None
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)
        super(GNABFeatureProvider, self).__init__(**kwargs)

    def get_value_type(self):
        if self.feature_def.value_field == self.VALUE_FIELD_NUM_MUTATIONS:
            return ValueType.FLOAT
        else:
            return ValueType.STRING

    def get_feature_type(self):
        return DataTypes.GNAB

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        query_template = \
            ("SELECT ParticipantBarcode, Tumor_SampleBarcode, Tumor_AliquotBarcode, "
             "{value_field} AS value "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE Hugo_Symbol='{gene}' "
             "AND Tumor_SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
             ") ")

        value_field_bqsql = self.feature_def.value_field

        if self.feature_def.value_field == self.VALUE_FIELD_NUM_MUTATIONS:
            value_field_bqsql = 'count(*)'
            query_template += ("GROUP BY ParticipantBarcode, Tumor_SampleBarcode, Tumor_AliquotBarcode, "
                               "Normal_SampleBarcode, Normal_AliquotBarcode")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      gene=feature_def.gene, value_field=value_field_bqsql,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_GNAB: " + query)
        return query

    @DurationLogged('GNAB', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array. The array will contain dicts with
        the following fields:
        - 'patient_id': Patient barcode
        - 'sample_id': Sample barcode
        - 'aliquot_id': Aliquot barcode
        - 'value': Value of the selected column from the MAF data table

        Args:
            query_result_array: A BigQuery query response object

        Returns:
            Array of dict objects.
        """
        result = []

        for row in query_result_array:
            result.append({
                'patient_id': row['f'][0]['v'],
                'sample_id': row['f'][1]['v'],
                'aliquot_id': row['f'][2]['v'],
                'value': row['f'][3]['v'],
            })

        return result

    def get_table_info(self):
        return self.TABLES[0]

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = GNABFeatureDef.from_feature_id(feature_id)
        self.table_info = self.get_table_info()

        if self.table_info is None:
            raise FeatureNotFoundException(feature_id)

        self.table_name = self.table_info['name']

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            GNABFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception:
            # GNABFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
