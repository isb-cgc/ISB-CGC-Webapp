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
from projects.models import Public_Metadata_Tables

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

        # get gene list
        gene_data_query, gene_bq_tables = create_oncogrid_bq_statement(GENE_TRACK_TYPE, genomic_build, project_set,
                                                                           cohort_ids, gene_list, None)
        gene_data_list, observation_data_list, obs_donors = get_gene_data_list(gene_data_query)

        # get donor list
        donor_data_query, donor_bq_tables = create_oncogrid_bq_statement(DONOR_TRACK_TYPE, genomic_build, project_set,
                                                                         None, None, obs_donors)
        donor_data_list, donor_track_count_max = get_donor_data_list(donor_data_query)

        bq_tables = list(set(donor_bq_tables + gene_bq_tables))

        if len(observation_data_list):
            return JsonResponse({
                'donor_data_list': donor_data_list,
                'gene_data_list': gene_data_list,
                'observation_data_list': observation_data_list,
                # 'obs_donors': obs_donors,
                'bq_tables': bq_tables,
                'donor_track_count_max': donor_track_count_max
            })
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
    donor_track_count_max = {
        'race': 0,
        'age_at_diagnosis': 0,
        'vital_status': 0,
        'days_to_death': 0,
        'gender': 0,
        'ethnicity': 0,
        'clinical': 0,
        'biospecimen': 0,
        'rsd': 0,
        'snv': 0,
        'cnv': 0,
        'gene_exp': 0
    }

    if results and len(results) > 0:
        for row in results:
            project_short_name = row['f'][0]['v']
            case_barcode = row['f'][1]['v']
            gender = row['f'][2]['v']
            vital_status = row['f'][3]['v']
            race = row['f'][4]['v']
            ethnicity = row['f'][5]['v']
            age_at_diagnosis = row['f'][6]['v']
            days_to_death = row['f'][7]['v']
            data_category = row['f'][8]['v']
            score = row['f'][9]['v']
            if not donors.has_key(case_barcode):
                donors[case_barcode] = {
                    'case_code': project_short_name + ' / ' + case_barcode,
                    'gender': gender if gender != None else 'Not Reported',
                    'vital_status': vital_status if vital_status != None else 'Not Reported',
                    'race': race if race != None else 'Not Reported',
                    'ethnicity': ethnicity if ethnicity != None else 'Not Reported',
                    'age_at_diagnosis': age_at_diagnosis if age_at_diagnosis != None else 'Not Reported',
                    'days_to_death': days_to_death if days_to_death != None else 'Not Reported',
                    'data_category': {},
                }
            if not donors[case_barcode]['data_category'].has_key(data_category):
                donors[case_barcode]['data_category'][data_category] = {
                    'score': score,
                }
    if donors and len(donors) > 0:
        for case_barcode_key in donors:
            donor_data = {
                'id': case_barcode_key,
                'case_code': donors[case_barcode_key]['case_code'],
                'gender': donors[case_barcode_key]['gender'],
                'vital_status': donors[case_barcode_key]['vital_status'],
                'race': donors[case_barcode_key]['race'],
                'ethnicity': donors[case_barcode_key]['ethnicity'],
                'age_at_diagnosis': donors[case_barcode_key]['age_at_diagnosis'],
                'days_to_death': donors[case_barcode_key]['days_to_death'],
                'clinical' : 0,
                'biospecimen': 0,
                'rsd': 0,
                'snv': 0,
                'cnv': 0,
                'gene_exp': 0
            }
            if donor_track_count_max['gender'] == 0 and donor_data['gender'] != 'Not Reported':
                donor_track_count_max['gender'] = 1
            if donor_track_count_max['vital_status'] == 0 and donor_data['vital_status'] != 'Not Reported':
                donor_track_count_max['vital_status'] = 1
            if donor_track_count_max['race'] == 0 and donor_data['race'] != 'Not Reported':
                donor_track_count_max['race'] = 1
            if donor_track_count_max['ethnicity'] == 0 and donor_data['race'] != 'Not Reported':
                donor_track_count_max['ethnicity'] = 1
            if donor_data['age_at_diagnosis'] != 'Not Reported':
                donor_track_count_max['age_at_diagnosis'] = max(int(donor_track_count_max['age_at_diagnosis']), int(donor_data['age_at_diagnosis']))
            if donor_data['days_to_death'] != 'Not Reported':
                donor_track_count_max['days_to_death'] = max(int(donor_track_count_max['days_to_death']), int(donor_data['days_to_death']))

            for data_category_key in donors[case_barcode_key]['data_category']:
                if data_category_key is not None:
                    break
                elif data_category_key.lower() == 'clinical':
                    donor_data['clinical'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                    donor_track_count_max['clinical'] = max(donor_track_count_max['clinical'], donor_data['clinical'])
                elif data_category_key.lower() == 'biospecimen':
                    donor_data['biospecimen'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                    donor_track_count_max['biospecimen'] = max(donor_track_count_max['biospecimen'], donor_data['biospecimen'])
                elif data_category_key.lower() == 'raw sequencing data':
                    donor_data['rsd'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                    donor_track_count_max['rsd'] = max(donor_track_count_max['rsd'], donor_data['rsd'])
                elif data_category_key.lower() == 'simple nucleotide variation':
                    donor_data['snv'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                    donor_track_count_max['snv'] = max(donor_track_count_max['snv'], donor_data['snv'])
                elif data_category_key.lower() == 'copy number variation':
                    donor_data['cnv'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                    donor_track_count_max['cnv'] = max(donor_track_count_max['cnv'], donor_data['cnv'])
                elif data_category_key.lower() == 'gene expression':
                    donor_data['gene_exp'] = donors[case_barcode_key]['data_category'][data_category_key]['score']
                    donor_track_count_max['gene_exp'] = max(donor_track_count_max['gene_exp'], donor_data['gene_exp'])
            donor_data_list.append(donor_data.copy())
    return donor_data_list, donor_track_count_max



def get_gene_data_list(bq_statement):
    results = get_bq_query_result(bq_statement)
    gene_data_list = []
    observation_data_list = []
    obs_donors = []
    genes_mut_data = {}
    if results and len(results) > 0:
        for row in results:
            hugo_symbol = row['f'][0]['v']
            project_short_name = row['f'][1]['v']
            case_barcode = row['f'][2]['v']
            variant_classification = row['f'][3]['v']
            is_cgc = str(row['f'][4]['v'])
            if not genes_mut_data.has_key(hugo_symbol):
                genes_mut_data[hugo_symbol] = {
                    'case_barcode': {},
                }
            if not genes_mut_data[hugo_symbol]['case_barcode'].has_key(case_barcode):
                genes_mut_data[hugo_symbol]['case_barcode'][case_barcode] = {
                    'case_code': project_short_name +' / '+case_barcode,
                    'variant_classification': {},
                    'is_cgc': is_cgc
                }
            if not genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['variant_classification'].has_key(variant_classification):
                genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['variant_classification'][variant_classification] = {
                    'name': variant_classification
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
            for case_barcode in genes_mut_data[hugo_symbol]['case_barcode']:
                for vc in genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['variant_classification']:
                    ob_id += 1
                    observation_data['id'] = ob_id
                    observation_data['donorId'] = case_barcode
                    observation_data['case_code'] = genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['case_code']
                    observation_data['consequence'] = vc.lower()
                    observation_data_list.append(observation_data.copy())
                    obs_donors.append(case_barcode)
            gene_data['case_score'] = len(genes_mut_data[hugo_symbol]['case_barcode'])
            gene_data['is_cgc'] = genes_mut_data[hugo_symbol]['case_barcode'][case_barcode]['is_cgc']
            gene_data_list.append(gene_data.copy())

    return gene_data_list, observation_data_list, obs_donors

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

def create_oncogrid_bq_statement(type, genomic_build, project_set, cohort_ids, gene_list, casebarcode_list):
    query_template = ''
    gene_query_template = """
        #standardSQL
        SELECT * FROM (
            SELECT sm.Hugo_Symbol,
                sm.project_short_name,
                  cs.case_barcode,
                    CASE
                      WHEN sm.all_effects IS NOT NULL 
                        AND ARRAY_LENGTH(SPLIT(sm.all_effects, ',')) > 1
                        THEN
                           SPLIT(sm.all_effects, ',')[OFFSET(1)]
                      ELSE ''
                    END AS conseq,
                    CASE
                      WHEN Gene_Symbol is not null
                        THEN TRUE
                      ELSE FALSE 
                    END AS is_cgc
            FROM  `{cohort_table}` cs,
                  `{somatic_mut_table}` sm
            LEFT JOIN `{cgc_table}` cgc
            ON cgc.Gene_Symbol = sm.Hugo_Symbol
            WHERE cs.cohort_id IN ({cohort_id_list})
            AND cs.sample_barcode = sm.sample_barcode_tumor                    
            AND (cs.project_id IS NULL{project_clause})
            {filter_clause1}
            GROUP BY sm.Hugo_Symbol, sm.project_short_name, cs.case_barcode, conseq, is_cgc            
        )
        WHERE conseq IN ('stop_gained', 'missense_variant', 'frameshift_variant', 'start_lost', 'stop_lost', 'initiator_codon_variant');
    """

    donor_query_template = """
        #standardSQL
        SELECT md.project_short_name,
                md.case_barcode,
                  bc.gender,
                    bc.vital_status,
                      bc.race,
                        bc.ethnicity,
                          bc.age_at_diagnosis,
                            bc.days_to_death,
                              md.data_category,
                COUNT(md.data_category) AS score
                FROM
                `{metadata_data_table}` md,
                `{bioclinic_clin_table}` bc
                WHERE md.case_barcode = bc.case_barcode
                {filter_clause2}                
                GROUP BY md.project_short_name, md.case_barcode, bc.gender, bc.vital_status, bc.race, bc.ethnicity, bc.age_at_diagnosis, bc.days_to_death, md.data_category
                ;
            """

    bq_data_project_id = settings.BIGQUERY_DATA_PROJECT_ID
    bq_project_id = settings.BIGQUERY_PROJECT_ID

    program_data_tables = Public_Data_Tables.objects.get(program__name='TCGA', program__is_public=1, program__active=1, build=genomic_build.upper())
    program_metadata_tables = Public_Metadata_Tables.objects.get(program__name='TCGA', program__is_public=1, program__active=1)

    bq_sm_table_info = BQ_MOLECULAR_ATTR_TABLES['TCGA'][genomic_build]

    sm_dataset_name = program_data_tables.bq_dataset
    sm_table_name = bq_sm_table_info['table']
    md_dataset_name = program_data_tables.bq_dataset
    md_table_name = program_data_tables.data_table.lower()
    bc_dataset_name = program_metadata_tables.bq_dataset
    bc_table_name = program_metadata_tables.clin_bq_table

    cohort_table = "{}.{}.{}".format(bq_project_id, settings.BIGQUERY_COHORT_DATASET_ID, settings.BIGQUERY_COHORT_TABLE_ID)
    somatic_mut_table = "{}.{}.{}".format(bq_data_project_id, sm_dataset_name, sm_table_name)
    metadata_data_table = "{}.{}.{}".format(bq_data_project_id, md_dataset_name, md_table_name)
    bioclinic_clin_table = "{}.{}.{}".format(bq_data_project_id, bc_dataset_name, bc_table_name)
    cgc_table = "{}.{}.{}".format(bq_data_project_id, settings.BIGQUERY_COSMIC_DATASET_ID, settings.BIGQUERY_CGC_TABLE_ID)

    gene_list_str = ''
    if gene_list is not None:
        gene_list_str = ', '.join('\'{0}\''.format(gene) for gene in gene_list)

    casebarcode_list_str = ''
    if casebarcode_list is not None:
        casebarcode_list_str = ', '.join('\'{0}\''.format(cs_barcode) for cs_barcode in casebarcode_list)

    cohort_id_list = ', '.join([str(cohort_id) for cohort_id in cohort_ids]) if cohort_ids != None else ''
    filter_clause1 = "AND Hugo_Symbol IN ({})".format(gene_list_str) if gene_list_str != "" else ""
    filter_clause2 = "AND md.case_barcode IN ({})".format(casebarcode_list_str) if casebarcode_list_str != "" else ""

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
        cgc_table = cgc_table,
        metadata_data_table = metadata_data_table,
        bioclinic_clin_table = bioclinic_clin_table,
        conseq_col = ("one_consequence" if genomic_build == "hg38" else 'consequence'),
        cohort_id_list=cohort_id_list,
        project_clause=project_clause,
        filter_clause1=filter_clause1,
        filter_clause2 = filter_clause2
    )

    return bq_statement, [somatic_mut_table, metadata_data_table, bioclinic_clin_table]

