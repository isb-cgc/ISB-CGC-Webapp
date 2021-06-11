###
# Copyright 2015-2020, Institute for Systems Biology
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
###

from __future__ import print_function

from builtins import str
from builtins import object
import datetime
import logging
import traceback
import os
import re
import csv
from argparse import ArgumentParser
import sys
import time
from copy import deepcopy

import django
django.setup()

from cohorts.models import Cohort
from cohorts.utils import _get_cohort_stats
from idc_collections.collex_metadata_utils import get_collex_metadata
from idc_collections.models import DataSetType,DataSource

logger = logging.getLogger('main_logger')


def main():
    try:
        for cohort in Cohort.objects.filter(active=True, case_count=0):

            if cohort.only_active_versions():
                cohort_stats = _get_cohort_stats(cohort.id)
            else:
                # _get_cohort_stats is written for the new, Study-aggregated index and won't function correctly
                # for a SOPInstanceUID index.
                filters = cohort.get_filters_as_dict_simple()[0]

                sources = DataSetType.objects.get(data_type=DataSetType.IMAGE_DATA).datasource_set.filter(
                    id__in=cohort.get_data_sources())

                child_record_searches = cohort.get_attrs().get_attr_set_types().get_child_record_searches()
                result = get_collex_metadata(filters, None, sources=sources, facets=["collection_id"], counts_only=True,
                                             totals=["PatientID", "StudyInstanceUID", "SeriesInstanceUID"],
                                             search_child_records_by=child_record_searches)
                cohort_stats = {}
                if 'totals' not in result:
                    logger.error(
                        "No totals found for filters {}; remember that String searches are case sensitive!".format(
                            filters
                        ))
                else:
                    for total in result['totals']:
                        cohort_stats[total] = result['totals'][total]
                    for src in result['facets']:
                        if src.split(':')[0] in list(sources.values_list('name',flat=True)):
                            cohort_stats['collections'] = [x for x, y in result['filtered_facets'][src]['facets']['collection_id'].items() if y > 0]

            cohort.case_count = cohort_stats.get('PatientID',0)
            cohort.series_count = cohort_stats.get('SeriesInstanceUID',0)
            cohort.study_count = cohort_stats.get('StudyInstanceUID',0)
            cohort.collections = "; ".join(cohort_stats.get('collections',""))
            cohort.save()

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
