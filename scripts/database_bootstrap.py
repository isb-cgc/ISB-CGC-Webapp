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

from idc import secret_settings, settings

PREFORMATTED_CLIN_ATTR = []

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "idc.settings")

import django
django.setup()

from idc_collections.models import Program, Collection, Attribute, Attribute_Display_Values

from django.contrib.auth.models import User
idc_superuser = User.objects.get(username="idc")

logger = logging.getLogger('main_logger')


def add_programs(program_set):
    for prog in program_set:
        try:
            obj, created = Program.objects.update_or_create(
                short_name=prog['short_name'], name=prog['full_name'], is_public=prog['public'],
                owner=User.objects.get(email=prog['owner']) if 'owner' in prog else idc_superuser)

            print("Program created:")
            print(obj)
        except Exception as e:
            logger.error("[ERROR] Program {} may not have been added!".format(prog['short_name']))
            logger.exception(e)


def add_collections(collection_set):
    collex_list = []
    try:
        for collex in collection_set:

            collex_list.append(
                Collection(
                    short_name=collex['short_name'], name=collex['full_name'], description=collex['description'],
                    is_public=collex['public'],
                    owner=User.objects.get(email=collex['owner']) if 'owner' in collex else idc_superuser
                )
            )

        Collection.objects.bulk_create(collex_list)

        for collex in collection_set:
            if 'prog' in collex:
                obj = Collection.objects.get(
                    short_name=collex['short_name'], name=collex['full_name'], is_public=collex['public'],
                    owner=User.objects.get(email=collex['owner']) if 'owner' in collex else idc_superuser
                )

                if len(collex['prog']) > 1:
                    collex_to_prog = []
                    for prog in collex['prog']:
                        prog_obj = Program.objects.get(
                            short_name=prog, owner=collex['owner'] if 'owner' in collex else idc_superuser,
                            active=True)
                        collex_to_prog.append(Collection.program.through(collection_id=obj.id, program_id=prog_obj.id))

                    Collection.program.through.objects.bulk_create(collex_to_prog)
                else:
                    obj.program.add(Program.objects.get(
                        short_name=collex['prog'][0], owner=collex['owner'] if 'owner' in collex else idc_superuser,
                        active=True
                    ))

    except Exception as e:
        logger.error("[ERROR] Collection {} may not have been added!".format(collex['short_name']))
        logger.exception(e)


def add_attributes(attr_set):
    for attr in attr_set:
        try:
            obj, created = Attribute.objects.update_or_create(
                name=attr['name'], display_name=attr['display_name'], data_type=attr['type'],
                preformatted_values=True if 'preformatted_values' in attr else False
            )
            if 'collex' in attr:
                for collex in attr['collex']:
                    obj.collections.add(Collection.objects.get(
                        short_name=collex,
                        active=True)
                    )

            if 'display_vals' in attr:
                for dv in attr['display_vals']:
                    Attribute_Display_Values.objects.update_or_create(
                        raw_value=dv['raw_value'], display_value=dv['display_value'], attribute=obj
                    )
        except Exception as e:
            logger.error("[ERROR] Attribute {} may not have been added!".format(attr['name']))
            logger.exception(e)


def main():

    try:
        add_programs([{
            "full_name": "The Cancer Genome Atlas",
            "short_name": "TCGA",
            "public": True
        }])

        collection_file = open("tcia_collex.csv", "r")
        line_reader = collection_file.readlines()
        collection_set = []

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")
            collection_set.append({
                "short_name": line_split[0], "full_name": line_split[1], "public": True,
                "description": line_split[2], "prog": ["TCGA"]}
            )

        add_collections(collection_set)

        collection_file.close()

        attr_vals_file = open("tcga_clin_display.csv", "r")
        line_reader = attr_vals_file.readlines()
        display_vals = {}

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")
            if line_split[0] not in display_vals:
                display_vals[line_split[0]] = {}
                if line_split[1] == 'NULL':
                    display_vals[line_split[0]]['preformatted_values'] = True
                else:
                    display_vals[line_split[0]]['vals'] = [{'raw_value': line_split[1], 'display_value': line_split[2]}]
            else:
                display_vals[line_split[0]]['vals'].append({'raw_value': line_split[1], 'display_value': line_split[2]})

        attr_vals_file.close()

        attr_file = open("clin_attributes.csv", "r")
        line_reader = attr_file.readlines()
        attr_set = []

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            attr = {
                'name': line_split[0],
                "display_name": line_split[1].replace("_", " ").title() if re.match(r'_', line_split[1]) else line_split[1],
                "type": Attribute.CATEGORICAL if line_split[1] == 'STRING' else Attribute.CONTINUOUS_NUMERIC,
                "collex": Collection.objects.values_list('short_name', flat=True)
            }

            if attr['name'] in display_vals:
                if 'preformatted_values' in display_vals[attr['name']]:
                    attr['preformatted_values'] = True
                else:
                    attr['display_vals'] = display_vals[attr['name']]['vals']

            attr_set.append(attr)

        attr_file.close()

        add_attributes(attr_set)

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
