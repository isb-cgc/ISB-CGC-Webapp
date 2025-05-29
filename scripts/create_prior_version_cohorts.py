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

logger = logging.getLogger(__name__)

COHORT_DEFS_EXAMPLE = [
    # {
    #         'name': 'Example v11: removed attribute',
    #         'desc': "This should trigger missing attribute alerts on the cohort list page for all attributes removed.",
    #         'filters': [
    #             {
    #                 'attribute': 'Glycolysis_Within_First_Quarter_of_Intensity_Range',
    #                 'values': [92, 234],
    #             }
    #         ]
    # },
    # {
    #     'name': 'Example v11: removed values',
    #     'desc': "This should trigger missing attribute alerts on the cohort list page for all values removed.",
    #     'filters': [
    #         {
    #             'attribute': 'collection_id',
    #             'values': ['apollo_5_esca'],
    #         }
    #     ]
    # },
    # {
    #     'name': 'Example v11: some removed attributes',
    #     'desc': "This should trigger missing attribute alerts on the cohort list page.",
    #     'filters': [
    #         {
    #             'attribute': 'access',
    #             'values': ['Public'],
    #         },
    #         {
    #             'attribute': 'collection_id',
    #             'values': ['4d_lung'],
    #         }
    #     ]
    # },
    # {
    #     'name': 'Example: V1 collection ID',
    #     'desc': "This shouldn't change from V1 to V2",
    #     'filters': [
    #         {
    #             'attribute': 'collection_id',
    #             'values': ['nsclc_radiomics'],
    #         }
    #     ]
    # },
    # {
    #     'name': 'Example: V1 Derived',
    #     'desc': "This shouldn't change from V1 to V2",
    #     'filters': [
    #         {
    #             'attribute': 'AnatomicRegionSequence',
    #             'values': ['T-42300:SRT'],
    #         }
    #     ]
    # },
    # {
    #     'name': 'Example: V1 Related, multi-value',
    #     'desc': "This shouldn't change from V1 to V2",
    #     'filters': [
    #         {
    #             'attribute': 'disease_code',
    #             'values': ['BLCA','BRCA'],
    #         },
    #         {
    #             'attribute': 'collection_id',
    #             'values': ['tcga_blca','tcga_brca','tcga_cesc','tcga_coad','tcga_esca','tcga_gbm',
    #                        'tcga_hnsc','tcga_kich','tcga_kirc','tcga_kirp','tcga_lgg','tcga_lihc',
    #                        'tcga_luad','tcga_lusc','tcga_ov','tcga_prad','tcga_read','tcga_sarc',
    #                        'tcga_stad','tcga_thca','tcga_ucec'],
    #         }
    #     ]
    # },
    # {
    #     'name': 'Example: V1 Comma-in-value',
    #     'desc': "This shouldn't change from V1 to V2",
    #     'filters': [
    #         {
    #             'attribute': 'tcia_tumorLocation',
    #             'values': ['Esophagus','Chest-abdomen-pelvis, Leg, Tspine'],
    #         }
    #     ]
    # },
    {
        'name': 'Example: BodyPartExamine, Bladder and Brain',
        'desc': 'V14',
        'filters': [
            {
                'attribute': 'BodyPartExamined',
                'values': ['BLADDER','BRAIN'],
            }
        ]
    },
    {
        'name': 'Example: SOPClassUID and Modality',
        'desc': 'V14',
        'filters': [
            {
                'attribute': 'SOPClassUID',
                'values': ['1.2.840.10008.5.1.4.1.1.88.33'],
            },
            {
                'attribute': 'Modality',
                'values': ['PT'],
            }
        ]
    },
    # {
    #     'name': 'Example: TCGA related filter',
    #     'desc': 'This shouldn\'t change from V1 to V2',
    #     'filters': [
    #         {
    #             'attribute': 'collection_id',
    #             'values': ['tcga_hnsc'],
    #         },
    #         {
    #             'attribute': 'pathologic_stage',
    #             'values': ['Stage I'],
    #         }
    #     ]
    # }
]

def load_cohort_defs(filename):
    with open(filename, 'r') as json_file:
        cohort_defs = json.load(json_file)
    return cohort_defs

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
    parser.add_argument('-u', '--user-emails', type=str, default='', help='User email(s) for cohort owner - comma separated')
    parser.add_argument('-v', '--versions', type=str, default='14.0', help='Versions for which to create cohorts, comma delimited. Eg.: 2.0, 3.0')
    return parser.parse_args()


def main():
    try:
        args = parse_args()
        if not len(args.user_emails):
            logger.error("[ERROR] User email(s) not provided! We can't make cohorts without a user or users to assign ownership.")
            exit(1)

        cohort_defs = load_cohort_defs(args.cohort_defs) if len(args.cohort_defs) else COHORT_DEFS_EXAMPLE
        versions = ImagingDataCommonsVersion.objects.filter(version_number__in=args.versions.split(','))
        user_emails = args.user_emails.split(",")
        users = User.objects.filter(email__in=user_emails)

        if len(users) != len(user_emails):
            logger.error("[ERROR] One or more users not found. Checking:")
            not_found = []
            for email in user_emails:
                try:
                    User.objects.get(email=email)
                except ObjectDoesNotExist:
                    not_found.append(email)
            if len(not_found) > 0:
                logger.error("[ERROR] The following users were not found - they need to log in once first before running this script!")
                logger.error("{}".format(" ".join(not_found)))
                exit(1)

        for user in users:
            attr_ids = {
                i.name: i.id for i in
                Attribute.objects.filter(name__in=[y['attribute'] for x in cohort_defs for y in x['filters']])
            }

            for cohort in cohort_defs:
                filters = {
                    str(attr_ids[x['attribute']]): x['values'] for x in cohort['filters']
                }
                for version in versions:
                    _save_cohort(user, filters, cohort['name'], None, version, desc=cohort['desc'], no_stats=bool(version == "1.0"))

    except Exception as e:
        logger.exception(e)


if __name__ == "__main__":
    main()
