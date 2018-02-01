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

import logging
from re import compile as re_compile

from bq_data_access.v2.errors import FeatureNotFoundException
from bq_data_access.v2.feature_value_types import ValueType, DataTypes
from bq_data_access.v2.utils import DurationLogged
from bq_data_access.data_types.gexp import BIGQUERY_CONFIG
from scripts.feature_def_gen.gexp_features import GEXPDataSourceConfig

GEXP_FEATURE_TYPE = 'GEXP'

logger = logging.getLogger('main_logger')


def get_feature_type():
    return GEXP_FEATURE_TYPE


class GEXPTableFeatureDef(object):
    def __init__(self, gene, gene_label_field, value_field, table_id):
        self.gene = gene
        self.gene_label_field = gene_label_field
        self.value_field = value_field
        self.table_id = table_id

    @classmethod
    def from_table_config(cls, gene, table_config):
        return cls(gene, table_config.gene_label_field, table_config.value_field, table_config.table_id)


class GEXPFeatureDef(object):
    # Regular expression for parsing the feature definition.
    #
    # Example ID: v2:GEXP:TP53:mrna_hg19
    config_instance = GEXPDataSourceConfig.from_dict(BIGQUERY_CONFIG)

    regex = re_compile("^v2:GEXP:"
                       # gene
                       "([a-zA-Z0-9\-.]+):"
                       # genomic_build 
                       "mrna_(" + "|".join([build for build in config_instance.supported_genomic_builds]) +
                       ")$")

    def __init__(self, gene, genomic_build):
        self.gene = gene
        self.genomic_build = genomic_build

    @classmethod
    def from_feature_id(cls, feature_id):
        feature_fields = cls.regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)

        gene_label, genomic_build = feature_fields[0]
        return cls(gene_label, genomic_build)


class GEXPDataQueryHandler(object):
    def __init__(self, feature_id):
        self.feature_def = None
        self.table_feature_def = None
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    @classmethod
    def get_feature_type(cls):
        return DataTypes.GEXP

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

        query_template = "SELECT case_barcode AS case_id, sample_barcode AS sample_id, aliquot_barcode AS aliquot_id, {value_field} AS value {brk}" \
             "FROM [{table_name}] AS gexp {brk}" \
             "WHERE {gene_label_field}='{gene_symbol}' {brk}" \
             "AND sample_barcode IN ( {brk}" \
             "     SELECT sample_barcode {brk}" \
             "     FROM [{cohort_dataset_and_table}] {brk}" \
             "     WHERE cohort_id IN ({cohort_id_list}) {brk}" \
             "          AND (project_id IS NULL {brk}"

        query_template += (" OR project_id IN ({project_id_list})))" if project_id_array is not None else "))")

        query = query_template.format(table_name=feature_def.table_id,
                                      gene_label_field=feature_def.gene_label_field,
                                      gene_symbol=feature_def.gene, value_field=feature_def.value_field,
                                      cohort_dataset_and_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt,
                                      brk='\n')

        logging.debug("BQ_QUERY_GEXP: " + query)
        return query

    def build_query(self, project_set, cohort_table, cohort_id_array, project_id_array):
        """
        Returns:
            Tuple (query_body, run_query).
            The "query_body" value is the BigQuery query string.
            The "run_query" is always True.
        """
        # Find matching tables
        config_instance = GEXPDataSourceConfig.from_dict(BIGQUERY_CONFIG)
        found_tables = []

        for table in config_instance.data_table_list:
            if (table.program in project_set) and (table.genomic_build == self.feature_def.genomic_build):
                logger.info("Found matching table: '{}'".format(table.table_id))
                found_tables.append(table)

        # Build a BigQuery statement for each found table configuration
        subqueries = []
        for table_config in found_tables:
            # Build the project-specific feature def
            sub_feature_def = GEXPTableFeatureDef.from_table_config(self.feature_def.gene, table_config)
            subquery = self.build_query_for_program(sub_feature_def, cohort_table, cohort_id_array, project_id_array)
            subqueries.append(subquery)

        # Union of subqueries
        subquery_stmt_template = ",".join(["({})" for x in xrange(len(subqueries))])
        subquery_stmt = subquery_stmt_template.format(*subqueries)

        query_template = "SELECT case_id, sample_id, aliquot_id, value {brk}" \
                         "FROM {brk}" \
                         "{subqueries}"

        query = query_template.format(brk='\n', subqueries=subquery_stmt)

        logger.debug("BQ_QUERY_GEXP: " + query)

        return query, [x.table_id.split(':')[-1] for x in found_tables], subquery_stmt  # Third arg resolves to True if a query got built. Will be empty if above loop appends nothing!

    @DurationLogged('GEXP', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array. The array will contain dicts with
        the following fields:
        - 'case_id': Patient barcode
        - 'sample_id': Sample barcode
        - 'aliquot_id': Aliquot barcode
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
                'aliquot_id': row['f'][2]['v'],
                'value': float(row['f'][3]['v'])
            })

        return result

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = GEXPFeatureDef.from_feature_id(feature_id)

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            GEXPFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception:
            # GEXPFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
