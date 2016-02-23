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

from django.conf import settings

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType, DataTypes
from bq_data_access.feature_data_provider import FeatureDataProvider
from bq_data_access.utils import DurationLogged

RPPA_FEATURE_TYPE = 'RPPA'


def get_feature_type():
    return RPPA_FEATURE_TYPE


class RPPAFeatureDef(object):
    # Regular expression for parsing the feature definition.
    #
    # Example ID: RPPA:GYG1:GYG-Glycogenin1
    regex = re_compile("^RPPA:"
                       # gene
                       "([a-zA-Z0-9]+):"
                       # protein name
                       "([a-zA-Z0-9._\-]+)$")

    def __init__(self, gene, protein_name):
        self.gene = gene
        self.protein_name = protein_name

    @classmethod
    def from_feature_id(cls, feature_id):
        feature_fields = cls.regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        gene_label, protein_name = feature_fields[0]
        return cls(gene_label, protein_name)


class RPPAFeatureProvider(FeatureDataProvider):
    TABLES = [
        {
            'name': 'Protein',
            'info': 'Protein',
            'id': 'protein'
        }
    ]

    def __init__(self, feature_id, **kwargs):
        self.feature_def = None
        self.table_info = None
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)
        super(RPPAFeatureProvider, self).__init__(**kwargs)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.RPPA

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def build_query(self, project_name, dataset_name, table_name, feature_def,  cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        query_template = \
            ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, protein_expression AS value "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE ( gene_name='{gene}' AND protein_name='{protein}' ) "
             "AND SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})  AND study_id IS NULL"
             ") ")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      gene=feature_def.gene, protein=feature_def.protein_name,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_RPPA: " + query)
        return query

    @DurationLogged('RPPA', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array. The array will contain dicts with
        the following fields:
        - 'patient_id': Patient barcode
        - 'sample_id': Sample barcode
        - 'aliquot_id': Aliquot barcode
        - 'value': Value of the selected column from the protein data table

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
                'value': float(row['f'][3]['v'])
            })

        return result

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET
        result = self.do_query(project_id, project_name, dataset_name, self.table_name, self.feature_def,
                               cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = RPPAFeatureDef.from_feature_id(feature_id)
        self.table_name = self.TABLES[0]['name']

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            RPPAFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception:
            # RPPAFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
