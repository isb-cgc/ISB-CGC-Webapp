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

        project_id_stmt = ''
        if project_id_array is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

        query_template = """
            SELECT
              sample_barcode_tumor AS Sample, Hugo_Symbol AS Gene,
              CASE
                WHEN Amino_acids IS NOT NULL THEN
                  CONCAT(
                    REGEXP_EXTRACT(Amino_acids,r'^([A-Za-z*\-]+)[^A-Za-z*\-]+'),
                    REGEXP_EXTRACT(Protein_position,r'^([0-9]+)[^0-9]+'),
                    CASE
                      WHEN Variant_Classification IN ('Frame_Shift_Del', 'Frame_Shift_Ins') THEN 'fs'
                      WHEN Variant_Classification IN ('Splice_Site', 'Splice_Region') THEN '_splice'
                      WHEN Amino_acids LIKE '%/%' THEN REGEXP_EXTRACT(Amino_acids,r'^.*/([A-Za-z*-]+)$')
                      ELSE '-'
                    END
                  )
                ELSE
                  CASE
                    WHEN Variant_Classification IN ('Splice_Site', 'Splice_Region') THEN 'Splice'
                    WHEN Variant_Classification = 'IGR' THEN 'Intergenic'
                    ELSE REPLACE(Variant_Classification,'_',' ')
                  END
              END AS Alteration,
              CASE
                WHEN (Amino_acids IS NOT NULL AND REGEXP_EXTRACT(Amino_acids,r'^.*/([A-Za-z*-]+)$') = '*') OR Variant_Classification IN ('Frame_Shift_Del', 'Frame_Shift_Ins', 'Splice_Site', 'Splice_Region') THEN 'TRUNC'
                WHEN Variant_Classification = 'Nonstop_Mutation' OR (Variant_Classification = 'Missense_Mutation' AND Variant_Type IN ('DEL','INS')) OR (Variant_Classification = 'Translation_Start_Site') THEN 'MISSENSE'
                WHEN (Variant_Classification = 'Missense_Mutation' AND Variant_Type IN ('ONP','SNP', 'TNP')) OR (Variant_Classification IN ('In_Frame_Del','In_Frame_Ins')) THEN 'INFRAME'
                WHEN Variant_Classification IN ('RNA','IGR', '3'UTR','3\'Flank','5\'UTR','5\'Flank') THEN
                  CASE
                    WHEN {conseq_col} LIKE '%intergenic%' THEN 'INTERGENIC'
                    WHEN {conseq_col} LIKE '%regulatory%' THEN 'REGULATORY'
                    WHEN {conseq_col} LIKE '%miRNA%' THEN 'miRNA'
                    WHEN {conseq_col} LIKE '%transcript%' THEN 'TRANSCRIPT'
                    WHEN {conseq_col} LIKE '%downstream%' THEN 'DOWNSTREAM'
                    WHEN {conseq_col} LIKE '%upstream%' THEN 'UPSTREAM'
                  END
                ELSE UPPER(REPLACE(Variant_Classification,'_',' '))
              END AS Type
            FROM {bq_mutation_table}
            WHERE Variant_Classification NOT IN ('Silent') {filter_clause}
            AND sample_barcode_tumor IN (
              SELECT DISTINCT sample_barcode
              FROM {cohort_table}
              WHERE cohort_id = @cohort_id
              AND (project_id IS NULL{project_clause})
            );
        """

        project_clause = " OR project_id IN ({})".format(project_id_stmt) if project_id_array is not None else ""

        table_config = feature_def.get_table_configuration()

        query = query_template.format(bq_mutation_table=table_config.table_id,
                                      conseq_col=("one_consequence" if table_config.genomic_build == "hg38" else 'consequence'),
                                      cohort_table=cohort_table, project_clause=project_clause)

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
