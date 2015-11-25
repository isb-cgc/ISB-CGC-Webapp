"""

Copyright 2015, Institute for Systems Biology

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

from django.conf import settings

from bq_data_access.cohort_cloudsql import CloudSQLCohortAccess
from bq_data_access.seqpeek_maf_data import SeqPeekDataProvider


class SeqPeekMAFWithCohorts(object):
    def __init__(self, maf_vector, cohort_info):
        self.maf_vector = maf_vector
        self.cohort_info = cohort_info


class SeqPeekMAFDataAccess(object):
    def get_feature_vector(self, feature_id, cohort_id_array):
        cohort_settings = settings.GET_BQ_COHORT_SETTINGS()
        provider = SeqPeekDataProvider(feature_id)
        result = provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)

        return result

    def annotate_vector_with_cohorts(self, cohort_id_array, result):
        # Resolve which (requested) cohorts each datapoint belongs to.
        cohort_set_dict = CloudSQLCohortAccess.get_cohorts_for_datapoints(cohort_id_array)

        for row in result:
            sample_id = row['sample_id']

            # Add an array of cohort
            # only if the number of containing cohort exceeds the configured threshold.
            cohort_set = []
            # TODO FIX - this check shouldn't be needed
            if sample_id in cohort_set_dict:
                cohort_set = cohort_set_dict[sample_id]
            row['cohort'] = cohort_set

    def get_cohort_information(self, cohort_id_array):
        # Get the name and ID for every requested cohort.
        cohort_info_array = CloudSQLCohortAccess.get_cohort_info(cohort_id_array)

        return cohort_info_array

    def get_data(self, feature_id, cohort_id_array):
        vector = self.get_feature_vector(feature_id, cohort_id_array)
        self.annotate_vector_with_cohorts(cohort_id_array, vector)

        cohort_info = self.get_cohort_information(cohort_id_array)
        return SeqPeekMAFWithCohorts(vector, cohort_info)
