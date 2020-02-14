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

from idc_collections.models import Program, Collection, Attribute, Attribute_Display_Values, SolrCollection, BigQueryTable, DataVersion

from django.contrib.auth.models import User
idc_superuser = User.objects.get(username="idc")

logger = logging.getLogger('main_logger')


def add_data_versions(dv_set):
    for dv in dv_set:
        try:
            obj, created = DataVersion.objects.update_or_create(name=dv['name'], data_type=dv['type'], version=dv['ver'])

            print("Data Version created:")
            print(obj)
        except Exception as e:
            logger.error("[ERROR] Data Version {} may not have been added!".format(dv['name']))
            logger.exception(e)


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


def add_solr_collex(solr_set, version="0"):
    for collex in solr_set:
        try:
            obj, created = SolrCollection.objects.update_or_create(
                name=collex,
                version=DataVersion.objects.get(version=version),
                shared_id_col="case_barcode" if "tcga" in collex else "PatientID"
            )
            print("Solr Collection entry created: {}".format(collex))
        except Exception as e:
            logger.error("[ERROR] Program {} may not have been added!".format(collex))
            logger.exception(e)


def add_bq_tables(tables, version="r9"):
    for table in tables:
        try:
            obj, created = BigQueryTable.objects.update_or_create(
                name=table, version=DataVersion.objects.get(version=version),
                shared_id_col="case_barcode" if "isb-cgc" in table else "PatientID"
            )
            print("BQ Table created: {}".format(table))
        except Exception as e:
            logger.error("[ERROR] BigQuery Table {} may not have been added!".format(table))
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

            if 'data_versions' in collex:
                obj = Collection.objects.get(
                    short_name=collex['short_name'], name=collex['full_name'], is_public=collex['public'],
                    owner=User.objects.get(email=collex['owner']) if 'owner' in collex else idc_superuser
                )

                if len(collex['data_versions']) > 1:
                    collex_to_dv = []
                    for dv in collex['data_versions']:
                        dv_obj = DataVersion.objects.get(active=True, version=dv['ver'], data_type=dv['type'])
                        collex_to_dv.append(Collection.data_versions.through(collection_id=obj.id, dataversion_id=dv_obj.id))

                    Collection.data_versions.through.objects.bulk_create(collex_to_dv)
                else:
                    obj.data_versions.add(DataVersion.objects.get(active=True, version=dv['ver'], data_type=dv['type']))

    except Exception as e:
        logger.error("[ERROR] Collection {} may not have been added!".format(collex['short_name']))
        logger.exception(e)


def add_attributes(attr_set):
    for attr in attr_set:
        try:
            obj, created = Attribute.objects.update_or_create(
                name=attr['name'], display_name=attr['display_name'], data_type=attr['type'],
                preformatted_values=True if 'preformatted_values' in attr else False,
                is_cross_collex=True if 'cross_collex' in attr else False
            )
            if 'display_vals' in attr:
                for dv in attr['display_vals']:
                    Attribute_Display_Values.objects.update_or_create(
                        raw_value=dv['raw_value'], display_value=dv['display_value'], attribute=obj
                    )
            if 'solr_collex' in attr:
                for solr in attr['solr_collex']:
                    for sc in SolrCollection.objects.filter(name=solr):
                        obj.solr_collections.add(sc)
            if 'bq_tables' in attr:
                for table in attr['bq_tables']:
                    for bqt in BigQueryTable.objects.filter(name=table):
                        obj.bq_tables.add(bqt)

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

        add_data_versions([
            {"name": "TCGA Clinical and Biospecimen Data", "ver": "r9", "type": "A"},
            {"name": "TCIA Image Data", "ver": "0", "type": "I"}]
        )

        add_solr_collex(['tcia_images'])
        add_solr_collex(['tcga_clin_bios'], 'r9')
        add_bq_tables(['isb-cgc.TCGA_bioclin_v0.Biospecimen', 'isb-cgc.TCGA_bioclin_v0.Clinical'])
        tcia_tables_file = open("tcia_collex_tables.csv", "r")
        line_reader = tcia_tables_file.readlines()
        tcia_bq_table_set = []
        for line in line_reader:
            tcia_bq_table_set.append(line.strip())

        add_bq_tables(tcia_bq_table_set, "0")
        tcia_tables_file.close()

        collection_file = open("tcia_collex.csv", "r")
        line_reader = collection_file.readlines()
        collection_set = []

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")
            collection_set.append({
                "short_name": line_split[0], "full_name": line_split[1], "public": True,
                "description": line_split[2], "prog": ["TCGA"],
                "data_versions": [{"ver": "r9", "type": "A"},{"ver": "0", "type": "I"}]
            })

        add_collections(collection_set)

        collection_file.close()

        attr_vals_file = open("display_vals.csv", "r")
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

        attr_file = open("clin.csv", "r")
        line_reader = attr_file.readlines()
        clin_table_attr = []
        for line in line_reader:
            line = line.strip()
            clin_table_attr.append(line)

        attr_file.close()

        attr_file = open("bios.csv", "r")
        line_reader = attr_file.readlines()
        bios_table_attr = []
        for line in line_reader:
            line = line.strip()
            bios_table_attr.append(line)

        attr_file.close()

        attr_file = open("clin_attributes.csv", "r")
        line_reader = attr_file.readlines()
        attr_set = []

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            attr = {
                'name': line_split[0],
                "display_name": line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else
                line_split[1],
                "type": Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if
                line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                "collex": Collection.objects.values_list('short_name', flat=True),
                'solr_collex': ['tcga_clin_bios'],
                'bq_tables': []
            }

            if attr['name'] in clin_table_attr:
                attr['bq_tables'].append('isb-cgc.TCGA_bioclin_v0.Clinical')

            if attr['name'] in bios_table_attr:
                attr['bq_tables'].append('isb-cgc.TCGA_bioclin_v0.Biospecimen')

            if attr['name'] in display_vals:
                if 'preformatted_values' in display_vals[attr['name']]:
                    attr['preformatted_values'] = True
                else:
                    attr['display_vals'] = display_vals[attr['name']]['vals']

            attr_set.append(attr)

        attr_file.close()

        attr_file = open("tcia_attr.csv", "r")
        line_reader = attr_file.readlines()

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            attr_set.append({
                'name': line_split[0],
                "display_name": line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else line_split[1],
                "type": Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                'cross_collex': True,
                'solr_collex': ['tcia_images'],
                'bq_tables': tcia_bq_table_set
            })

        attr_set.append({
            'name': 'collection_id',
            'display_name': "Collection",
            "type": Attribute.CATEGORICAL,
            "cross_collex": True,
            'solr_collex': ['tcia_images'],
            'bq_tables': tcia_bq_table_set
        })

        add_attributes(attr_set)

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
