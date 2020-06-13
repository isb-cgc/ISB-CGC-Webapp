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
from itertools import combinations, product

from idc import secret_settings, settings

PREFORMATTED_CLIN_ATTR = []

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "idc.settings")

import django
django.setup()

from idc_collections.models import Program, Collection, Attribute, Attribute_Ranges, Attribute_Display_Values, DataSource, DataSourceJoin, DataVersion

from django.contrib.auth.models import User
idc_superuser = User.objects.get(username="idc")

logger = logging.getLogger('main_logger')


def add_data_versions(dv_set):
    for dv in dv_set:
        try:
            obj, created = DataVersion.objects.update_or_create(name=dv['name'], data_type=dv['type'], version=dv['ver'])

            progs = Program.objects.filter(name="TCGA")
            ver_to_prog = []

            for prog in progs:
                ver_to_prog.append(DataVersion.programs.through(dataversion_id=obj.id, program_id=prog.id))

            DataVersion.programs.through.objects.bulk_create(ver_to_prog)

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


def add_solr_collex(solr_set, ver_name):
    for collex in solr_set:
        try:
            obj, created = DataSource.objects.update_or_create(
                name=collex,
                version=DataVersion.objects.get(name=ver_name),
                count_col="case_barcode" if "tcga" in collex else "PatientID",
                source_type='S'
            )

            progs = Program.objects.filter(name="TCGA")
            src_to_prog = []

            for prog in progs:
                src_to_prog.append(DataSource.programs.through(datasource_id=obj.id, program_id=prog.id))

            DataSource.programs.through.objects.bulk_create(src_to_prog)

            print("Solr Collection entry created: {}".format(collex))
        except Exception as e:
            logger.error("[ERROR] Solr Collection {} may not have been added!".format(collex))
            logger.exception(e)


def add_bq_tables(tables, ver_name):
    for table in tables:
        try:
            obj, created = DataSource.objects.update_or_create(
                name=table, version=DataVersion.objects.get(name=ver_name),
                count_col="case_barcode" if "isb-cgc" in table else "PatientID",
                source_type='B'
            )

            progs = Program.objects.filter(name="TCGA")
            src_to_prog = []

            for prog in progs:
                src_to_prog.append(DataSource.programs.through(datasource_id=obj.id, program_id=prog.id))

            DataSource.programs.through.objects.bulk_create(src_to_prog)

            print("BQ Table created: {}".format(table))
        except Exception as e:
            logger.error("[ERROR] BigQuery Table {} may not have been added!".format(table))
            logger.exception(e)


def add_source_joins(froms, from_col, tos=None, to_col=None):
    src_joins = []

    if not tos and not to_col:
        joins = combinations(froms, 2)
        for join in joins:
            src_joins.append(DataSourceJoin(
                from_src=DataSource.objects.get(name=join[0]),
                to_src=DataSource.objects.get(name=join[1]),
                from_src_col=from_col,
                to_src_col=from_col)
            )
    else:
        joins = product(froms,tos)
        for join in joins:
            src_joins.append(DataSourceJoin(
                from_src=DataSource.objects.get(name=join[0]),
                to_src=DataSource.objects.get(name=join[1]),
                from_src_col=from_col,
                to_src_col=to_col)
            )

    if len(src_joins):
        DataSourceJoin.objects.bulk_create(src_joins)


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
                is_cross_collex=True if 'cross_collex' in attr else False,
                default_ui_display=attr['display'],
                units=attr.get('units',None)
            )
            if 'range' in attr:
                if len(attr['range']) > 0:
                    for attr_range in attr['range']:
                        Attribute_Ranges.objects.update_or_create(
                            **attr_range, attribute=obj
                        )
                else:
                    Attribute_Ranges.objects.update_or_create(
                        attribute=obj
                    )
            if 'display_vals' in attr:
                for dv in attr['display_vals']:
                    Attribute_Display_Values.objects.update_or_create(
                        raw_value=dv['raw_value'], display_value=dv['display_value'], attribute=obj
                    )
            if 'solr_collex' in attr:
                for solr in attr['solr_collex']:
                    for sc in DataSource.objects.filter(name=solr):
                        obj.data_sources.add(sc)
            if 'bq_tables' in attr:
                for table in attr['bq_tables']:
                    for bqt in DataSource.objects.filter(name=table):
                        obj.data_sources.add(bqt)

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
            {"name": "GDC Data Release 9", "ver": "r9", "type": "A"},
            {"name": "TCIA Image Data", "ver": "0", "type": "I"},
            {"name": "TCIA Segmentation Analysis", "ver": "0", "type": "D"},
            {"name": "TCIA Qualitative Analysis", "ver": "0", "type": "D"},
            {"name": "TCIA Quantitative Analysis", "ver": "0", "type": "D"},
        ])

        add_solr_collex(['tcia_images'], "TCIA Image Data")
        add_solr_collex(['segmentations'], "TCIA Segmentation Analysis")
        add_solr_collex(['qualitative_measurements'], "TCIA Qualitative Analysis")
        add_solr_collex(['quantitative_measurements'], "TCIA Quantitative Analysis")
        add_solr_collex(['tcga_clin', 'tcga_bios'], "GDC Data Release 9")

        add_bq_tables(["idc-dev.metadata.dicom_mvp"], "TCIA Image Data")
        add_bq_tables(['isb-cgc.TCGA_bioclin_v0.Biospecimen', 'isb-cgc.TCGA_bioclin_v0.Clinical'], "GDC Data Release 9")
        add_bq_tables(["idc-dev.metadata.segmentations"], "TCIA Segmentation Analysis")
        add_bq_tables(["idc-dev.metadata.qualitative_measurements"], "TCIA Qualitative Analysis")
        add_bq_tables(["idc-dev.metadata.quantitative_measurements"], "TCIA Quantitative Analysis")

        add_source_joins(["tcia_images", "segmentations", "qualitative_measurements", "quantitative_measurements"], "SOPInstanceUID")
        add_source_joins(["tcga_clin", "tcga_bios"], "case_barcode")
        add_source_joins(
            ["tcia_images", "segmentations", "qualitative_measurements", "quantitative_measurements"],
            "PatientID",
            ["tcga_clin", "tcga_bios"], "case_barcode"
        )

        add_source_joins(["idc-dev.metadata.dicom_mvp", "idc-dev.metadata.segmentations", "idc-dev.metadata.qualitative_measurements", "idc-dev.metadata.quantitative_measurements"], "SOPInstanceUID")
        add_source_joins(["isb-cgc.TCGA_bioclin_v0.Clinical", "isb-cgc.TCGA_bioclin_v0.Biospecimen"], "case_barcode")
        add_source_joins(
            ["idc-dev.metadata.dicom_mvp", "idc-dev.metadata.segmentations", "idc-dev.metadata.qualitative_measurements", "idc-dev.metadata.quantitative_measurements"],
            "PatientID",
            ["isb-cgc.TCGA_bioclin_v0.Clinical", "isb-cgc.TCGA_bioclin_v0.Biospecimen"], "case_barcode"
        )

        all_attrs = {}

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

        attr_file = open("tcga_clin.csv", "r")
        line_reader = attr_file.readlines()
        clin_table_attr = []
        for line in line_reader:
            line = line.strip()
            clin_table_attr.append(line)

        attr_file.close()

        attr_file = open("tcga_bios.csv", "r")
        line_reader = attr_file.readlines()
        bios_table_attr = []
        for line in line_reader:
            line = line.strip()
            bios_table_attr.append(line)

        attr_file.close()

        attr_file = open("tcga_attributes.csv", "r")
        line_reader = attr_file.readlines()
        attr_set = []

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            if line_split[0] not in all_attrs:
                all_attrs[line_split[0]] = {
                'name': line_split[0],
                "display_name": line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else
                line_split[1],
                "type": Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if
                line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                "collex": Collection.objects.values_list('short_name', flat=True),
                'solr_collex': [],
                'bq_tables': [],
                'display': True if line_split[-1] == 'True' else False
            }

            attr = all_attrs[line_split[0]]

            if attr['name'] in clin_table_attr:
                attr['solr_collex'].append('tcga_clin')
                attr['bq_tables'].append('isb-cgc.TCGA_bioclin_v0.Clinical')

            if attr['name'] in bios_table_attr:
                attr['solr_collex'].append('tcga_bios')
                attr['bq_tables'].append('isb-cgc.TCGA_bioclin_v0.Biospecimen')

            if attr['name'] in display_vals:
                if 'preformatted_values' in display_vals[attr['name']]:
                    attr['preformatted_values'] = True
                else:
                    attr['display_vals'] = display_vals[attr['name']]['vals']

            if attr['name'] == 'bmi':
                attr['range'] = [
                    {'label': 'underweight', 'first': "*", "last": "18.5", "gap": "0", "include_lower": True, "include_upper": False, 'type': 'F'},
                    {'label': 'obese', 'first': "30", "last": "*", "gap": "0", "include_lower": True,
                     "include_upper": True, 'type': 'F'},
                    {'label': 'normal weight', 'first': "18.5", "last": "25", "gap": "0", "include_lower": True,
                     "include_upper": False, 'type': 'F'},
                    {'label': 'overweight', 'first': "25", "last": "30", "gap": "0", "include_lower": True,
                     "include_upper": False, 'type': 'F'}
                ]
            elif attr['type'] == Attribute.CONTINUOUS_NUMERIC:
                attr['range'] = []

            attr_set.append(attr)

        attr_file.close()

        attr_file = open("tcia_attr.csv", "r")
        line_reader = attr_file.readlines()

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            if line_split[0] not in all_attrs:
                all_attrs[line_split[0]] = {
                    'name': line_split[0],
                    "display_name": line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else line_split[1],
                    "type": Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                    'cross_collex': True,
                    'solr_collex': [],
                    'bq_tables': [],
                    'display': True if line_split[-1] == 'True' else False
                }

            attr = all_attrs[line_split[0]]

            attr['solr_collex'].append('tcia_images')
            attr['bq_tables'].append('idc-dev.metadata.dicom_mvp')

            if attr['name'] in display_vals:
                if 'preformatted_values' in display_vals[attr['name']]:
                    attr['preformatted_values'] = True
                else:
                    attr['display_vals'] = display_vals[attr['name']]['vals']

            attr_set.append(attr)

        attr_file.close()

        attr_file = open("segs_attr.csv", "r")
        line_reader = attr_file.readlines()

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            if line_split[0] not in all_attrs:
                all_attrs[line_split[0]] = {
                    'name': line_split[0],
                    "display_name": line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else line_split[1],
                    "type": Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                    'cross_collex': True,
                    'solr_collex': [],
                    'bq_tables': [],
                    'display': True if line_split[-1] == 'True' else False
                }

            attr = all_attrs[line_split[0]]

            if attr['type'] == Attribute.CONTINUOUS_NUMERIC:
                attr['range'] = []

            attr['solr_collex'].append('segmentations')
            attr['bq_tables'].append('idc-dev.metadata.segmentations')

            if attr['name'] in display_vals:
                if 'preformatted_values' in display_vals[attr['name']]:
                    attr['preformatted_values'] = True
                else:
                    attr['display_vals'] = display_vals[attr['name']]['vals']

            attr_set.append(attr)

        attr_file = open("quants_attr.csv", "r")
        line_reader = attr_file.readlines()

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            if line_split[0] not in all_attrs:
                all_attrs[line_split[0]] = {
                'name': line_split[0],
                "display_name": line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else
                line_split[1],
                "type": Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if
                line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                'units': line_split[-1],
                'cross_collex': True,
                'solr_collex': [],
                'bq_tables': [],
                'display': True if line_split[3] == 'True' else False
            }

            attr = all_attrs[line_split[0]]

            if attr['type'] == Attribute.CONTINUOUS_NUMERIC:
                attr['range'] = []

            attr['solr_collex'].append('quantitative_measurements')
            attr['bq_tables'].append('idc-dev.metadata.quantitative_measurements')

            if attr['name'] in display_vals:
                if 'preformatted_values' in display_vals[attr['name']]:
                    attr['preformatted_values'] = True
                else:
                    attr['display_vals'] = display_vals[attr['name']]['vals']

            attr_set.append(attr)

        attr_file = open("quals_attr.csv", "r")
        line_reader = attr_file.readlines()

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            if line_split[0] not in all_attrs:
                all_attrs[line_split[0]] = {
                    'name': line_split[0],
                    "display_name": line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else
                    line_split[1],
                    "type": Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if
                    line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                    'cross_collex': True,
                    'solr_collex': [],
                    'bq_tables': [],
                    'display': True if line_split[-1] == 'True' else False
                }

            attr = all_attrs[line_split[0]]

            if attr['type'] == Attribute.CONTINUOUS_NUMERIC:
                attr['range'] = []

            attr['solr_collex'].append('qualitative_measurements')
            attr['bq_tables'].append('idc-dev.metadata.qualitative_measurements')

            if attr['name'] in display_vals:
                if 'preformatted_values' in display_vals[attr['name']]:
                    attr['preformatted_values'] = True
                else:
                    attr['display_vals'] = display_vals[attr['name']]['vals']

            attr_set.append(attr)

        add_attributes(attr_set)

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
