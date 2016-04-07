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

from collections import defaultdict
from copy import deepcopy
import logging
from re import compile as re_compile

from bq_data_access.cohort_cloudsql import CloudSQLCohortAccess

COORDINATE_FIELD_NAME = 'uniprot_aapos'
TYPE_FIELD_NAME = 'variant_classification'

DIGIT_FINDER_RE = re_compile('^\d+$')


class SeqPeekMAFWithCohorts(object):
    def __init__(self, maf_vector, cohort_info, removed_row_stats):
        self.maf_vector = maf_vector
        self.cohort_info = cohort_info
        self.removed_row_statistics = removed_row_stats


class SeqPeekMAFDataFormatter(object):
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

    def remove_rows_with_no_aa_position(self, data):
        result = []
        removed_stats = defaultdict(int)

        count = 0
        for row in data:
            aapos = row[COORDINATE_FIELD_NAME]
            if aapos is not None and len(DIGIT_FINDER_RE.findall(aapos)) == 1:
                count += 1
                item = deepcopy(row)
                item[COORDINATE_FIELD_NAME] = int(aapos)
                result.append(item)
            # Include removed row in statistics
            else:
                removed_stats[row[TYPE_FIELD_NAME]] += 1

        logging.debug("SeqPeek MAF filtered rows: {0}, total: {1}".format(len(result), len(data)))
        return result, removed_stats

    def get_cohort_information(self, cohort_id_array):
        # Get the name, size and ID for every requested cohort.
        cohort_info_array = CloudSQLCohortAccess.get_cohort_info(cohort_id_array)

        return cohort_info_array

    def format_maf_vector_for_view(self, maf_vector, cohort_id_array):
        filtered_maf_vector, removed_stats = self.remove_rows_with_no_aa_position(maf_vector)
        self.annotate_vector_with_cohorts(cohort_id_array, filtered_maf_vector)
        cohort_info = self.get_cohort_information(cohort_id_array)

        return SeqPeekMAFWithCohorts(filtered_maf_vector, cohort_info, removed_stats)
