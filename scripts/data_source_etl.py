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
import logging
import json
import traceback
import os
import re
from os.path import join, dirname, exists
from argparse import ArgumentParser
from django.core.exceptions import ObjectDoesNotExist

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "isb_cgc.settings")

from isb_cgc import secret_settings, settings

import django
django.setup()

from google_helpers.bigquery.bq_support import BigQuerySupport
from projects.models import Program, Project, Attribute, Attribute_Ranges, Attribute_Display_Values, DataSource, DataVersion
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
    'year_of_initial_pathologic_diagnosis': 'year',
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

SOLR_TYPES = {
    'STRING': "string",
    "FLOAT": "pfloat",
    "INTEGER": "plong",
    "DATE": "pdate"
}

def add_data_versions(dv_set):
    for dv in dv_set:
        try:
            dv_obj = DataVersion.objects.get(name=dv['name'])
            logger.warning("[WARNING] Data Version {} already exists! Skipping.".format(dv['name']))
        except ObjectDoesNotExist:
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


def add_solr_collex(solr_set, version, version_type, programs):
    for collex in solr_set:
        try:
            collex_obj = DataSource.objects.get(name=collex, source_type=DataSource.SOLR)
            logger.warning("[WARINING] Solr Core with the name {} already exists - skipping.".format(collex))
        except ObjectDoesNotExist:
            obj, created = DataSource.objects.update_or_create(
                name=collex,
                version=DataVersion.objects.get(version=version, data_type=version_type),
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

def add_bq_tables(tables, version, version_type, programs):
    for table in tables:
        try:
            table_obj = DataSource.objects.get(name=table)
            logger.warning("[WARNING] BigQuery Data Source with the name {} already exists - skipping.".format(table))
        except ObjectDoesNotExist as e:
            obj, created = DataSource.objects.update_or_create(
                name=table, version=DataVersion.objects.get(version=version, data_type=version_type),
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

    try:
        for attr in attr_set:
            try:
                obj = Attribute.objects.get(name=attr['name'], data_type=attr['type'])
            except ObjectDoesNotExist:
                obj, created = Attribute.objects.update_or_create(
                    name=attr['name'], display_name=attr['display_name'], data_type=attr['type'],
                    preformatted_values=True if 'preformatted_values' in attr else False,
                    is_cross_collex=True if 'cross_collex' in attr else False,
                    default_ui_display=attr['display']
                )

            if 'range' in attr and not len(Attribute_Ranges.objects.select_related('attribute').filter(attribute=obj)):
                if len(attr['range']):
                    for attr_range in attr['range']:
                        Attribute_Ranges.objects.update_or_create(
                            attribute=obj, **attr_range
                        )
                else:
                    Attribute_Ranges.objects.update_or_create(
                        attribute=obj
                    )

            if 'display_vals' in attr and not len(Attribute_Display_Values.objects.select_related('attribute').filter(attribute=obj)):
                for dv in attr['display_vals']:
                    Attribute_Display_Values.objects.update_or_create(
                        raw_value=dv['raw_value'], display_value=dv['display_value'], attribute=obj
                    )

            if 'solr_collex' in attr:
                attr_sources = obj.get_data_sources(DataSource.SOLR)
                missing_sources = [x for x in attr['solr_collex'] if x not in attr_sources]
                if len(missing_sources):
                    sources = DataSource.objects.filter(name__in=attr['solr_collex'])
                    attr_to_src = []

                    for src in sources:
                        attr_to_src.append(Attribute.data_sources.through(datasource_id=src.id, attribute_id=obj.id))

                    Attribute.data_sources.through.objects.bulk_create(attr_to_src)

            if 'bq_tables' in attr:
                attr_sources = obj.get_data_sources(DataSource.BIGQUERY)
                missing_sources = [x for x in attr['bq_tables'] if x not in attr_sources]
                if len(missing_sources):
                    sources = DataSource.objects.filter(name__in=attr['bq_tables'])
                    attr_to_src = []

                    for src in sources:
                        attr_to_src.append(Attribute.data_sources.through(datasource_id=src.id, attribute_id=obj.id))

                    Attribute.data_sources.through.objects.bulk_create(attr_to_src)

    except Exception as e:
        logger.error("[ERROR] Attribute {} may not have been added!".format(attr['name']))
        logger.exception(e)

def main(config):

    try:

        if 'programs' in config:
            for prog in config['programs']:
                try:
                    obj = Program.objects.get(name=prog['name'], owner=isb_superuser, active=True, is_public=True)
                    logger.info("[STATUS] Program {} found - skipping creation.".format(prog))
                except ObjectDoesNotExist:
                    logger.info("[STATUS] Program {} not found - creating.".format(prog))
                    obj = Program.objects.update_or_create(name=prog['name'], owner=isb_superuser, active=True, is_public=True)

        if 'projects' in config:
            for proj in config['projects']:
                program = Program.objects.get(name=proj['program'], owner=isb_superuser, active=True, is_public=True)
                try:
                    obj = Project.objects.get(name=proj['name'], owner=isb_superuser, active=True, is_public=True, program=program)
                    logger.info("[STATUS] Project {} found - skipping.".format(proj['name']))
                except ObjectDoesNotExist:
                    logger.info("[STATUS] Project {} not found - creating.".format(proj['name']))
                    obj = Project.objects.update_or_create(name=proj['name'], owner=isb_superuser, active=True, is_public=True, program=program)

        if 'versions' in config:
            add_data_versions(config['versions'])

        display_vals = {}
        attr_set = {}
        solr_schema = {}

        # Preload all display value information, as we'll want to load it into the attributes while we build that set
        if exists(join(dirname(__file__), "display_vals.csv")):
            attr_vals_file = open(join(dirname(__file__), "display_vals.csv"), "r")
            line_reader = attr_vals_file.readlines()

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

        for table in config['bq_tables']:
            table_name = table['name'].split(".")
            solr_name = table.get('solr_name',table_name[-1])
            add_bq_tables([table['name']], table['version'], table['version_type'], table['programs'])
            add_solr_collex(solr_name, table['version'], table['version_type'], table['programs'])

            schema = BigQuerySupport.get_table_schema(table_name[0], table_name[1], table_name[2])

            solr_schema[solr_name] = []

            for field in schema:
                if field['name'] not in attr_set:
                    attr_type = Attribute.CATEGORICAL if (not re.search(r'(_id|_barcode)', field['name']) and field['type'] == "STRING") else Attribute.STRING if field['type'] == "STRING" else Attribute.CONTINUOUS_NUMERIC
                    attr_set[field['name']] = {
                        'name': field['name'],
                        "display_name": field['name'].replace("_", " ").title() if re.search(r'_', field['name']) else
                        field['name'],
                        "type": attr_type,
                        'solr_collex': [],
                        'bq_tables': [],
                        'display': (
                            (attr_type == Attribute.STRING and not re.search('_id|_barcode',field['name'].lower())) or attr_type == Attribute.CATEGORICAL or field['name'].lower() in ranges_needed)
                    }
                attr = attr_set[field['name']]
                attr['bq_tables'].append(table['name'])
                attr['solr_collex'].append(solr_name)

                if attr['name'] in display_vals:
                    if 'preformatted_values' in display_vals[attr['name']]:
                        attr['preformatted_values'] = True
                    else:
                        if 'display_vals' not in attr:
                            attr['display_vals'] = []
                        attr['display_vals'].extend(display_vals[attr['name']]['vals'])

                if attr['name'] in display_vals:
                    if 'preformatted_values' in display_vals[attr['name']]:
                        attr['preformatted_values'] = True
                    else:
                        attr['display_vals'] = display_vals[attr['name']]['vals']

                if 'range' not in attr:
                    if attr['name'].lower() in ranges_needed:
                        attr['range'] = ranges.get(ranges_needed.get(attr['name'], ''), [])

                solr_schema[table_name[2]].append({
                    "name": field['name'], "type": SOLR_TYPES[field['type']], "multiValued": False, "stored": True
                })

            with open("solr_schemas.json", "w") as schema_outfile:
                json.dump(solr_schema, schema_outfile)

            schema_outfile.close()

            # add core to Solr
            # add schema to core
            # query-to-file the table
            # pull file to local
            # POST to Solr core


        add_attributes([attr_set[x] for x in attr_set])

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    cmd_line_parser = ArgumentParser(description="Extract a data source from BigQuery and ETL it into Solr")
    cmd_line_parser.add_argument('-j', '--json-config-file', type=str, default='', help="JSON settings file")

    args = cmd_line_parser.parse_args()

    if not len(args.json_config_file):
        print("[ERROR] You must supply a JSON settings file!")
        cmd_line_parser.print_help()
        exit(1)

    if not exists(join(dirname(__file__),args.json_config_file)):
        print("[ERROR] JSON config file {} not found.".format(args.json_config_file))
        exit(1)

    f = open(join(dirname(__file__),args.json_config_file), "r")
    settings = json.load(f)

    main(settings)
