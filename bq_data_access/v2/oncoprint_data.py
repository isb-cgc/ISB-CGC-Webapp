"""

Copyright 2018, Institute for Systems Biology

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

from bq_data_access.v2.gnab_data import GNABDataQueryHandler
from bq_data_access.v2.utils import DurationLogged

logger = logging.getLogger('main_logger')

ONCOPRINT_FEATURE_TYPE = 'ONCOPRINT'


class OncoPrintDataSourceConfig(object):
    """
    Configuration class for OncoPrint data.
    """
    def __init__(self, interpro_reference_table_id):
        self.interpro_reference_table_id = interpro_reference_table_id

    @classmethod
    def from_dict(cls, param):
        interpro_reference_table_id = param['interpro_reference_table_id']

        return cls(interpro_reference_table_id)


class OncoPrintDataQueryHandler(GNABDataQueryHandler):
    def __init__(self, feature_id, **kwargs):
        super(OncoPrintDataQueryHandler, self).__init__(feature_id, **kwargs)

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['value'])

    def build_query_for_program(self, feature_def, cohort_table, cohort_id_array, project_id_array):
        """
        Returns:
            Tuple (query_body, tables used, run_query).
            The "query_body" value is the BigQuery query string.
            The "tables used" are the tables queried for data.
            The "run_query" is always True.
        """
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])
        project_id_stmt = ''
        if project_id_array is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

        query_template = \
            ("SELECT sample_barcode_tumor, {brk}"
             "    SYMBOL, {brk}"
             "    Variant_Classification, {brk}"
             "    Gene, {brk}"
             "FROM [{table_id}] {brk}"
             "WHERE SYMBOL IN ('{genes}') {brk}"
             "AND sample_barcode_tumor IN ( {brk}"
             "    SELECT sample_barcode {brk}"
             "    FROM [{cohort_dataset_and_table}] {brk}"
             "    WHERE cohort_id IN ({cohort_id_list}) {brk}"
             "         AND (project_id IS NULL {brk}")

        query_template += (" OR project_id IN ({project_id_list})))" if project_id_array is not None else "))")

        table_config = feature_def.get_table_configuration()

        query = query_template.format(table_id=table_config.table_id,
                                      genes="', '".join(feature_def.genes),
                                      cohort_dataset_and_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt,
                                      brk='\n')

        logger.debug("BQ_QUERY_ONCOPRINT: " + query)
        return query, [table_config.table_id.split(":")[-1]], True

    def build_query(self, project_set, cohort_table, cohort_id_array, project_id_array):
        query, tables_used, run_query = self.build_query_for_program(self.feature_def, cohort_table, cohort_id_array, project_id_array)
        return query, tables_used, run_query

    @DurationLogged('ONCOPRINT_GNAB', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        result = []

        skip_count = 0
        for row in query_result_array:
            result.append({
                'sample_id': row['f'][0]['v'],
                'gene_symbol': row['f'][1]['v'],
                'variant_classification': row['f'][2]['v'],
                'ensg_id': row['f'][3]['v'],
            })

        logging.debug("Query result is {qrows} rows, skipped {skipped} rows".format(qrows=len(query_result_array),
                                                                                    skipped=skip_count))
        return result
