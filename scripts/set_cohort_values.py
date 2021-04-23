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

logger = logging.getLogger('main_logger')


def main():
    try:
        for cohort in Cohort.objects.all():
            cohort_stats = _get_cohort_stats(cohort.id)
            cohort.case_count = cohort_stats['PatientID']
            cohort.series_count = cohort_stats['SeriesInstanceUID']
            cohort.study_count = cohort_stats['StudyInstanceUID']
            cohort.collections = "; ".join(cohort_stats['collections'])
            cohort.save()

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
