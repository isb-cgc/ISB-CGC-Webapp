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
from cohorts.models import Project, Program

logger = logging.getLogger('main_logger')

DONOR_TRACK_TYPE = 'donor'
GENE_TRACK_TYPE = 'gene'

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

        # get donor list
        donor_data_query, donor_bq_tables = create_oncogrid_bq_statement(DONOR_TRACK_TYPE, genomic_build, project_set, cohort_ids, gene_list)

        #print(donor_data_query)
        donor_data_list = get_donor_data_list(donor_data_query)

        # get gene list
        gene_data_query, gene_bq_tables = create_oncogrid_bq_statement(GENE_TRACK_TYPE, genomic_build, project_set, cohort_ids, gene_list)
        print(gene_data_query)
        gene_data_list, observation_data_list = get_gene_data_list(gene_data_query)

        bq_tables = list(set(donor_bq_tables + gene_bq_tables))

        if len(donor_data_list) and len(gene_data_list):
            return JsonResponse({
                'donor_data_list': donor_data_list,
                'gene_data_list': gene_data_list,
                'observation_data_list': observation_data_list,
                'bq_tables': bq_tables})
        else:
            return JsonResponse(
                {'message': "The chosen genes and cohorts do not contain any samples with Gene Mutation data."})

    except Exception as e:
        logger.error("[ERROR] In oncogrid_view_data: ")
        logger.exception(e)
        return JsonResponse({'Error': str(e)}, status=500)


def get_donor_data_list(bq_statement):
    results = get_bq_query_result(bq_statement)
    donor_data_list = []
    donors = {}
    if results and len(results) > 0:
        for row in results:
            project_short_name = row['f'][0]['v']
            case_barcode = row['f'][1]['v']
            gender = row['f'][2]['v']
            vital_status = row['f'][3]['v']
            race = row['f'][4]['v']
            ethnicity = row['f'][5]['v']
            age_at_diagnosis = str(row['f'][6]['v'])
            days_to_death = str(row['f'][7]['v'])
            data_category = row['f'][8]['v']
            score = str(str(row['f'][9]['v']))

            if not donors.has_key(case_barcode):
                donors[case_barcode] = {
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
                    'score': score,
                }
    if donors and len(donors) > 0:
        for case_barcode_key in donors:
            donor_data = {
                'id': donors[case_barcode_key]['case_code'],
                'gender': donors[case_barcode_key]['gender'],
                'vital_status': donors[case_barcode_key]['vital_status'],
                'race': donors[case_barcode_key]['race'],
                'ethnicity': donors[case_barcode_key]['ethnicity'],
                'age_at_diagnosis': donors[case_barcode_key]['age_at_diagnosis'],
                'days_to_death': donors[case_barcode_key]['days_to_death'],
            }

            for data_category_key in donors[case_barcode_key]['data_category']:
                if data_category_key == 'Clinical':
                    donor_data['clinical'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                elif data_category_key == 'Biospecimen':
                    donor_data['biospecimen'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                elif data_category_key.lower() == 'Raw Sequencing Data'.lower():
                    donor_data['rsd'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                elif data_category_key == 'Simple Nucleotide Variation':
                    donor_data['snv'] = donors[case_barcode_key]['data_category'][data_category_key]['score']

            donor_data_list.append(donor_data.copy())
    return donor_data_list



def get_gene_data_list(bq_statement):
    results = get_bq_query_result(bq_statement)
    gene_data_list = []
    observation_data_list = []
    genes_mut_data = {}
    if results and len(results) > 0:
        for row in results:
            hugo_symbol = row['f'][0]['v']
            project_short_name = row['f'][1]['v']
            case_barcode = row['f'][2]['v']
            variant_classification = row['f'][3]['v']
            score = str(row['f'][4]['v'])
            if not genes_mut_data.has_key(hugo_symbol):
                genes_mut_data[hugo_symbol] = {
                    'case_barcode': {},
                }
            if not genes_mut_data[hugo_symbol]['case_barcode'].has_key(case_barcode):
                genes_mut_data[hugo_symbol]['case_barcode'][case_barcode] = {
                    'case_code': project_short_name +'/'+case_barcode,
                    'variant_classification': {},
                }
            if not genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['variant_classification'].has_key(variant_classification):
                genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['variant_classification'][variant_classification] = {
                    'score': score,
                }

    ob_id = 0
    if genes_mut_data and len(genes_mut_data) > 0:
        for hugo_symbol in genes_mut_data:
            gene_data = {
                'id' : hugo_symbol,
                'symbol': hugo_symbol
            }
            observation_data = {
                'geneId' : hugo_symbol
            }
            score = 0
            for case_barcode in genes_mut_data[hugo_symbol]['case_barcode']:
                for vc in genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['variant_classification']:
                    score += int(genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['variant_classification'][vc]['score'])
                    ob_id += 1
                    observation_data['id'] = ob_id
                    observation_data['donorId'] = genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['case_code']
                    observation_data['consequence'] = vc
                    #print(observation_data)
                    observation_data_list.append(observation_data.copy())

            gene_data['gene_score'] = score
            gene_data['case_score'] = len(genes_mut_data[hugo_symbol]['case_barcode'])
            gene_data_list.append(gene_data.copy())

    return gene_data_list, observation_data_list

def get_bq_query_result(bq_query_statement):
    results = []
    bq_query_job = BigQuerySupport.insert_query_job(bq_query_statement)
    attempts = 0
    job_is_done = BigQuerySupport.check_job_is_done(bq_query_job)
    while attempts < settings.BQ_MAX_ATTEMPTS and not job_is_done:
        job_is_done = BigQuerySupport.check_job_is_done(bq_query_job)
        sleep(1)
        attempts += 1

    if job_is_done:
        results = BigQuerySupport.get_job_results(bq_query_job['jobReference'])
    return results

def create_oncogrid_bq_statement(type, genomic_build, project_set, cohort_ids, gene_list):
    query_template = ''
    gene_query_template = """
        #standardSQL
        SELECT sm.Hugo_Symbol,
                sm.project_short_name,
                  cs.case_barcode,
                    sm.Variant_Classification,
                      COUNT(sm.Variant_Classification) as score
        FROM  `{cohort_table}` cs,
              `{somatic_mut_table}` sm
        WHERE cs.cohort_id IN ({cohort_id_list})
        AND cs.sample_barcode = sm.sample_barcode_tumor                    
        AND (cs.project_id IS NULL{project_clause})
        {filter_clause}
        GROUP BY sm.Hugo_Symbol, sm.project_short_name, cs.case_barcode, sm.Variant_Classification
        ;
    """

    donor_query_template = """
        #standardSQL
        SELECT md.project_short_name,
                cs.case_barcode,
                   bc.gender,
                     bc.vital_status,
                       bc.race,
                         bc.ethnicity,
                           bc.age_at_diagnosis,
                             bc.days_to_death,
                               md.data_category,
        COUNT(md.data_category) AS score
        FROM 
        `{cohort_table}` cs,
        `{somatic_mut_table}` sm,
        `{metadata_data_table}` md,
        `{bioclinic_clin_table}` bc
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

    bq_data_project_id = settings.BIGQUERY_DATA_PROJECT_NAME

    bq_sm_table_info = BQ_MOLECULAR_ATTR_TABLES['TCGA'][genomic_build]
    bq_md_table_info = BQ_METADATA_DATA_TABLES['TCGA'][genomic_build]
    bq_bc_table_info = BQ_BIOCLIN_DATA_TABLES['TCGA']

    sm_dataset_name = bq_sm_table_info['dataset']
    sm_table_name = bq_sm_table_info['table']
    md_dataset_name = bq_md_table_info['dataset']
    md_table_name = bq_md_table_info['table']
    bc_dataset_name = bq_bc_table_info['dataset']
    bc_table_name = bq_bc_table_info['table']

    cohort_table = "{}.{}.{}".format(bq_data_project_id, settings.COHORT_DATASET_ID, settings.BIGQUERY_COHORT_TABLE_ID)
    somatic_mut_table = "{}.{}.{}".format(bq_data_project_id, sm_dataset_name, sm_table_name)
    metadata_data_table = "{}.{}.{}".format(bq_data_project_id, md_dataset_name, md_table_name)
    bioclinic_clin_table = "{}.{}.{}".format(bq_data_project_id, bc_dataset_name, bc_table_name)

    gene_list_str = ''
    if gene_list is not None:
        gene_list_str = ', '.join('\'{0}\''.format(gene) for gene in gene_list)

    cohort_id_list = ', '.join([str(cohort_id) for cohort_id in cohort_ids])
    filter_clause = "AND Hugo_Symbol IN ({})".format(gene_list_str) if gene_list_str != "" else ""
    if type == GENE_TRACK_TYPE:
        query_template = gene_query_template
    elif type == DONOR_TRACK_TYPE:
        query_template = donor_query_template

    project_id_str = ""
    if project_set and len(project_set):
        project_id_str = ', '.join([str(project_id) for project_id in project_set])
    project_clause = " OR project_id IN ({})".format(project_id_str) if project_set else ""

    bq_statement = query_template.format(
        cohort_table = cohort_table,
        somatic_mut_table = somatic_mut_table,
        metadata_data_table = metadata_data_table,
        bioclinic_clin_table = bioclinic_clin_table,
        cohort_id_list=cohort_id_list,
        project_clause=project_clause,
        filter_clause=filter_clause
    )

    return bq_statement, [somatic_mut_table, metadata_data_table, bioclinic_clin_table]

