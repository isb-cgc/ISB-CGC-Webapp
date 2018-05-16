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

from bq_data_access.v2.gnab_data import GNABDataQueryHandler

logger = logging.getLogger('main_logger')


class OncoprintDataQueryHandler(GNABDataQueryHandler):
    def __init__(self, feature_id, **kwargs):
        super(OncoprintDataQueryHandler, self).__init__(feature_id, **kwargs)

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
        gene_list_stmt = ''
        gene_array = feature_def.gene.split(',')

        if project_id_array is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

        if gene_array is not None:
            gene_list_stmt = ', '.join('\'{0}\''.format(gene) for gene in gene_array)
        query_template = \
            ("SELECT sample_barcode_tumor, {brk}"
             "    SYMBOL, {brk}"
             "    Variant_Type, {brk}"
             "    Variant_Classification, {brk}"
             "FROM [{table_id}] {brk}"
             "WHERE SYMBOL IN ({gene_list}) {brk}"
             "AND sample_barcode_tumor IN ( {brk}"
             "    SELECT sample_barcode {brk}"
             "    FROM [{cohort_dataset_and_table}] {brk}"
             "    WHERE cohort_id IN ({cohort_id_list}) {brk}"
             "         AND (project_id IS NULL {brk}")
        query_template += (" OR project_id IN ({project_id_list})))" if project_id_array is not None else "))")

        table_config = feature_def.get_table_configuration()
        query = query_template.format(table_id=table_config.table_id,
                                      gene_list=gene_list_stmt,
                                      cohort_dataset_and_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt,
                                      brk='\n')

        logger.debug("BQ_QUERY_ONCOPRINT: " + query)
        return query, [table_config.table_id.split(":")[-1]], True