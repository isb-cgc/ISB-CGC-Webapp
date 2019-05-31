#
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

from builtins import object
from collections import defaultdict
from copy import deepcopy
import logging
from re import compile as re_compile

from bq_data_access.v2.cohort_cloudsql import CloudSQLCohortAccess

logger = logging.getLogger('main_logger')

COORDINATE_FIELD_NAME = 'uniprot_aapos'
TYPE_FIELD_NAME = 'variant_classification'


class SeqPeekMAFWithCohorts(object):
    def __init__(self, maf_vector, cohort_info, removed_row_stats):
        self.maf_vector = maf_vector
        self.cohort_info = cohort_info
        self.removed_row_statistics = removed_row_stats


class SeqPeekMAFDataFormatter(object):
    DIGIT_FINDER_RE = re_compile('^\d+$')

    # '600/766' -> '600'
    HG38_REGEX_1 = re_compile('^(\d+)/\d+$')
    # '566-567/1158' -> '566'
    HG38_REGEX_2 = re_compile('^(\d+)-\d+/\d+$')

    def get_protein_position_for_hg19(self, protein_position):
        if protein_position is None:
            return None
        if len(self.DIGIT_FINDER_RE.findall(protein_position)) == 1:
            return int(protein_position)

    def get_protein_position_for_hg38(self, protein_position):
        if protein_position is None:
            return None
        regex_list = [
            self.HG38_REGEX_1,
            self.HG38_REGEX_2
        ]

        value = None
        for regex in regex_list:
            result = regex.findall(protein_position)
            if len(result) > 0:
                value = result[0]

        if value is not None:
            value = int(value)

        return value

    def annotate_vector_with_cohorts(self, cohort_id_array, result):
        # Resolve which (requested) cohorts each datapoint belongs to.
        cohorts_and_projects = CloudSQLCohortAccess.get_cohorts_and_projects_for_datapoints(cohort_id_array)
        cohort_set_dict = cohorts_and_projects['cohorts']

        for row in result:
            sample_id = row['sample_id']

            # Add an array of cohort
            # only if the number of containing cohort exceeds the configured threshold.
            cohort_set = []
            # TODO FIX - this check shouldn't be needed
            if sample_id in cohort_set_dict:
                cohort_set = cohort_set_dict[sample_id]
            row['cohort'] = cohort_set

    def remove_rows_with_no_aa_position(self, data, genomic_build):
        result = []
        removed_stats = defaultdict(int)

        if genomic_build == "hg19":
            protein_position_parse_fn = self.get_protein_position_for_hg19
        else:
            protein_position_parse_fn = self.get_protein_position_for_hg38

        count = 0
        for row in data:
            aapos = row[COORDINATE_FIELD_NAME]

            protein_position_value = protein_position_parse_fn(aapos)

            if protein_position_value is not None:
                count += 1
                item = deepcopy(row)
                item[COORDINATE_FIELD_NAME] = protein_position_value
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

    def format_maf_vector_for_view(self, maf_vector, cohort_id_array, genomic_build):
        filtered_maf_vector, removed_stats = self.remove_rows_with_no_aa_position(maf_vector, genomic_build)
        self.annotate_vector_with_cohorts(cohort_id_array, filtered_maf_vector)
        cohort_info = self.get_cohort_information(cohort_id_array)

        return SeqPeekMAFWithCohorts(filtered_maf_vector, cohort_info, removed_stats)
