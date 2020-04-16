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
import sys
from re import compile as re_compile

from bq_data_access.v2.errors import FeatureNotFoundException
from bq_data_access.v2.feature_value_types import DataTypes, BigQuerySchemaToValueTypeConverter
from bq_data_access.v2.utils import DurationLogged
from bq_data_access.data_types.clinical import BIGQUERY_CONFIG
from scripts.feature_def_gen.clinical_features import CLINDataSourceConfig
from bq_data_access.v2.schema.program_schemas import TABLE_TO_SCHEMA_MAP

CLINICAL_FEATURE_TYPE = 'CLIN'

logger = logging.getLogger('main_logger')


class InvalidClinicalFeatureIDException(Exception):
    def __init__(self, feature_id, reason):
        self.feature_id = feature_id
        self.reason = reason

    def __str__(self):
        return "Invalid internal clinical feature ID '{feature_id}', reason '{reason}'".format(
            feature_id=self.feature_id,
            reason=self.reason
        )


class ClinicalTableFeatureDef(object):
    def __init__(self, table_id, biospecimen_table_id, column_name):
        self.table_id = table_id
        self.biospecimen_table_id = biospecimen_table_id
        self.column_name = column_name

    @classmethod
    def from_table_config(cls, table_config, column_name):
        return cls(table_config.table_id, table_config.biospecimen_table_id, column_name)


class ClinicalFeatureDef(object):
    config_instance = CLINDataSourceConfig.from_dict(BIGQUERY_CONFIG)

    # Regular expression for parsing the feature definition.
    #
    # Example ID: v2:CLIN:vital_status
    regex = re_compile("^v2:CLIN:"
                       # column name
                       "([a-zA-Z0-9_\-]+)$")

    def __init__(self, column_name, value_type):
        self.column_name = column_name
        self.value_type = value_type

    @classmethod
    def from_feature_id(cls, feature_id):
        feature_fields = cls.regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        column_name = feature_fields[0]

        # Check if the column exists in any configured tables.
        # If matching tables are found, then check that the value type
        # of the column in the found tables is the same.
        found_tables = []
        for table_config in cls.config_instance.data_table_list:
            schema = TABLE_TO_SCHEMA_MAP[table_config.table_id]

            for field_item in schema:
                if field_item['name'].lower() == column_name.lower():
                    # Capture the type of the field in this table
                    field_item['name'] = column_name
                    found_tables.append((table_config, field_item['type']))
                    break

        if len(found_tables) == 0:
            raise InvalidClinicalFeatureIDException(feature_id, "No tables found for column name")

        data_type_set = set([table[1] for table in found_tables])

        if len(data_type_set) != 1:
            raise InvalidClinicalFeatureIDException(feature_id, "Data types of found tables do not match")

        value_type = BigQuerySchemaToValueTypeConverter.get_value_type(list(data_type_set)[0])

        return cls(column_name, value_type)


class ClinicalDataQueryHandler(object):
    def __init__(self, feature_id):
        self.feature_def = None
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return self.feature_def.value_type

    @classmethod
    def get_feature_type(cls):
        return DataTypes.CLIN

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
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])
        project_id_stmt = ''
        if project_id_array is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

        query_template_clin_bsp = \
            ("SELECT clin.case_barcode AS case_barcode, biospec.sample_barcode AS sample_barcode, clin.{column_name} AS value {brk}"
             "FROM ( {brk}"
             " SELECT case_barcode, {column_name} {brk}"
             " FROM [{table_id}] {brk}"
             " ) AS clin {brk}"
             " JOIN ( {brk}"
             " SELECT case_barcode, sample_barcode {brk}"
             " FROM [{biospecimen_table_id}] {brk}"
             " ) AS biospec {brk}"
             " ON clin.case_barcode = biospec.case_barcode {brk}"
             "WHERE biospec.sample_barcode IN ( {brk}"
             "    SELECT sample_barcode {brk}"
             "    FROM [{cohort_dataset_and_table}] {brk}"
             "    WHERE cohort_id IN ({cohort_id_list}) {brk}"
             "          AND (project_id IS NULL {brk}")

        query_template_bsp_only = \
            ("SELECT biospec.case_barcode AS case_barcode, biospec.sample_barcode AS sample_barcode, biospec.{column_name} AS value {brk}"
             " FROM [{biospecimen_table_id}] {brk}"
             " AS biospec {brk}"
             "WHERE sample_barcode IN ( {brk}"
             "    SELECT sample_barcode {brk}"
             "    FROM [{cohort_dataset_and_table}] {brk}"
             "    WHERE cohort_id IN ({cohort_id_list}) {brk}"
             "          AND (project_id IS NULL {brk}")

        query_template = query_template_clin_bsp if feature_def.biospecimen_table_id != feature_def.table_id else query_template_bsp_only

        query_template += (" OR project_id IN ({project_id_list})))" if project_id_array is not None else "))")
        query_template += " GROUP BY case_barcode, sample_barcode, value"

        query = query_template.format(table_id=feature_def.table_id,
                                      biospecimen_table_id=feature_def.biospecimen_table_id,
                                      column_name=feature_def.column_name,
                                      bsp_table_id=feature_def.biospecimen_table_id,
                                      cohort_dataset_and_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt,
                                      brk='\n')

        return query

    def build_query(self, program_set, cohort_table, cohort_id_array, project_id_array):
        """
        Returns:
            Tuple (query_body, run_query).
            The "query_body" value is the BigQuery query string.
            The "run_query" is Boolean indicating whether or not the query should be run at all.
        """
        # Find matching tables. A table has to match the program and has to contain the column.
        config_instance = CLINDataSourceConfig.from_dict(BIGQUERY_CONFIG)
        found_tables = []

        for table_config in config_instance.data_table_list:
            schema = TABLE_TO_SCHEMA_MAP[table_config.table_id]
            column_name_set = set([item['name'] for item in schema])

            if (table_config.program in program_set) and (self.feature_def.column_name in column_name_set):
                found_tables.append(table_config)

        # Build a BigQuery statement for each found table configuration
        subqueries = []
        for table_config in found_tables:
            # Build the project-specific feature def
            sub_feature_def = ClinicalTableFeatureDef.from_table_config(table_config, self.feature_def.column_name)
            subquery = self.build_query_for_program(sub_feature_def, cohort_table, cohort_id_array, project_id_array)
            subqueries.append(subquery)

        if len(subqueries) == 0:
            return "", None, False
        else:
            # Union of subqueries
            subquery_stmt_template = ",".join(["({})" for x in range(len(subqueries))])
            subquery_stmt = subquery_stmt_template.format(*subqueries)

            query_template = "SELECT case_barcode, sample_barcode, value {brk}" \
                             "FROM {brk}" \
                             "{subqueries} {brk}"

            query = query_template.format(brk='\n', subqueries=subquery_stmt)

            logger.debug("BQ_QUERY_CLIN: " + query)

            return query, [x.table_id.split(':')[-1] for x in found_tables], subquery_stmt  # Third arg resolves to True if a query got built. Will be empty if above loop appends nothing!

    @DurationLogged('CLIN', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array. The array will contain dicts with
        the following fields:
        - 'case_id': Patient barcode
        - 'sample_id': Sample barcode
        - 'aliquot_id': Always None
        - 'value': Value of the selected column from the clinical data table

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
                'aliquot_id': None,
                'value': row['f'][2]['v']
            })

        return result

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = ClinicalFeatureDef.from_feature_id(feature_id)

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            ClinicalFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception as e:
            # ClinicalFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
