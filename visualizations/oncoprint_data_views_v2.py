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
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.conf import settings
from google_helpers.bigquery.cohort_support import BigQuerySupport
from cohorts.metadata_helpers import *
from visualizations.data_access_views_v2 import get_confirmed_project_ids_for_cohorts

logger = logging.getLogger('main_logger')

def get_program_set_for_oncoprint(cohort_id_array):
    return {'tcga'}


def is_valid_genomic_build(genomic_build_param):
    """
    Returns: True if given genomic build is valid, otherwise False.
    """
    return genomic_build_param == "HG19" or genomic_build_param == "HG38"

@login_required
def oncoprint_view_data(request):
    try:
        gene_list_str = request.GET.get('gene_list', None)
        gene_array = gene_list_str.split(',');
        genomic_build = request.GET.get('genomic_build', None)
        cohort_id_param_array = request.GET.getlist('cohort_id', None)

        if not is_valid_genomic_build(genomic_build):
            return JsonResponse({'error': 'Invalid genomic build'}, status=400)

        cohort_id_array = []
        for cohort_id in cohort_id_param_array:
            try:
                cohort_id = int(cohort_id)
                cohort_id_array.append(cohort_id)
            except Exception as e:
                return JsonResponse({'error': 'Invalid cohort parameter'}, status=400)
        if len(cohort_id_array) == 0:
            return JsonResponse({'error': 'No cohorts specified'}, status=400)

        program_set = get_program_set_for_oncoprint(cohort_id_array)
        confirmed_project_ids, user_only_study_ids = get_confirmed_project_ids_for_cohorts(cohort_id_array)

        if not len(program_set):
            return JsonResponse(
                {'message': "The chosen cohorts do not contain samples from programs with Gene Mutation data."})

        query_template = """
                    #standardSQL
                    SELECT
                      sample_barcode_tumor AS Sample, Hugo_Symbol,
                      CASE
                        WHEN Protein_position IS NOT NULL THEN
                          CONCAT(
                            COALESCE(REGEXP_EXTRACT(Amino_acids,r'^([A-Za-z*\-]+)'),'-'),
                            REGEXP_EXTRACT(Protein_position,r'^([0-9]+)'),
                            CASE
                              WHEN Variant_Classification IN ('Frame_Shift_Del', 'Frame_Shift_Ins') OR {conseq_col} LIKE '%frameshift%' THEN '_fs'
                              WHEN Variant_Classification IN ('Splice_Site', 'Splice_Region') THEN '_splice'
                              WHEN Amino_acids LIKE '%/%' THEN REGEXP_EXTRACT(Amino_acids,r'^.*/([A-Za-z*-]+)')
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
                        WHEN Variant_Classification = 'Nonsense_Mutation' AND {conseq_col} LIKE 'stop_gained%' THEN 'TRUNC'
                        WHEN Variant_Classification = 'Nonstop_Mutation' OR (Variant_Classification = 'Missense_Mutation' AND Variant_Type IN ('DEL','INS')) OR (Variant_Classification = 'Translation_Start_Site') THEN 'MISSENSE'
                        WHEN (Variant_Classification = 'Missense_Mutation' AND Variant_Type IN ('ONP','SNP', 'TNP')) OR (Variant_Classification IN ('In_Frame_Del','In_Frame_Ins')) OR {conseq_col} LIKE '%inframe%' THEN 'INFRAME'
                        WHEN Variant_Classification IN ("RNA","IGR", "3\'UTR","3\'Flank","5\'UTR","5\'Flank") THEN
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
                    FROM `{bq_data_project_id}.{dataset_name}.{table_name}`
                    WHERE Variant_Classification NOT IN ('Silent') {filter_clause}
                    AND sample_barcode_tumor IN (
                      SELECT sample_barcode
                      FROM `{cohort_table}`
                      WHERE cohort_id IN ({cohort_id_list})
                      AND (project_id IS NULL{project_clause})
                      GROUP BY sample_barcode
                    )
                    GROUP BY Sample, Hugo_Symbol, Alteration, Type
                    ORDER BY Sample
                    ;
                    
                """
        project_id_stmt = ""
        if confirmed_project_ids is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in confirmed_project_ids])
        project_clause = " OR project_id IN ({})".format(project_id_stmt) if confirmed_project_ids is not None else ""

        gene_list_stm = ''
        if gene_array is not None:
            gene_list_stm = ', '.join('\'{0}\''.format(gene) for gene in gene_array)
        filter_clause = "AND Hugo_Symbol IN ({})".format(gene_list_stm) if gene_list_stm != "" else ""
        cohort_id_list = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        cohort_table_id = "{project_name}.{dataset_id}.{table_id}".format(
            project_name=settings.BIGQUERY_PROJECT_NAME,
            dataset_id=settings.COHORT_DATASET_ID,
            table_id=settings.BIGQUERY_COHORT_TABLE_ID)

        bq_table_info = BQ_MOLECULAR_ATTR_TABLES['TCGA'][genomic_build]
        query = query_template.format(bq_data_project_id = settings.BIGQUERY_DATA_PROJECT_NAME,
                                        dataset_name=bq_table_info['dataset'],
                                        table_name=bq_table_info['table'],
                                        conseq_col=("one_consequence" if genomic_build == "hg38" else 'consequence'),
                                        cohort_table=cohort_table_id,
                                        filter_clause=filter_clause,
                                        cohort_id_list=cohort_id_list,
                                        project_clause=project_clause)

        logger.debug("BQ_QUERY_ONCOPRINT: " + query)
        results = BigQuerySupport.execute_query_and_fetch_results(query)
        plot_data =""

        if results and len(results) > 0:
            for row in results:
                plot_data+="{}\t{}\t{}\t{}\n".format(str(row['f'][0]['v']),str(row['f'][1]['v']),str(row['f'][2]['v']),str(row['f'][3]['v']))

            return JsonResponse({
                'plot_data': plot_data,
                'gene_list': gene_array,
                'bq_tables': ["{bq_data_project_id}:{dataset_name}.{table_name}".format(
                    bq_data_project_id=settings.BIGQUERY_DATA_PROJECT_NAME,
                    dataset_name=bq_table_info['dataset'],
                    table_name=bq_table_info['table'])]})
        else:
            return JsonResponse(
                {'message': "The chosen genes and cohorts do not contain any samples with Gene Mutation data."})

    except Exception as e:
        logger.error("[ERROR] In oncoprint_view_data: ")
        logger.exception(e)
        return JsonResponse({'Error': str(e)}, status=500)
