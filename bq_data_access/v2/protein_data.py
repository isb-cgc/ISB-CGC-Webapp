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
from re import compile as re_compile

from bq_data_access.v2.errors import FeatureNotFoundException
from bq_data_access.v2.feature_value_types import ValueType, DataTypes
from bq_data_access.v2.utils import DurationLogged
from bq_data_access.data_types.rppa import BIGQUERY_CONFIG
from scripts.feature_def_gen.protein_features import RPPADataSourceConfig

logger = logging.getLogger('main_logger')

RPPA_FEATURE_TYPE = 'RPPA'


def get_feature_type():
    return RPPA_FEATURE_TYPE


class RPPAFeatureDef(object):
    # Regular expression for parsing the feature definition.
    #
    # Example ID: RPPA:GYG1:GYG-Glycogenin1:value_field
    config_instance = RPPADataSourceConfig.from_dict(BIGQUERY_CONFIG)
    regex = re_compile("^v2:RPPA:"
                       # gene
                       "([a-zA-Z0-9._\-]+):"
                       # protein name
                       "([a-zA-Z0-9._\-]+):"
                       # table ID
                       "(" + "|".join([table.internal_table_id for table in config_instance.data_table_list]) + ")")

    def __init__(self, gene, protein_name, internal_table_id):
        self.gene = gene
        self.protein_name = protein_name
        self.internal_table_id = internal_table_id

    def get_table_configuration(self):
        for table_config in self.config_instance.data_table_list:
            if table_config.internal_table_id == self.internal_table_id:
                return table_config

    @classmethod
    def from_feature_id(cls, feature_id):
        feature_fields = cls.regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        gene_label, protein_name, internal_table_id = feature_fields[0]
        return cls(gene_label, protein_name, internal_table_id)


class RPPADataQueryHandler(object):
    def __init__(self, feature_id):
        self.feature_def = None
        self.config_instance = RPPADataSourceConfig.from_dict(BIGQUERY_CONFIG)
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    @classmethod
    def get_feature_type(cls):
        return DataTypes.RPPA

    @classmethod
    def can_convert_feature_id(cls):
        return False

    @classmethod
    def convert_feature_id(cls, feature_id):
        return None

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def build_query_for_program(self, feature_def, cohort_table, cohort_id_array, project_id_array):
        """
        Returns:
            Tuple (query_body, run_query).
            The "query_body" value is the BigQuery query string.
            The "run_query" is always True.
        """
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])
        project_id_stmt = ''
        if project_id_array is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

        query_template = \
            ("SELECT case_barcode AS case_id, sample_barcode AS sample_id, aliquot_barcode AS aliquot_id, {value_field} AS value {brk}"
             "FROM [{table_id}] {brk}"
             "WHERE ({gene_label_field}='{gene}' AND protein_name='{protein}' ) {brk}"
             "AND sample_barcode IN ( {brk}"
             "    SELECT sample_barcode {brk}"
             "    FROM [{cohort_dataset_and_table}] {brk}"
             "    WHERE cohort_id IN ({cohort_id_list}) {brk}"
             "         AND (project_id IS NULL {brk}")

        query_template += (" OR project_id IN ({project_id_list}))) {brk}" if project_id_array is not None else ")) {brk}")

        table_config = feature_def.get_table_configuration()

        query = query_template.format(table_id=table_config.table_id,
                                      value_field=table_config.value_field,
                                      gene_label_field=table_config.gene_label_field,
                                      gene=feature_def.gene, protein=feature_def.protein_name,
                                      cohort_dataset_and_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt,
                                      brk='\n')

        logger.debug("BQ_QUERY_RPPA: " + query)
        return query, [table_config.table_id.split(":")[-1]], True

    def build_query(self, project_set, cohort_table, cohort_id_array, project_id_array):
        query, tables_used, run_query = self.build_query_for_program(self.feature_def, cohort_table, cohort_id_array, project_id_array)
        return query, tables_used, run_query

    @DurationLogged('RPPA', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array. The array will contain dicts with
        the following fields:
        - 'case_id': Patient barcode
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
                'case_id': row['f'][0]['v'],
                'sample_id': row['f'][1]['v'],
                'aliquot_id': row['f'][2]['v'],
                'value': float(row['f'][3]['v'])
            })

        return result

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = RPPAFeatureDef.from_feature_id(feature_id)

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
