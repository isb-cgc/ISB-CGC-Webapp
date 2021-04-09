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
import os
from argparse import ArgumentParser
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "idc.settings")

import django
django.setup()

from idc import settings
import logging
from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from cohorts.utils import _save_cohort
from idc_collections.models import ImagingDataCommonsVersion, Attribute

logger = logging.getLogger('main_logger')

cohort_defs = [
    {
        'name': 'Example: V1 collection ID',
        'desc': None,
        'filters': [
            {
                'attribute': 'collection_id',
                'values': ['nsclc_radiomics'],
            }
        ]
    },
    {
        'name': 'Example: V1 Derived',
        'desc': None,
        'filters': [
            {
                'attribute': 'AnatomicRegionSequence',
                'values': ['T-42300:SRT'],
            }
        ]
    },
    {
        'name': 'Example: V1 Related, multi-value',
        'desc': None,
        'filters': [
            {
                'attribute': 'disease_code',
                'values': ['BLCA','BRCA'],
            },
            {
                'attribute': 'collection_id',
                'values': ['tcga_blca','tcga_brca','tcga_cesc','tcga_coad','tcga_esca','tcga_gbm',
                           'tcga_hnsc','tcga_kich','tcga_kirc','tcga_kirp','tcga_lgg','tcga_lihc',
                           'tcga_luad','tcga_lusc','tcga_ov','tcga_prad','tcga_read','tcga_sarc',
                           'tcga_stad','tcga_thca','tcga_ucec'],
            }
        ]
    },
    {
        'name': 'Example: V1 Comma-in-value',
        'desc': None,
        'filters': [
            {
                'attribute': 'tcia_tumorLocation',
                'values': ['Esophagus','Chest-abdomen-pelvis, Leg, Tspine'],
            }
        ]
    },
]

def load_cohort_defs(filename):
    with open(filename, 'r') as json_file:
        cohort_defs = json.load(json_file)
    return

def parse_args():
    cohort_def_help_msg = """
      JSON file of Cohort definitions, should be an array of objects of the form:
      [ 
        {
          'name': <string>,
          'filters': [
            {
              'attribute': <attribute name>,
              'values': [
                val1, ...
              ]
            },
            ...
          ]
        },
        ...
      ]
    """

    parser = ArgumentParser()
    parser.add_argument('-c', '--cohort-defs', type=str, default='', help=cohort_def_help_msg)
    parser.add_argument('-u', '--user-email', type=str, default='', help='User email for cohort owner')
    parser.add_argument('-v', '--versions', type=str, default='1.0', help='Versions for which to create cohorts, comma delimited. Eg.: 1.0,2.0')
    return parser.parse_args()

def main():
    try:
        args = parse_args()
        if not len(args.user_email):
            logger.error("[ERROR] User email not provided! We can't make cohorts without a user to assign ownership.")
            exit(1)

        len(args.cohort_defs) and load_cohort_defs(args.cohort_defs)
        versions = ImagingDataCommonsVersion.objects.filter(version_number__in=args.versions.split(','))
        try:
            user = User.objects.get(email=args.user_email)
        except ObjectDoesNotExist:
            logger.error("[ERROR] User {} not found - you need to log in once first before running this script!".format(args.user_email))
            exit(1)
        attr_ids = {
            i.name: i.id for i in
            Attribute.objects.filter(name__in=[y['attribute'] for x in cohort_defs for y in x['filters']])
        }

        for cohort in cohort_defs:
            filters = {
                str(attr_ids[x['attribute']]): x['values'] for x in cohort['filters']
            }
            for version in versions:
                _save_cohort(user,filters,cohort['name'],None,version)

    except Exception as e:
        logger.exception(e)


if __name__ == "__main__":
    main()
