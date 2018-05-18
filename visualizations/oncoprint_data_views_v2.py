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

from google_helpers.bigquery.service_v2 import BigQueryServiceSupport
from bq_data_access.v2.data_access import FeatureVectorBigQueryBuilder
from bq_data_access.v2.oncoprint.oncoprint_view import OncoPrintViewDataBuilder
from bq_data_access.v2.oncoprint.oncoprint_maf_formatter import OncoPrintMAFDataFormatter
from bq_data_access.v2.oncoprint_data import OncoPrintDataQueryHandler
from bq_data_access.v2.feature_id_utils import ProviderClassQueryDescription, FeatureDataTypeHelper
from bq_data_access.data_types.definitions import FEATURE_ID_TO_TYPE_MAP
from visualizations.data_access_views_v2 import get_confirmed_project_ids_for_cohorts, get_public_program_name_set_for_cohorts

logger = logging.getLogger('main_logger')

def build_gnab_feature_id(gene_label, genomic_build):
    """
    Creates a GNAB v2 feature identifier that will be used to fetch data to be rendered in OncoPrint.

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


def get_program_set_for_oncoprint_plot(cohort_id_array):
    return {'tcga'}


def is_valid_genomic_build(genomic_build_param):
    """
    Returns: True if given genomic build is valid, otherwise False.
    """
    return genomic_build_param == "HG19" or genomic_build_param == "HG38"


def build_empty_data_response(hugo_symbol, cohort_id_array, tables_used):
    return {
        # The OncoPrint client side view detects data availability by checking if
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
        hugo_symbols = request.GET.getlist('hugo_symbola', None)
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
        program_set = get_public_program_name_set_for_cohorts(cohort_id_array)

        # Check to see if these programs have data for the requested vectors; if not, there's no reason to plot
        programs = FeatureDataTypeHelper.get_supported_programs_from_data_type(FEATURE_ID_TO_TYPE_MAP['gnab'])
        valid_programs = set(programs).intersection(program_set)

        if not len(valid_programs):
            return JsonResponse({'message': "The chosen cohorts do not contain samples from programs with Gene Mutation data."})

        gnab_feature_ids = []

        for hugo_symbol in hugo_symbols:
            gnab_feature_ids.append(build_gnab_feature_id(hugo_symbol, genomic_build))

        logger.debug("GNAB feature IDs for OncoPrint: {0}".format(str(gnab_feature_ids)))

        # Get the project IDs these cohorts' samples come from
        confirmed_project_ids, user_only_study_ids = get_confirmed_project_ids_for_cohorts(cohort_id_array)

        bqss = BigQueryServiceSupport.build_from_django_settings()
        fvb = FeatureVectorBigQueryBuilder.build_from_django_settings(bqss)
        program_set = get_program_set_for_oncoprint_plot(cohort_id_array)

        extra_provider_params = {
            "genomic_buid": genomic_build
        }

        async_params = [
            ProviderClassQueryDescription(OncoPrintDataQueryHandler, gnab_feature_ids, cohort_id_array,
                                          confirmed_project_ids, program_set, extra_provider_params)]
        maf_data_result = fvb.get_feature_vectors_tcga_only(async_params, skip_formatting_for_plot=True)

        maf_data_vectors = maf_data_result['data']

        if len(maf_data_vectors) == 0:
            return JsonResponse(build_empty_data_response(hugo_symbols, cohort_id_array, maf_data_result['tables_queried']))

        if len(maf_data_vectors) > 0:
           oncoprint_data = OncoPrintMAFDataFormatter().format_maf_vector_for_view(
               maf_data_vectors, cohort_id_array, genomic_build)

        if len(oncoprint_data.maf_vector) == 0:
            return JsonResponse(build_empty_data_response(hugo_symbols, cohort_id_array, maf_data_result['tables_queried']))

        # Since the gene (hugo_symbol) parameter is part of the GNAB feature ID,
        # it will be sanity-checked in the OncoPrintMAFDataAccess instance.
        seqpeek_maf_vector = oncoprint_data.maf_vector
        seqpeek_cohort_info = oncoprint_data.cohort_info
        removed_row_statistics_dict = oncoprint_data.removed_row_statistics

        seqpeek_view_data = OncoPrintViewDataBuilder().build_view_data(hugo_symbols,
                                                                     seqpeek_maf_vector,
                                                                     seqpeek_cohort_info,
                                                                     cohort_id_array,
                                                                     removed_row_statistics_dict,
                                                                     maf_data_result['tables_queried'])
        return JsonResponse(seqpeek_view_data)

    except Exception as e:
        logger.error("[ERROR] In seqpeek_view_data: ")
        logger.exception(e)
        return JsonResponse({'Error': str(e)}, status=500)
