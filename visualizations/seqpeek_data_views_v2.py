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

import logging as logger
import traceback
import sys

from django.http import JsonResponse
from django.contrib.auth.decorators import login_required

from google_helpers.bigquery_service_v2 import BigQueryServiceSupport
from bq_data_access.v2.data_access import FeatureVectorBigQueryBuilder
from bq_data_access.v2.seqpeek.seqpeek_view import SeqPeekViewDataBuilder
from bq_data_access.v2.seqpeek.seqpeek_maf_formatter import SeqPeekMAFDataFormatter
from bq_data_access.v2.seqpeek_maf_data import SeqPeekDataQueryHandler
from bq_data_access.v2.feature_id_utils import ProviderClassQueryDescription
from visualizations.data_access_views_v2 import get_confirmed_project_ids_for_cohorts


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
    return genomic_build_param == "hg19" or genomic_build_param == "hg38"


@login_required
def seqpeek_view_data(request):
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

        if len(cohort_id_array) == 0:
            return JsonResponse({'error': 'No cohorts specified'}, status=400)

        gnab_feature_id = build_gnab_feature_id(hugo_symbol, genomic_build)
        logger.debug("GNAB feature ID for SeqPeek: {0}".format(gnab_feature_id))

        # Get the project IDs these cohorts' samples come from
        confirmed_project_ids = get_confirmed_project_ids_for_cohorts(cohort_id_array)

        bqss = BigQueryServiceSupport.build_from_django_settings()
        fvb = FeatureVectorBigQueryBuilder.build_from_django_settings(bqss)
        program_set = get_program_set_for_seqpeek_plot(cohort_id_array)

        extra_provider_params = {
            "genomic_buid": genomic_build
        }

        async_params = [
            ProviderClassQueryDescription(SeqPeekDataQueryHandler, gnab_feature_id, cohort_id_array,
                                          confirmed_project_ids, program_set, extra_provider_params)]
        maf_data_result = fvb.get_feature_vectors_tcga_only(async_params, skip_formatting_for_plot=True)

        maf_data_vector = maf_data_result[gnab_feature_id]['data']

        if len(maf_data_vector) > 0:
            seqpeek_data = SeqPeekMAFDataFormatter().format_maf_vector_for_view(maf_data_vector, cohort_id_array,
                                                                                genomic_build)
        if len(seqpeek_data.maf_vector) > 0:
            # Since the gene (hugo_symbol) parameter is part of the GNAB feature ID,
            # it will be sanity-checked in the SeqPeekMAFDataAccess instance.
            seqpeek_maf_vector = seqpeek_data.maf_vector
            seqpeek_cohort_info = seqpeek_data.cohort_info
            removed_row_statistics_dict = seqpeek_data.removed_row_statistics

            seqpeek_view_data = SeqPeekViewDataBuilder().build_view_data(hugo_symbol,
                                                                         seqpeek_maf_vector,
                                                                         seqpeek_cohort_info,
                                                                         cohort_id_array,
                                                                         removed_row_statistics_dict)
            return JsonResponse(seqpeek_view_data)
        else:
            # No data found
            return JsonResponse({
                # The SeqPeek client side view detects data availability by checking if
                # the "plot_data" object has the "tracks" key present.
                'plot_data': {},
                'hugo_symbol': hugo_symbol,
                'cohort_id_list': [str(i) for i in cohort_id_array],
                'removed_row_statistics': []
            })

    except Exception as e:
        print >> sys.stdout, traceback.format_exc()
        logger.exception(e)
        return JsonResponse({'Error': str(e)}, status=500)
