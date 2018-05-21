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

# def build_gnab_feature_id(gene_list, genomic_build):
#     """
#     Creates a GNAB v2 feature identifier that will be used to fetch data to be rendered in SeqPeek.
#
#     For more information on GNAB feature IDs, please see:
#     bq_data_access/data_types/gnab.py
#     bq_data_accvess/v2/gnab_data.py
#
#     Params:
#         gene_label: Gene label.
#         genomic_build: "hg19" or "hg38"
#
#     Returns: GNAB v2 feature identifier.
#     """
#     gene_list_id = ""
#     # if gene_list:
#     #     gene_list_id = gene_list.replace(",","_")
#     if genomic_build == "hg19":
#         return "v2:GNAB:{gene_list}:tcga_hg19_mc3:Variant_Classification".format(gene_list=gene_list)
#     elif genomic_build == "hg38":
#         return "v2:GNAB:{gene_list}:tcga_hg38:Variant_Classification".format(gene_list=gene_list)


def get_program_set_for_oncoprint(cohort_id_array):
    return {'tcga'}


def is_valid_genomic_build(genomic_build_param):
    """
    Returns: True if given genomic build is valid, otherwise False.
    """
    return genomic_build_param == "HG19" or genomic_build_param == "HG38"


def build_empty_data_response(gene_list, cohort_id_array, tables_used):
    return {
        # The SeqPeek client side view detects data availability by checking if
        # the "plot_data" object has the "tracks" key present.
        'plot_data': {},
        'gene_list': gene_list,
        'cohort_id_list': [str(i) for i in cohort_id_array],
        #'removed_row_statistics': [],
        'bq_tables': list(set(tables_used))
    }

@login_required
def oncoprint_view_data(request):
    try:
        gene_list = request.GET.get('gene_list', None)
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


        #QUERY

        # cohort_join_str = ''
        # cohort_where_str = ''
        # bq_cohort_table = ''
        # bq_cohort_dataset = ''
        # bq_cohort_project_id = ''
        # cohort = ''
        # query_template = None
        #
        # bq_table_info = BQ_MOLECULAR_ATTR_TABLES[Program.objects.get(id=program_id).name][build]
        # sample_barcode_col = bq_table_info['sample_barcode_col']
        # bq_dataset = bq_table_info['dataset']
        # bq_table = bq_table_info['table']
        # bq_data_project_id = settings.BIGQUERY_DATA_PROJECT_NAME
        #
        # query_template = None
        #
        # if cohort_id is not None:
        #     query_template = \
        #         ("SELECT ct.sample_barcode"
        #          " FROM [{project_id}:{cohort_dataset}.{cohort_table}] ct"
        #          " JOIN (SELECT sample_barcode_tumor AS barcode "
        #          " FROM [{data_project_id}:{dataset_name}.{table_name}]"
        #          " WHERE " + mutation_where_clause['big_query_str'] +
        #          " GROUP BY barcode) mt"
        #          " ON mt.barcode = ct.sample_barcode"
        #          " WHERE ct.cohort_id = {cohort};")
        program_set = get_program_set_for_oncoprint(cohort_id_array)
        confirmed_project_ids, user_only_study_ids = get_confirmed_project_ids_for_cohorts(cohort_id_array)

        if not len(program_set):
            return JsonResponse(
                {'message': "The chosen cohorts do not contain samples from programs with Gene Mutation data."})

        # query_template = \
        #     ("SELECT sample_barcode_tumor, {brk}"
        #      "    SYMBOL, {brk}"
        #      "    Variant_Type, {brk}"
        #      "    Variant_Classification, {brk}"
        #      "FROM [{data_project_id}:{dataset_name}.{table_name}] {brk}"
        #      "WHERE SYMBOL IN ({gene_list}) {brk}"
        #      "AND sample_barcode_tumor IN ( {brk}"
        #      "    SELECT sample_barcode {brk}"
        #      "    FROM [{project_id}:{cohort_dataset}.{cohort_table}] {brk}"
        #      "    WHERE cohort_id IN ({cohort_id_list}) {brk}"
        #      "         AND (project_id IS NULL {brk}")
        # query_template += (" OR project_id IN ({project_id_list})))" if confirmed_project_ids is not None else "))")
        #
        # bq_table_info = BQ_MOLECULAR_ATTR_TABLES['TCGA'][genomic_build]
        # bq_dataset = bq_table_info['dataset']
        # bq_table = bq_table_info['table']
        # bq_data_project_id = settings.BIGQUERY_DATA_PROJECT_NAME
        # bq_cohort_table = settings.BIGQUERY_COHORT_TABLE_ID
        # bq_cohort_dataset = settings.COHORT_DATASET_ID
        # bq_cohort_project_id = settings.BIGQUERY_PROJECT_NAME
        #
        # cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])
        #
        # gene_list_stmt = ''
        # gene_array = gene_list.split(',')
        # if gene_array is not None:
        #     gene_list_stmt = ', '.join('\'{0}\''.format(gene) for gene in gene_array)
        #
        # project_id_stmt = ''
        # if confirmed_project_ids is not None:
        #     project_id_stmt = ', '.join([str(project_id) for project_id in confirmed_project_ids])
        #
        # query = query_template.format(
        #     data_project_id = bq_data_project_id,
        #     dataset_name = bq_dataset,
        #     table_name = bq_table,
        #     gene_list = gene_list_stmt,
        #     project_id = bq_cohort_project_id,
        #     cohort_dataset = bq_cohort_dataset,
        #     cohort_table = bq_cohort_table,
        #     cohort_id_list = cohort_id_stmt,
        #     project_id_list = project_id_stmt,
        #     brk='\n'
        # )

        query_template = """
                    SELECT
                      sample_barcode_tumor AS Sample, Hugo_Symbol,
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
                    FROM [{bq_data_project_id}:{dataset_name}.{table_name}]
                    WHERE Variant_Classification NOT IN ('Silent', 'Nonsense_Mutation') {filter_clause}
                    AND sample_barcode_tumor IN (
                      SELECT sample_barcode
                      FROM [{cohort_table}]
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

        gene_list_stmt = ''
        gene_array = gene_list.split(',')
        if gene_array is not None:
            gene_list_stmt = ', '.join('\'{0}\''.format(gene) for gene in gene_array)
        filter_clause = "AND Hugo_Symbol IN ({})".format(gene_list_stmt) if gene_array is not None else ""

        cohort_id_list = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        cohort_table_id = "{project_name}:{dataset_id}.{table_id}".format(
            project_name=settings.BQ_PROJECT_ID,
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
            print(len(results))
            for row in results:
                plot_data+="{}\t{}\t{}\t{}\n".format(str(row['f'][0]['v']),str(row['f'][1]['v']),str(row['f'][2]['v']),str(row['f'][3]['v']))
            print(plot_data)
        else:
            return JsonResponse(
                {'message': "The chosen genes and cohorts do not contain any samples with Gene Mutation data."})
        print("result size: ",len(results))






        # # By extracting info from the cohort, we get the NAMES of the public projects
        # # we need to access (public projects have unique name tags, e.g. tcga).
        # program_set = get_public_program_name_set_for_cohorts(cohort_id_array)
        #
        # # Check to see if these programs have data for the requested vectors; if not, there's no reason to plot
        # programs = FeatureDataTypeHelper.get_supported_programs_from_data_type(FEATURE_ID_TO_TYPE_MAP['gnab'])
        # valid_programs = set(programs).intersection(program_set)
        #
        # if not len(valid_programs):
        #     return JsonResponse(
        #         {'message': "The chosen cohorts do not contain samples from programs with Gene Mutation data."})
        #gnab_feature_id = build_gnab_feature_id(gene_list, genomic_build)
        #logger.debug("GNAB feature ID for OncoPrint: {0}".format(gnab_feature_id))

        # job_id = str(uuid4())
        # bqs = get_bigquery_service()
        # confirmed_project_ids, user_only_study_ids = get_confirmed_project_ids_for_cohorts(cohort_id_array)
        # # Generate the 'IN' statement string: (%s, %s, ..., %s)
        #
        # cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])
        # project_id_stmt = ''
        # gene_list_stmt = ''
        # gene_array = gene_list.split(',')
        #
        # if confirmed_project_ids is not None:
        #     project_id_stmt = ', '.join([str(project_id) for project_id in confirmed_project_ids])
        #
        # if gene_array is not None:
        #     gene_list_stmt = ', '.join('\'{0}\''.format(gene) for gene in gene_array)
        #
        # query_template = \
        #     ("SELECT sample_barcode_tumor, {brk}"
        #      "    SYMBOL, {brk}"
        #      "    Variant_Type, {brk}"
        #      "    Variant_Classification, {brk}"
        #      "FROM [{table_id}] {brk}"
        #      "WHERE SYMBOL IN ({gene_list}) {brk}"
        #      "AND sample_barcode_tumor IN ( {brk}"
        #      "    SELECT sample_barcode {brk}"
        #      "    FROM [{cohort_dataset_and_table}] {brk}"
        #      "    WHERE cohort_id IN ({cohort_id_list}) {brk}"
        #      "         AND (project_id IS NULL {brk}")
        # query_template += (" OR project_id IN ({project_id_list})))" if confirmed_project_ids is not None else "))")
        #
        # cohort_table_id = "{project_name}:{dataset_id}.{table_id}".format(
        #     project_name=settings.BQ_PROJECT_ID,
        #     dataset_id=settings.COHORT_DATASET_ID,
        #     table_id=settings.BIGQUERY_COHORT_TABLE_ID
        # )
        # table_config=OncoprintMAFData.get_table_configuration()
        # table_id = "{project_name}:{dataset_id}.{table_id}".format(
        #     project_name=settings.BQ_PROJECT_ID,
        #     dataset_id=settings.COHORT_DATASET_ID,
        #     table_id=settings.BIGQUERY_COHORT_TABLE_ID
        # )
        # query = query_template.format(table_id=table_id,
        #                               gene_list=gene_list_stmt,
        #                               cohort_dataset_and_table=cohort_table_id,
        #                               cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt,
        #                               brk='\n')
        #
        # logger.debug("BQ_QUERY_ONCOPRINT: " + query)
        # Submit your job

        # query_job = submit_bigquery_job(bqs, settings.BQ_PROJECT_ID,
        #                                 file_count_query.format(select_clause=file_list_query_base))
        # job_is_done = is_bigquery_job_finished(bqs, settings.BQ_PROJECT_ID,
        #                                        query_job['jobReference']['jobId'])
        # retries = 0
        # start = time.time()
        # while not job_is_done and retries < BQ_ATTEMPT_MAX:
        #     retries += 1
        #     sleep(1)
        #     job_is_done = is_bigquery_job_finished(bq_service, settings.BQ_PROJECT_ID,
        #                                            query_job['jobReference']['jobId'])
        # stop = time.time()
        # logger.debug('[BENCHMARKING] Time to query BQ for dicom count: ' + (stop - start).__str__())
        # results = get_bq_job_results(bq_service, query_job['jobReference'])
        # for entry in results:
        #     total_file_count = int(entry['f'][0]['v'])

        # table_config = feature_def.get_table_configuration()
        # query = query_template.format(table_id=table_config.table_id,
        #                               gene_list=gene_list_stmt,
        #                               cohort_dataset_and_table=cohort_table,
        #                               cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt,
        #                               brk='\n')
        #
        # logger.debug("BQ_QUERY_ONCOPRINT: " + query)
        # print("####")
        # print([table_config.table_id.split(":")[-1]])
        # return query, [table_config.table_id.split(":")[-1]], True

        # fvb = FeatureVectorBigQueryBuilder.build_from_django_settings(bqss)
        # program_set = get_program_set_for_oncoprint(cohort_id_array)
        #
        # extra_provider_params = {
        #     "genomic_buid": genomic_build
        # }
        #
        # async_params = [
        #     ProviderClassQueryDescription(OncoprintDataQueryHandler, gnab_feature_id, cohort_id_array,
        #                                   confirmed_project_ids, program_set, extra_provider_params)]
        # maf_data_result = fvb.get_feature_vectors_tcga_only(async_params, skip_formatting_for_plot=True)
        #
        # maf_data_vector = maf_data_result[gnab_feature_id]['data']
        #
        # if len(maf_data_vector) == 0:
        #     return JsonResponse(build_empty_data_response(gene_list, cohort_id_array, maf_data_result['tables_queried']))
        # print(maf_data_vector)
        #
        # if len(maf_data_vector) > 0:
        #    oncoprint_data = OncoprintMAFDataFormatter().format_maf_vector_for_view(maf_data_vector, cohort_id_array)

        # if len(oncoprint_data.maf_vector) == 0:
        #     return JsonResponse(build_empty_data_response(gene_list, cohort_id_array, maf_data_result['tables_queried']))

        # Since the gene (hugo_symbol) parameter is part of the GNAB feature ID,
        # it will be sanity-checked in the OncoprintMAFWithCohorts instance.
        # oncoprint_maf_vector = oncoprint_data.maf_vector
        # oncoprint_cohort_info = oncoprint_data.cohort_info
        # removed_row_statistics_dict = oncoprint_data.removed_row_statistics
        #
        # oncoprint_view_data = OncoprintDataBuilder().build_view_data(hugo_symbol,
        #                                                              oncoprint_maf_vector,
        #                                                              oncoprint_cohort_info,
        #                                                              cohort_id_array,
        #                                                              maf_data_result['tables_queried'])
        # return JsonResponse(oncoprint_view_data)
        # plot_data = generate_heatmap_data()
        # return JsonResponse(oncoprint_view_data)


        return JsonResponse({"plot_data": plot_data,
                             "gene_list": gene_list})


    except Exception as e:
        logger.error("[ERROR] In oncoprint_view_data: ")
        logger.exception(e)
        return JsonResponse({'Error': str(e)}, status=500)
