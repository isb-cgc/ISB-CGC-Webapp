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
from time import sleep
from google_helpers.bigquery.cohort_support import BigQuerySupport
from cohorts.metadata_helpers import *
from visualizations.data_access_views_v2 import get_confirmed_project_ids_for_cohorts
from visualizations.feature_access_views_v2 import build_feature_ids
from bq_data_access.v2.plot_data_support import get_merged_feature_vectors
from bq_data_access.v2.data_access import FeatureVectorBigQueryBuilder
from google_helpers.bigquery.service_v2 import BigQueryServiceSupport
from cohorts.models import Project, Program

logger = logging.getLogger('main_logger')

def get_program_set_for_oncoprint(cohort_id_array):
    return Program.objects.filter(name='TCGA',is_public=True,active=True)


def is_valid_genomic_build(genomic_build_param):
    """
    Returns: True if given genomic build is valid, otherwise False.
    """
    return genomic_build_param == "HG19" or genomic_build_param == "HG38"

@login_required
def oncoprint_view_data(request):
    try:
        gene_list_str = request.GET.get('gene_list', None)
        gene_array = gene_list_str.split(',')
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
        # Only samples in projects from a data type's valid programs should be queried
        projects_this_program_set = Project.objects.filter(id__in=confirmed_project_ids,program__in=program_set).values_list('id', flat=True)

        if not len(program_set):
            return JsonResponse(
                {'message': "The chosen cohorts do not contain samples from programs with Gene Mutation data."})

        query_template = """
                    #standardSQL
                    SELECT cs.case_barcode, sm.Hugo_Symbol, sm.Alteration, sm.Type
                    FROM (
                          SELECT case_barcode
                          FROM `{cohort_table}`
                          WHERE cohort_id IN ({cohort_id_list})
                          AND (project_id IS NULL{project_clause})
                          GROUP BY case_barcode
                    ) cs
                    LEFT JOIN (
                        SELECT
                          case_barcode, Hugo_Symbol,
                          CASE
                            WHEN Protein_position IS NOT NULL AND Protein_position NOT LIKE '-/%' THEN
                              CONCAT(
                                COALESCE(REGEXP_EXTRACT(Amino_acids,r'^([A-Za-z*\-]+)'),'-'),
                                COALESCE(REGEXP_EXTRACT(Protein_position,r'^([0-9]+)'), '-'),
                                CASE
                                  WHEN Variant_Classification IN ('Frame_Shift_Del', 'Frame_Shift_Ins') OR {conseq_col} LIKE '%frameshift%' THEN '_fs'
                                  WHEN Variant_Classification IN ('Splice_Site', 'Splice_Region') THEN '_splice'
                                  WHEN Amino_acids LIKE '%/%' THEN REGEXP_EXTRACT(Amino_acids,r'^.*/([A-Za-z*-]+)')
                                  ELSE '-'
                                END
                              )
                            ELSE
                              CASE
                                WHEN {conseq_col} LIKE '%splice_%_variant%' THEN REGEXP_EXTRACT({conseq_col},r'^(splice_[^_]+_variant)')
                                WHEN {conseq_col} LIKE '%intron_variant%' THEN 'intron_variant'
                                WHEN Variant_Classification = 'IGR' THEN 'Intergenic'
                                ELSE Variant_Classification
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
                                ELSE UPPER(Variant_Classification)
                              END
                            ELSE UPPER(Variant_Classification)
                          END AS Type
                        FROM `{bq_data_project_id}.{dataset_name}.{table_name}`
                        WHERE Variant_Classification NOT IN ('Silent') {filter_clause}
                        AND case_barcode IN (
                          SELECT case_barcode
                          FROM `{cohort_table}`
                          WHERE cohort_id IN ({cohort_id_list})
                          AND (project_id IS NULL{project_clause})
                          GROUP BY case_barcode
                        )
                        GROUP BY case_barcode, Hugo_Symbol, Alteration, Type
                        ORDER BY case_barcode
                    ) sm
                    ON sm.case_barcode = cs.case_barcode
                    ;
                """
        project_id_stmt = ""
        if projects_this_program_set and len(projects_this_program_set):
            project_id_stmt = ', '.join([str(project_id) for project_id in projects_this_program_set])
        project_clause = " OR project_id IN ({})".format(project_id_stmt) if projects_this_program_set else ""

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
        somatic_mut_query = query_template.format(bq_data_project_id = settings.BIGQUERY_DATA_PROJECT_NAME,
                                        dataset_name=bq_table_info['dataset'],
                                        table_name=bq_table_info['table'],
                                        conseq_col=("one_consequence" if genomic_build == "hg38" else 'consequence'),
                                        cohort_table=cohort_table_id,
                                        filter_clause=filter_clause,
                                        cohort_id_list=cohort_id_list,
                                        project_clause=project_clause)



        somatic_mut_query_job = BigQuerySupport.insert_query_job(somatic_mut_query)

        plot_data = []

        # Build the CNVR features
        for gene in gene_array:
            feature = build_feature_ids(
                "CNVR", {'value_field': 'segment_mean', 'gene_name': gene, 'genomic_build': genomic_build}
            )[0]['internal_feature_id']

            fvb = FeatureVectorBigQueryBuilder.build_from_django_settings(BigQueryServiceSupport.build_from_django_settings())
            data = get_merged_feature_vectors(fvb, feature, None, None, cohort_id_array, None, projects_this_program_set, program_set=program_set)['items']

            if data and len(data):
                for item in data:
                    # 01A are tumor samples, which is what we want
                    if item['sample_id'].split('-')[-1] == '01A':
                        seg_mean = float(item['x'])
                        if seg_mean > 0.112 or seg_mean < -0.112:
                            cnvr_result = "AMP" if seg_mean > 1 else "GAIN" if seg_mean > 0.62 else "HOMDEL" if seg_mean < -1 else "HETLOSS"
                            plot_data.append("{}\t{}\t{}\t{}".format(item['case_id'],gene,cnvr_result,"CNA"))

        attempts = 0
        job_is_done = BigQuerySupport.check_job_is_done(somatic_mut_query_job)
        while attempts < settings.BQ_MAX_ATTEMPTS and not job_is_done:
            job_is_done = BigQuerySupport.check_job_is_done(somatic_mut_query_job['jobReference'])
            sleep(1)
            attempts += 1

        if job_is_done:
            results = BigQuerySupport.get_job_results(somatic_mut_query_job['jobReference'])

        if results and len(results) > 0:
            for row in results:
                plot_data.append("{}\t{}\t{}\t{}".format(str(row['f'][0]['v']),str(row['f'][1]['v']),str(row['f'][2]['v']),str(row['f'][3]['v'])))

        if len(plot_data):
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
