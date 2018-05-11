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
import traceback
import sys
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
#from django.contrib.gis.shortcuts import numpy as np
import random

from google_helpers.bigquery.service_v2 import BigQueryServiceSupport
from bq_data_access.v2.data_access import FeatureVectorBigQueryBuilder
from bq_data_access.v2.seqpeek.seqpeek_view import SeqPeekViewDataBuilder
from bq_data_access.v2.seqpeek.seqpeek_maf_formatter import SeqPeekMAFDataFormatter
from bq_data_access.v2.seqpeek_maf_data import SeqPeekDataQueryHandler
from bq_data_access.v2.feature_id_utils import ProviderClassQueryDescription, FeatureDataTypeHelper
from bq_data_access.data_types.definitions import FEATURE_ID_TO_TYPE_MAP
from visualizations.data_access_views_v2 import get_confirmed_project_ids_for_cohorts, get_public_program_name_set_for_cohorts
import json
#import numpy as np

#import pandas as pd

logger = logging.getLogger('main_logger')


def generate_heatmap_data():
    columns = ['TCGA-{0:02d}'.format(n) for n in range(50)]
    index = ['GENE{0}'.format(n) for n in range(5)]
    index_len = len(index)
    columns_len = len(columns)
    ix = [[0 for x in range(columns_len)] for i in range(index_len)]

    for i in range(index_len):
        for x in range(columns_len):
            if i<12:
                if x < 3:
                    ix[i][x] = random.randrange(3, 12) + 1
                else:
                    ix[i][x] = random.randrange(2, 12) - 0.5
            elif i < 28:
                if x<2:
                    ix[i][x] = random.randrange(2, 28 - 12) - 2
                else:
                    ix[i][x] = 0
            elif i < 35:
                if x>=2:
                    ix[i][x] = random.randrange(3, 35 - 28) + 3
                else:
                    ix[i][x] = 0
            else:
                ix[i][x] = 0;
    data = []
    for i in range(index_len):
        datum = {'gene': index[i], 'data': []}
        for x in range(columns_len):
            datum['data'].append({'sample': columns[x], 'vaf': ix[i][x]})
            data.append(datum)

    #json_str = json.dumps(data, indent=4)

    #with open('heatmap-data.js', 'w') as f:
    #    f.write('var hm_data = ' + json_str + ';')
    #return json_str
    return data


# def generate_glyphmap_data():
#     ga_df = pd.DataFrame(
#         columns=['TCGA-{0:02d}'.format(n) for n in range(50)],
#         index=['GENE{0}'.format(n) for n in range(5)])
#
#     data = []
#     for gene in ga_df.index:
#         datum = {
#             'gene': gene,
#             'desc': 'Annotation for ' + gene,
#             'data': []
#         }
#         for samp in ga_df.columns:
#             sample = {'sample': samp}
#
#             dice_1 = np.random.random()
#             if dice_1 < 0.3:
#                 sample['disp_cna'] = None
#                 dice_2 = np.random.random()
#                 if dice_2 < 0.2:
#                     sample['disp_cna'] = 'amp'
#                 elif dice_2 < 0.4:
#                     sample['disp_cna'] = 'homdel'
#                 elif dice_2 < 0.6:
#                     sample['disp_cna'] = 'gain'
#                 elif dice_2 < 0.8:
#                     sample['disp_cna'] = 'hetloss'
#                 else:
#                     sample['disp_cna'] = 'diploid'
#
#             dice_1 = np.random.random()
#             if dice_1 < 0.3:
#                 sample['disp_mut'] = None
#                 dice_2 = np.random.random()
#                 if dice_2 < 0.25:
#                     sample['disp_mut'] = 'trunc'
#                 elif dice_2 < 0.5:
#                     sample['disp_mut'] = 'inframe'
#                 elif dice_2 < 0.75:
#                     sample['disp_mut'] = 'promoter'
#                 else:
#                     sample['disp_mut'] = 'missense'
#
#             dice_1 = np.random.random()
#             if dice_1 < 0.2:
#                 sample['disp_mrna'] = None
#                 dice_2 = np.random.random()
#                 if dice_2 < 0.6:
#                     sample['disp_mrna'] = 'up'
#                 else:
#                     sample['disp_mrna'] = 'down'
#
#             dice_1 = np.random.random()
#             if dice_1 < 0.2:
#                 sample['disp_prot'] = None
#                 dice_2 = np.random.random()
#                 if dice_2 < 0.6:
#                     sample['disp_prot'] = 'up'
#                 else:
#                     sample['disp_prot'] = 'down'
#
#             datum['data'].append(sample)
#
#         data.append(datum)
#
#     json_str = json.dumps(data, indent=4)
#
#     with open('glyphmap-data.js', 'w') as f:
#         f.write('var ga_data = ' + json_str + ';')
#     return


# if __name__ == "__main__":
#     np.random.seed(0)
#     generate_heatmap_data()
#     generate_glyphmap_data()

def build_gnab_feature_id(gene_label, genomic_build):
    """
    Creates a GNAB v2 feature identifier that will be used to fetch data to be rendered in SeqPeek.

    For more information on GNAB feature IDs, please see:
    bq_data_access/data_types/gnab.py
    bq_data_accvess/v2/gnab_data.py

    Params:
        gene_label: Gene label.
        genomic_build: "hg19" or "hg38"

    Returns: GNAB v2 feature identifier.
    """
    if genomic_build == "hg19":
        return "v2:GNAB:{gene_label}:tcga_hg19_mc3:Variant_Classification".format(gene_label=gene_label)
    elif genomic_build == "hg38":
        return "v2:GNAB:{gene_label}:tcga_hg38:Variant_Classification".format(gene_label=gene_label)


def get_program_set_for_seqpeek_plot(cohort_id_array):
    return {'tcga'}


def is_valid_genomic_build(genomic_build_param):
    """
    Returns: True if given genomic build is valid, otherwise False.
    """
    return genomic_build_param == "HG19" or genomic_build_param == "HG38"


def build_empty_data_response(hugo_symbol, cohort_id_array, tables_used):
    return {
        # The SeqPeek client side view detects data availability by checking if
        # the "plot_data" object has the "tracks" key present.
        'plot_data': {},
        'hugo_symbol': hugo_symbol,
        'cohort_id_list': [str(i) for i in cohort_id_array],
        'removed_row_statistics': [],
        'bq_tables': list(set(tables_used))
    }

@login_required
def oncoprint_view_data(request):
    try:
        hugo_symbol = request.GET.get('hugo_symbol', None)
        genomic_build = request.GET.get('genomic_build', None)
        cohort_id_param_array = request.GET.getlist('cohort_id', None)
        cohort_id_array = []

        for cohort_id in cohort_id_param_array:
            try:
                cohort_id = int(cohort_id)
                cohort_id_array.append(cohort_id)
            except Exception as e:
                return JsonResponse({'error': 'Invalid cohort parameter'}, status=400)

        if not is_valid_genomic_build(genomic_build):
            return JsonResponse({'error': 'Invalid genomic build'}, status=400)

        genomic_build = genomic_build.lower()

        if len(cohort_id_array) == 0:
            return JsonResponse({'error': 'No cohorts specified'}, status=400)

        # By extracting info from the cohort, we get the NAMES of the public projects
        # we need to access (public projects have unique name tags, e.g. tcga).
        # program_set = get_public_program_name_set_for_cohorts(cohort_id_array)
        #
        # # Check to see if these programs have data for the requested vectors; if not, there's no reason to plot
        # programs = FeatureDataTypeHelper.get_supported_programs_from_data_type(FEATURE_ID_TO_TYPE_MAP['gnab'])
        # valid_programs = set(programs).intersection(program_set)
        #
        # if not len(valid_programs):
        #     return JsonResponse({'message': "The chosen cohorts do not contain samples from programs with Gene Mutation data."})
        #
        # gnab_feature_id = build_gnab_feature_id(hugo_symbol, genomic_build)
        # logger.debug("GNAB feature ID for SeqPeek: {0}".format(gnab_feature_id))
        #
        # # Get the project IDs these cohorts' samples come from
        # confirmed_project_ids, user_only_study_ids = get_confirmed_project_ids_for_cohorts(cohort_id_array)
        #
        # bqss = BigQueryServiceSupport.build_from_django_settings()
        # fvb = FeatureVectorBigQueryBuilder.build_from_django_settings(bqss)
        # program_set = get_program_set_for_seqpeek_plot(cohort_id_array)
        #
        # extra_provider_params = {
        #     "genomic_buid": genomic_build
        # }
        #
        # async_params = [
        #     ProviderClassQueryDescription(SeqPeekDataQueryHandler, gnab_feature_id, cohort_id_array,
        #                                   confirmed_project_ids, program_set, extra_provider_params)]
        # maf_data_result = fvb.get_feature_vectors_tcga_only(async_params, skip_formatting_for_plot=True)
        #
        # maf_data_vector = maf_data_result[gnab_feature_id]['data']
        #
        # if len(maf_data_vector) == 0:
        #     return JsonResponse(build_empty_data_response(hugo_symbol, cohort_id_array, maf_data_result['tables_queried']))
        #
        # if len(maf_data_vector) > 0:
        #    seqpeek_data = SeqPeekMAFDataFormatter().format_maf_vector_for_view(
        #        maf_data_vector, cohort_id_array, genomic_build)
        #
        # if len(seqpeek_data.maf_vector) == 0:
        #     return JsonResponse(build_empty_data_response(hugo_symbol, cohort_id_array, maf_data_result['tables_queried']))
        #
        # # Since the gene (hugo_symbol) parameter is part of the GNAB feature ID,
        # # it will be sanity-checked in the SeqPeekMAFDataAccess instance.
        # seqpeek_maf_vector = seqpeek_data.maf_vector
        # seqpeek_cohort_info = seqpeek_data.cohort_info
        # removed_row_statistics_dict = seqpeek_data.removed_row_statistics
        #
        # oncoprint_view_data = SeqPeekViewDataBuilder().build_view_data(hugo_symbol,
        #                                                              seqpeek_maf_vector,
        #                                                              seqpeek_cohort_info,
        #                                                              cohort_id_array,
        #                                                              removed_row_statistics_dict,
        #                                                              maf_data_result['tables_queried'])
        #return JsonResponse(oncoprint_view_data)
        #plot_data = generate_heatmap_data()
        return JsonResponse({#"plot_data": plot_data,
                             "hugo_symbol": hugo_symbol})


    except Exception as e:
        logger.error("[ERROR] In oncoprint_view_data: ")
        logger.exception(e)
        return JsonResponse({'Error': str(e)}, status=500)
