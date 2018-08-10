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

def get_program_set_for_oncogrid(cohort_id_array):
    return Program.objects.filter(name='TCGA',is_public=True,active=True)


def is_valid_genomic_build(genomic_build_param):
    """
    Returns: True if given genomic build is valid, otherwise False.
    """
    return genomic_build_param == "HG19" or genomic_build_param == "HG38"

@login_required
def oncogrid_view_data(request):
    try:
        gene_list_str = request.GET.get('gene_list', None)
        gene_list = gene_list_str.split(',')
        genomic_build = request.GET.get('genomic_build', None)
        cohort_id_param_array = request.GET.getlist('cohort_id', None)

        if not is_valid_genomic_build(genomic_build):
            return JsonResponse({'error': 'Invalid genomic build'}, status=400)

        cohort_ids = []
        for cohort_id in cohort_id_param_array:
            try:
                cohort_id = int(cohort_id)
                cohort_ids.append(cohort_id)
            except Exception as e:
                return JsonResponse({'error': 'Invalid cohort parameter'}, status=400)
        if len(cohort_ids) == 0:
            return JsonResponse({'error': 'No cohorts specified'}, status=400)

        program_set = get_program_set_for_oncogrid(cohort_ids)
        confirmed_project_ids, user_only_study_ids = get_confirmed_project_ids_for_cohorts(cohort_ids)
        # Only samples in projects from a data type's valid programs should be queried
        project_set = Project.objects.filter(id__in=confirmed_project_ids,program__in=program_set).values_list('id', flat=True)

        if not len(project_set):
            return JsonResponse(
                {'message': "The chosen cohorts do not contain samples from programs with Gene Mutation data."})
        #get_donor_track(genomic_build, project_set, cohort_ids, gene_list)
        get_gene_track(genomic_build, project_set, cohort_ids, gene_list)
        return JsonResponse(
            {'message': "The chosen genes and cohorts do not contain any samples with Gene Mutation data."})
    except Exception as e:
        logger.error("[ERROR] In oncogrid_view_data: ")
        logger.exception(e)
        return JsonResponse({'Error': str(e)}, status=500)


def get_donor_track(genomic_build, project_set, cohort_ids, gene_list):
    donor_query_template = """
                #standardSQL
                    SELECT md.project_short_name,
                            cs.case_barcode,
                             cs.sample_barcode,
                              bc.gender,
                               bc.vital_status,
                                bc.race,
                                 bc.ethnicity,
                                  bc.age_at_diagnosis,
                                   bc.days_to_death,
                                    md.data_category,
                                     COUNT(md.data_category) AS score
                    FROM `{cohort_table}` cs,
                         `{bq_data_project_id}.{sm_dataset_name}.{sm_table_name}` sm,
                         `{bq_data_project_id}.{md_dataset_name}.{md_table_name}` md,
                         `{bq_data_project_id}.{bc_dataset_name}.{bc_table_name}` bc
                    WHERE cs.cohort_id IN ({cohort_id_list})
                    -- AND Variant_Classification NOT IN('Silent')
                    AND cs.sample_barcode = sm.sample_barcode_tumor
                    AND cs.sample_barcode = md.sample_barcode
                    AND cs.case_barcode = bc.case_barcode
                    AND (cs.project_id IS NULL{project_clause})
                    {filter_clause}
                    GROUP BY md.project_short_name, cs.case_barcode, cs.sample_barcode, bc.gender, bc.vital_status, bc.race, bc.ethnicity, bc.age_at_diagnosis, bc.days_to_death, md.data_category
                    ;
            """

    project_id_stmt = ""
    if project_set and len(project_set):
        project_id_stmt = ', '.join([str(project_id) for project_id in project_set])
    project_clause = " OR project_id IN ({})".format(project_id_stmt) if project_set else ""

    gene_list_stm = ''
    if gene_list is not None:
        gene_list_stm = ', '.join('\'{0}\''.format(gene) for gene in gene_list)
    filter_clause = "AND Hugo_Symbol IN ({})".format(gene_list_stm) if gene_list_stm != "" else ""
    cohort_id_list = ', '.join([str(cohort_id) for cohort_id in cohort_ids])

    cohort_table_id = "{project_name}.{dataset_id}.{table_id}".format(
        project_name=settings.BIGQUERY_PROJECT_NAME,
        dataset_id=settings.COHORT_DATASET_ID,
        table_id=settings.BIGQUERY_COHORT_TABLE_ID)

    bq_sm_table_info = BQ_MOLECULAR_ATTR_TABLES['TCGA'][genomic_build]
    bq_md_table_info = BQ_METADATA_DATA_TABLES['TCGA'][genomic_build]
    bq_bc_table_info = BQ_BIOCLIN_DATA_TABLES['TCGA']

    donor_query = donor_query_template.format(
        bq_data_project_id=settings.BIGQUERY_DATA_PROJECT_NAME,
        sm_dataset_name=bq_sm_table_info['dataset'],
        sm_table_name=bq_sm_table_info['table'],
        md_dataset_name=bq_md_table_info['dataset'],
        md_table_name=bq_md_table_info['table'],
        bc_dataset_name=bq_bc_table_info['dataset'],
        bc_table_name=bq_bc_table_info['table'],
        cohort_table=cohort_table_id,
        filter_clause=filter_clause,
        cohort_id_list=cohort_id_list,
        project_clause=project_clause
    )
    #print(donor_query)

    donor_query_job = BigQuerySupport.insert_query_job(donor_query)

    attempts = 0
    job_is_done = BigQuerySupport.check_job_is_done(donor_query_job)
    while attempts < settings.BQ_MAX_ATTEMPTS and not job_is_done:
        job_is_done = BigQuerySupport.check_job_is_done(donor_query_job['jobReference'])
        sleep(1)
        attempts += 1

    if job_is_done:
        results = BigQuerySupport.get_job_results(donor_query_job['jobReference'])

    donor_track = []
    donors = {}
    if results and len(results) > 0:
        for row in results:
            project_short_name = row['f'][0]['v']
            case_barcode = row['f'][1]['v']
            gender = row['f'][3]['v']
            vital_status = row['f'][4]['v']
            race = row['f'][5]['v']
            ethnicity = row['f'][6]['v']
            age_at_diagnosis = str(row['f'][7]['v'])
            days_to_death = str(row['f'][8]['v'])
            data_category = row['f'][9]['v']
            score = str(str(row['f'][10]['v']))

            if not donors.has_key(case_barcode):
                donors[case_barcode] = {
                    'case_barcode': case_barcode,
                    'case_code': project_short_name + '/' + case_barcode,
                    'gender': gender,
                    'vital_status': vital_status,
                    'race': race if not race == None else 'None',
                    'ethnicity': ethnicity if not ethnicity == None else 'None',
                    'age_at_diagnosis': age_at_diagnosis,
                    'days_to_death': days_to_death,
                    'data_category': {},
                }
            if not donors[case_barcode]['data_category'].has_key(data_category):
                donors[case_barcode]['data_category'][data_category] = {
                    'name': data_category,
                    'score': score,
                }
    if donors and len(donors) > 0:
        for casebarcode_key in donors:
            donor_track.append(
                donors[casebarcode_key]
            )
    #print(donor_track)


def get_gene_track(genomic_build, project_set, cohort_ids, gene_list):
    gene_query_template = """
        #standardSQL
            SELECT cs.case_barcode,
                    cs.sample_barcode,
                      sm.Hugo_Symbol,
                        sm.Variant_Classification,
                          COUNT(sm.Variant_Classification) as score
            FROM `{cohort_table}` cs,
                  `{bq_data_project_id}.{sm_dataset_name}.{sm_table_name}` sm
            WHERE cs.cohort_id IN ({cohort_id_list})
            AND cs.sample_barcode = sm.sample_barcode_tumor                    
            AND (cs.project_id IS NULL{project_clause})
            {filter_clause}
            GROUP BY cs.case_barcode, cs.sample_barcode, sm.Hugo_Symbol, sm.Variant_Classification
            ;
    """

    project_id_stmt = ""
    if project_set and len(project_set):
        project_id_stmt = ', '.join([str(project_id) for project_id in project_set])
    project_clause = " OR project_id IN ({})".format(project_id_stmt) if project_set else ""

    gene_list_stm = ''
    if gene_list is not None:
        gene_list_stm = ', '.join('\'{0}\''.format(gene) for gene in gene_list)
    filter_clause = "AND Hugo_Symbol IN ({})".format(gene_list_stm) if gene_list_stm != "" else ""
    cohort_id_list = ', '.join([str(cohort_id) for cohort_id in cohort_ids])

    cohort_table_id = "{project_name}.{dataset_id}.{table_id}".format(
        project_name=settings.BIGQUERY_PROJECT_NAME,
        dataset_id=settings.COHORT_DATASET_ID,
        table_id=settings.BIGQUERY_COHORT_TABLE_ID)

    bq_sm_table_info = BQ_MOLECULAR_ATTR_TABLES['TCGA'][genomic_build]

    gene_query = gene_query_template.format(
        bq_data_project_id=settings.BIGQUERY_DATA_PROJECT_NAME,
        sm_dataset_name=bq_sm_table_info['dataset'],
        sm_table_name=bq_sm_table_info['table'],
        cohort_table=cohort_table_id,
        filter_clause=filter_clause,
        cohort_id_list=cohort_id_list,
        project_clause=project_clause
    )
    #print(gene_query)

    gene_query_job = BigQuerySupport.insert_query_job(gene_query)

    attempts = 0
    job_is_done = BigQuerySupport.check_job_is_done(gene_query_job)
    while attempts < settings.BQ_MAX_ATTEMPTS and not job_is_done:
        job_is_done = BigQuerySupport.check_job_is_done(gene_query_job['jobReference'])
        sleep(1)
        attempts += 1

    if job_is_done:
        results = BigQuerySupport.get_job_results(gene_query_job['jobReference'])

    gene_track = []
    genes = {}
    if results and len(results) > 0:
        for row in results:
            case_barcode = row['f'][0]['v']
            #sample_barcode = row['f'][1]['v']
            hugo_symbol = row['f'][2]['v']
            variant_classification = row['f'][3]['v']
            score = str(row['f'][4]['v'])
            if not genes.has_key(case_barcode):
                genes[case_barcode] = {
                    'case_barcode': case_barcode,
                    'hugo_symbol': hugo_symbol,
                    'variant_classification': {},
                }
            if not genes[case_barcode]['variant_classification'].has_key(variant_classification):
                genes[case_barcode]['variant_classification'][variant_classification] = {
                    'name': variant_classification,
                    'score': score,
                }
    if genes and len(genes) > 0:
        print(genes)
        for casebarcode_key in genes:
            gene_track.append(
                genes[casebarcode_key]
            )
    print(gene_track)

