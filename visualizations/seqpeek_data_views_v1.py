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

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from bq_data_access.v1.data_access import get_feature_vectors_tcga_only
from bq_data_access.v1.seqpeek.seqpeek_view import SeqPeekViewDataBuilder
from bq_data_access.v1.seqpeek.seqpeek_maf_formatter import SeqPeekMAFDataFormatter
from bq_data_access.v1.seqpeek_maf_data import SeqPeekDataProvider
from bq_data_access.v1.data_access import ProviderClassQueryDescription
from visualizations.data_access_views import get_confirmed_project_ids_for_cohorts


logger = logging.getLogger('main_logger')


def build_gnab_feature_id(gene_label):
    return "GNAB:{gene_label}:variant_classification".format(gene_label=gene_label)


@login_required
def seqpeek_view_data(request):
    try:
        hugo_symbol = request.GET.get('hugo_symbol', None)
        cohort_id_param_array = request.GET.getlist('cohort_id', None)
        cohort_id_array = []

        for cohort_id in cohort_id_param_array:
            try:
                cohort_id = int(cohort_id)
                cohort_id_array.append(cohort_id)
            except Exception as e:
                return JsonResponse({'error': 'Invalid cohort parameter'}, status=400)

        if len(cohort_id_array) == 0:
            return JsonResponse({'error': 'No cohorts specified'}, status=400)

        gnab_feature_id = build_gnab_feature_id(hugo_symbol)
        logger.debug("GNAB feature ID for SeqPeek: {0}".format(gnab_feature_id))

        # Get the project IDs these cohorts' samples come from
        confirmed_project_ids = get_confirmed_project_ids_for_cohorts(cohort_id_array)

        async_params = [
            ProviderClassQueryDescription(SeqPeekDataProvider, gnab_feature_id, cohort_id_array, confirmed_project_ids)]
        maf_data_result = get_feature_vectors_tcga_only(async_params, skip_formatting_for_plot=True)

        maf_data_vector = maf_data_result[gnab_feature_id]['data']

        if len(maf_data_vector) > 0:
            # Since the gene (hugo_symbol) parameter is part of the GNAB feature ID,
            # it will be sanity-checked in the SeqPeekMAFDataAccess instance.
            seqpeek_data = SeqPeekMAFDataFormatter().format_maf_vector_for_view(maf_data_vector, cohort_id_array)

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
        logger.error("[ERROR] In seqpeek_view_data: ")
        logger.exception(e)
        return JsonResponse({'error': str(e)}, status=500)
