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

from isb_cgc import secret_settings, settings

PREFORMATTED_CLIN_ATTR = []

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "isb_cgc.settings")

import django
django.setup()

from projects.models import Program, Attribute, Attribute_Ranges, Attribute_Display_Values, DataSource, DataVersion

from django.contrib.auth.models import User
isb_superuser = User.objects.get(username="isb")

logger = logging.getLogger('main_logger')

ranges_needed = {
    'wbc_at_diagnosis': 'by_200',
    'event_free_survival_time_in_days': 'by_500',
    'days_to_death': 'by_500',
    'days_to_last_known_alive': 'by_500',
    'days_to_last_followup': 'by_500',
    'year_of_diagnosis': 'year',
    'days_to_birth': 'by_negative_3k',
    'age_at_diagnosis': None
}

ranges = {
    'by_200': [{'first': "200", "last": "1400", "gap": "200", "include_lower": True, "unbounded": True,
                             "include_upper": True, 'type': 'F', 'unit': '0.01'}],
    'by_negative_3k': [{'first': "-15000", "last": "-5000", "gap": "3000", "include_lower": True, "unbounded": True,
                             "include_upper": False, 'type': 'I'}],
    'by_500': [{'first': "500", "last": "6000", "gap": "500", "include_lower": False, "unbounded": True,
                             "include_upper": True, 'type': 'I'}],
    'year': [{'first': "1976", "last": "2015", "gap": "5", "include_lower": True, "unbounded": False,
                             "include_upper": False, 'type': 'I'}]
}

def add_data_versions(dv_set):
    for dv in dv_set:
        try:
            progs = Program.objects.filter(name__in=dv['programs'], active=True, owner=isb_superuser, is_public=True)
            obj, created = DataVersion.objects.update_or_create(name=dv['name'], data_type=dv['type'], version=dv['ver'])
            dv_to_prog = []

            for prog in progs:
                dv_to_prog.append(DataVersion.programs.through(dataversion_id=obj.id, program_id=prog.id))

            DataVersion.programs.through.objects.bulk_create(dv_to_prog)

            print("Data Version created:")
            print(obj)
        except Exception as e:
            logger.error("[ERROR] Data Version {} may not have been added!".format(dv['name']))
            logger.exception(e)


def add_solr_collex(solr_set, ver_name, programs):
    for collex in solr_set:
        try:
            obj, created = DataSource.objects.update_or_create(
                name=collex,
                version=DataVersion.objects.get(name=ver_name),
                shared_id_col="PatientID" if "tcia" in collex else "case_barcode",
                source_type='S'
            )

            progs = Program.objects.filter(name__in=programs)
            src_to_prog = []

            for prog in progs:
                src_to_prog.append(DataSource.programs.through(datasource_id=obj.id, program_id=prog.id))

            DataSource.programs.through.objects.bulk_create(src_to_prog)

            print("Solr Collection entry created: {}".format(collex))
        except Exception as e:
            logger.error("[ERROR] Solr Collection {} may not have been added!".format(collex))
            logger.exception(e)


def add_bq_tables(tables, ver_name, programs):
    for table in tables:
        try:
            obj, created = DataSource.objects.update_or_create(
                name=table, version=DataVersion.objects.get(name=ver_name),
                shared_id_col="PatientID" if "idc" in table else "case_barcode",
                source_type='B'
            )

            progs = Program.objects.filter(name__in=programs)
            src_to_prog = []

            for prog in progs:
                src_to_prog.append(DataSource.programs.through(datasource_id=obj.id, program_id=prog.id))

            DataSource.programs.through.objects.bulk_create(src_to_prog)

            print("BQ Table created: {}".format(table))
        except Exception as e:
            logger.error("[ERROR] BigQuery Table {} may not have been added!".format(table))
            logger.exception(e)

def add_attributes(attr_set):
    for attr in attr_set:
        try:
            obj, created = Attribute.objects.update_or_create(
                name=attr['name'], display_name=attr['display_name'], data_type=attr['type'],
                preformatted_values=True if 'preformatted_values' in attr else False,
                is_cross_collex=True if 'cross_collex' in attr else False,
                default_ui_display=attr['display']
            )
            if 'range' in attr:
                if len(attr['range']) > 0:
                    for attr_range in attr['range']:
                        Attribute_Ranges.objects.update_or_create(
                            attribute=obj, **attr_range
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
                sources = DataSource.objects.filter(name__in=attr['solr_collex'])
                attr_to_src = []

                for src in sources:
                    attr_to_src.append(Attribute.data_sources.through(datasource_id=src.id, attribute_id=obj.id))

                Attribute.data_sources.through.objects.bulk_create(attr_to_src)
            if 'bq_tables' in attr:
                sources = DataSource.objects.filter(name__in=attr['bq_tables'])
                attr_to_src = []

                for src in sources:
                    attr_to_src.append(Attribute.data_sources.through(datasource_id=src.id, attribute_id=obj.id))

                Attribute.data_sources.through.objects.bulk_create(attr_to_src)

        except Exception as e:
            logger.error("[ERROR] Attribute {} may not have been added!".format(attr['name']))
            logger.exception(e)


def main():

    try:
        add_data_versions([
            {"name": "GDC Release 9 Clinical", "ver": "r9", "type": "C", "programs": ['TCGA','CCLE','TARGET']},
            {"name": "GDC Release 9 Biospecimen Data", "ver": "r9", "type": "B", "programs": ['TCGA','CCLE','TARGET']},
            {"name": "GDC Release 9 File Data", "ver": "r9", "type": "F", "programs": ['TCGA','CCLE','TARGET']},
            {"name": "GDC Release 9 Data Availability", "ver": "r9", "type": "D", "programs": ['TCGA', 'TARGET']},
            {"name": "TCIA Image Data Ver 0", "ver": "0", "type": "I", "programs": ["TCGA"]},
            {"name": "GDC Release 9 Mutation Data", "ver": "r9", "type": "M", "programs": ["TCGA"]}
        ])

        add_solr_collex(['tcga_tcia_images'], "TCIA Image Data Ver 0", ["TCGA"])
        add_solr_collex(['ccle_bios'], "GDC Release 9 Biospecimen Data", ["CCLE"])
        add_solr_collex(['tcga_bios'], "GDC Release 9 Biospecimen Data", ["TCGA"])
        add_solr_collex(['target_bios'], "GDC Release 9 Biospecimen Data", ["TARGET"])
        add_solr_collex(['tcga_clin'], "GDC Release 9 Clinical", ["TCGA"])
        add_solr_collex(['target_clin'], "GDC Release 9 Clinical", ["TARGET"])
        add_solr_collex(['ccle_clin'], "GDC Release 9 Clinical", ["CCLE"])
        add_solr_collex(['files_hg19', 'files_hg38'], "GDC Release 9 File Data", ['TCGA','CCLE','TARGET'])

        add_bq_tables(['idc-dev-etl.tcia.dicom_metadata'], "TCIA Image Data Ver 0", ["TCGA"])
        add_bq_tables(['isb-cgc.TCGA_bioclin_v0.Biospecimen'], "GDC Release 9 Biospecimen Data", ["TCGA"])
        add_bq_tables(['isb-cgc.TARGET_bioclin_v0.Biospecimen'], "GDC Release 9 Biospecimen Data", ["TARGET"])
        add_bq_tables(['isb-cgc.CCLE_bioclin_v0.biospecimen_v1'], "GDC Release 9 Biospecimen Data", ["CCLE"])
        add_bq_tables(['isb-cgc.TCGA_bioclin_v0.Clinical'], "GDC Release 9 Clinical", ["TCGA"])
        add_bq_tables(['isb-cgc.CCLE_bioclin_v0.clinical_v0'], "GDC Release 9 Clinical", ["CCLE"])
        add_bq_tables(['isb-cgc.TARGET_bioclin_v0.Clinical'], "GDC Release 9 Clinical", ["TARGET"])
        add_bq_tables(['isb-cgc.TCGA_hg19_data_v0.tcga_metadata_data_hg19_r14','isb-cgc.TCGA_hg38_data_v0.tcga_metadata_data_hg38_r14'], "GDC Release 9 File Data", ["TCGA"])
        add_bq_tables(['isb-cgc.TARGET_hg38_data_v0.target_metadata_data_hg38_r14','isb-cgc.TARGET_hg19_data_v0.target_metadata_data_hg19_r14'], "GDC Release 9 File Data", ["TARGET"])
        add_bq_tables(['isb-cgc.CCLE_hg19_data_v0.ccle_metadata_data_hg19_r14'], "GDC Release 9 File Data", ["CCLE"])

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

        attr_list = {}
        clin_table_attr = {}
        bios_table_attr = {}

        for program in Program.objects.filter(owner=isb_superuser,active=True,is_public=True):
            attr_file = open("{}_clin.csv".format(program.name.lower()), "r")
            line_reader = attr_file.readlines()
            clin_table_attr[program.name.lower()] = [line.strip() for line in line_reader]

            attr_file.close()

            attr_file = open("{}_bios.csv".format(program.name.lower()), "r")
            line_reader = attr_file.readlines()
            bios_table_attr[program.name.lower()] = [line.strip() for line in line_reader]

            attr_file.close()

            attr_file = open("{}_attributes.csv".format(program.name.lower()), "r")
            line_reader = attr_file.readlines()

            for line in line_reader:
                line = line.strip()
                line_split = line.split(",")

                if line_split[0] not in attr_list:
                    attr_list[line_split[0]] = {
                        'name': line_split[0],
                        "display_name": line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else
                        line_split[1],
                        "type": Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if
                        line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                        'solr_collex': [],
                        'bq_tables': [],
                        'display': True if line_split[-1] == 'True' else False
                    }

                attr = attr_list[line_split[0]]

                if attr['name'] in clin_table_attr[program.name.lower()]:
                    attr['bq_tables'].extend(list(program.get_data_sources(DataVersion.CLINICAL_DATA, DataSource.BIGQUERY).values_list('name', flat=True)))
                    attr['solr_collex'].extend(list(program.get_data_sources(DataVersion.CLINICAL_DATA, DataSource.SOLR).values_list('name', flat=True)))

                if attr['name'] in bios_table_attr[program.name.lower()]:
                    attr['bq_tables'].extend(list(program.get_data_sources(DataVersion.BIOSPECIMEN_DATA, DataSource.BIGQUERY).values_list('name', flat=True)))
                    attr['solr_collex'].extend(list(program.get_data_sources(DataVersion.BIOSPECIMEN_DATA, DataSource.SOLR).values_list('name', flat=True)))

                if attr['name'] in display_vals:
                    if 'preformatted_values' in display_vals[attr['name']]:
                        attr['preformatted_values'] = True
                    else:
                        if 'display_vals' not in attr:
                            attr['display_vals'] = []
                        attr['display_vals'].extend(display_vals[attr['name']]['vals'])

                if 'range' not in attr:
                    if attr['name'] == 'bmi':
                        attr['range'] = [
                            {'label': 'underweight', 'first': "*", "last": "18.5", "gap": "0", "include_lower": True, "include_upper": False, 'type': 'F'},
                            {'label': 'obese', 'first': "30", "last": "*", "gap": "0", "include_lower": True,
                             "include_upper": True, 'type': 'F'},
                            {'label': 'normal', 'first': "18.5", "last": "25", "gap": "0", "include_lower": True,
                             "include_upper": False, 'type': 'F'},
                            {'label': 'overweight', 'first': "25", "last": "30", "gap": "0", "include_lower": True,
                             "include_upper": False, 'type': 'F'}
                        ]
                    else:
                        if attr['name'].lower() in ranges_needed:
                            attr['range'] = ranges.get(ranges_needed.get(attr['name'],''),[])

                if attr['name'] in display_vals:
                    if 'preformatted_values' in display_vals[attr['name']]:
                        attr['preformatted_values'] = True
                    else:
                        attr['display_vals'] = display_vals[attr['name']]['vals']

            attr_file.close()

            # Right now, we only have TCGA image and mutation data
            if program.name == 'TCGA':
                attr_file = open("tcia_attr.csv", "r")
                line_reader = attr_file.readlines()

                for line in line_reader:
                    line = line.strip()
                    line_split = line.split(",")

                    if line_split[0] not in attr_list:
                        attr_list[line_split[0]] = {
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
                    attr = attr_list[line_split[0]]
                    attr['solr_collex'].append('tcga_tcia_images')
                    attr['bq_tables'].append("idc-dev-etl.tcia.dicom_metadata")

                attr_file.close()

                attr_file = open("tcga_mut_attr.csv", "r")
                line_reader = attr_file.readlines()

                for line in line_reader:
                    line = line.strip()
                    line_split = line.split(",")

                    if line_split[0] not in attr_list:
                        attr_list[line_split[0]] = {
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
                    attr = attr_list[line_split[0]]
                    attr['solr_collex'].extend(['tcga_mut_hg19','tcga_mut_hg38'])
                    attr['bq_tables'].extend(['isb-cgc.TCGA_hg19_data_v0.MC3','isb-cgc.TCGA_hg38_data_v0.DCM'])

                attr_file.close()

        attr_file = open("files.csv", "r")
        line_reader = attr_file.readlines()
        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            if line_split[0] not in attr_list:
                attr_list[line_split[0]] = {
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

            attr = attr_list[line_split[0]]

            attr['solr_collex'].extend(list(DataSource.objects.filter(
                version__in=DataVersion.objects.filter(active=True,data_type=DataVersion.FILE_DATA),
                source_type=DataSource.SOLR).values_list('name', flat=True)))
            attr['bq_tables'].extend(list(DataSource.objects.filter(
                version__in=DataVersion.objects.filter(active=True,data_type=DataVersion.FILE_DATA),
                source_type=DataSource.BIGQUERY).values_list('name', flat=True)))

        attr_file.close()

        add_attributes([attr_list[x] for x in attr_list])

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
