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
import requests
import os
import re
from os.path import join, dirname, exists
from argparse import ArgumentParser
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "isb_cgc.settings")

from isb_cgc import secret_settings, settings

import django
django.setup()

from google_helpers.bigquery.bq_support import BigQuerySupport
from projects.models import Program, Project, Attribute, Attribute_Ranges, Attribute_Display_Values, DataSource, DataVersion, DataNode
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
    'age_at_diagnosis': None,
    'age_at_index': None
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

SOLR_SINGLE_VAL = ["case_barcode", "case_gdc_id", "case_pdc_id","program_name","project_short_name"]

ATTR_SET = {}
DISPLAY_VALS = {}

SOLR_URI = settings.SOLR_URI
SOLR_LOGIN = settings.SOLR_LOGIN
SOLR_PASSWORD = settings.SOLR_PASSWORD
SOLR_CERT = settings.SOLR_CERT


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

            logger.info("Data Version created: {}".format(obj))
        except Exception as e:
            logger.error("[ERROR] Data Version {} may not have been added!".format(dv['name']))
            logger.exception(e)


def add_data_sources(sources, build_attrs=True, link_attr=True):
    try:
        attrs_to_srcs = []
        for src in sources:
            try:
                obj = DataSource.objects.get(name=src['name'])
                logger.warning("[WARNING] Source with the name {} already exists - updating ONLY.".format(src['name']))
            except ObjectDoesNotExist as e:
                obj, created = DataSource.objects.update_or_create(
                    name=src['name'], version=DataVersion.objects.get(version=src['version'], data_type=src['version_type']),
                    source_type=src['source_type'],
                )

                progs = Program.objects.filter(name__in=src['programs'])
                src_to_prog = []

                for prog in progs:
                    src_to_prog.append(DataSource.programs.through(datasource_id=obj.id, program_id=prog.id))

                DataSource.programs.through.objects.bulk_create(src_to_prog)

                nodes = DataNode.objects.filter(short_name__in=src['nodes'])
                node_to_src = []

                for node in nodes:
                    node_to_src.append(DataNode.data_sources.through(datasource_id=obj.id, datanode_id=node.id))

                DataNode.data_sources.through.objects.bulk_create(node_to_src)

                logger.info("Data Source created: {}".format(obj.name))

            source_attrs = list(obj.get_source_attr(all=True).values_list('name',flat=True))
            if src['source_type'] == DataSource.SOLR:
                schema_src = src['schema_source'].split('.')
                schema = BigQuerySupport.get_table_schema(schema_src[0],schema_src[1],schema_src[2])
                link_attrs = []
                solr_schema = []
                solr_index_strings = []
                for field in schema:
                    if build_attrs:
                        if field['name'] not in ATTR_SET:
                            attr_type = Attribute.CATEGORICAL if (not re.search(r'(_id|_barcode)', field['name']) and field['type'] == "STRING") else Attribute.STRING if field['type'] == "STRING" else Attribute.CONTINUOUS_NUMERIC
                            ATTR_SET[field['name']] = {
                                'name': field['name'],
                                "display_name": field['name'].replace("_", " ").title() if re.search(r'_', field['name']) else
                                field['name'],
                                "type": attr_type,
                                'solr_collex': [],
                                'bq_tables': [],
                                'display': (
                                        (attr_type == Attribute.STRING and not re.search('_id|_barcode',field['name'].lower())) or attr_type == Attribute.CATEGORICAL or field['name'].lower() in ranges_needed)
                            }
                        attr = ATTR_SET[field['name']]
                        attr['solr_collex'].append(src['name'])

                        if attr['name'] in DISPLAY_VALS:
                            if 'preformatted_values' in DISPLAY_VALS[attr['name']]:
                                attr['preformatted_values'] = True
                            else:
                                if 'display_vals' not in attr:
                                    attr['display_vals'] = []
                                attr['display_vals'].extend(DISPLAY_VALS[attr['name']]['vals'])

                        if attr['name'] in DISPLAY_VALS:
                            if 'preformatted_values' in DISPLAY_VALS[attr['name']]:
                                attr['preformatted_values'] = True
                            else:
                                attr['display_vals'] = DISPLAY_VALS[attr['name']]['vals']

                        if 'range' not in attr:
                            if attr['name'].lower() in ranges_needed:
                                attr['range'] = ranges.get(ranges_needed.get(attr['name'], ''), [])
                    elif link_attr and field['name'] not in source_attrs:
                        link_attrs.append(field['name'])

                    solr_schema.append({
                        "name": field['name'], "type": SOLR_TYPES[field['type']],
                        "multiValued": True if src['aggregated'] and field['name'] not in SOLR_SINGLE_VAL else False, "stored": True
                    })

                    if src['aggregated'] and field['name'] not in SOLR_SINGLE_VAL:
                        solr_index_strings.append("f.{}.split=true&f.{}.separator=|".format(field['name'],field['name']))

                for la in link_attrs:
                    try:
                        a = Attribute.objects.get(name=la)
                        attrs_to_srcs.append(Attribute.data_sources.through(attribute_id=a.id,datasource_id=obj.id))
                    except Exception as e:
                        if isinstance(e,MultipleObjectsReturned):
                            logger.info("More than one attribute with the name {} was found!".format(la))
                            a = Attribute.objects.filter(name=la).first()
                            attrs_to_srcs.append(Attribute.data_sources.through(attribute_id=a.id,datasource_id=obj.id))
                        elif isinstance(e,ObjectDoesNotExist):
                            logger.info("Attribute {} doesn't exist--can't add, skipping!".format(la))

                with open("{}_solr_schemas.json".format(src['name']), "w") as schema_outfile:
                    json.dump(solr_schema, schema_outfile)
                schema_outfile.close()
                with open("{}_solr_index_vars.txt".format(src['name']), "w") as solr_index_string:
                    solr_index_string.write("&{}".format("&".join(solr_index_strings)))
                solr_index_string.close()


            #     # add core to Solr
            #     # sudo -u solr /opt/bitnami/solr/bin/solr create -c <solr_name>  -s 2 -rf 2
            #     core_uri = "{}/solr/admin/cores?action=CREATE&name={}".format(settings.SOLR_URI,solr_name)
            #     core_create = requests.post(core_uri, auth=(SOLR_LOGIN, SOLR_PASSWORD), verify=SOLR_CERT)
            #
            #     # add schema to core
            #     schema_uri = "{}/solr/{}/schema".format(settings.SOLR_URI,solr_name)
            #     schema_load = requests.post(schema_uri, data=json.dumps({"add-field": solr_schema[src['name']]}),
            #       headers={'Content-type': 'application/json'}, auth=(SOLR_LOGIN, SOLR_PASSWORD), verify=SOLR_CERT)
            #
            #     # query-to-file the table
            #     # OR
            #     # export from BQ console into GCS
            #
            #     # pull file to local
            #     # gsutil cp gs://<BUCKET>/<CSV export> ./
            #
            #     # POST to Solr core
            #     index_uri = "{}/solr/{}/update?commit=yes{}".format(settings.SOLR_URI,solr_name,"&".join(solr_index_vars))
            #     index_load = requests.post(index_uri, files={'file': open('export.csv', 'rb')},
            #       headers={'Content-type': 'application/csv'}, auth=(SOLR_LOGIN, SOLR_PASSWORD), verify=SOLR_CERT)

        Attribute.data_sources.through.objects.bulk_create(attrs_to_srcs)
    except Exception as e:
        logger.error("[ERROR] Data Source {} may not have been added!".format(obj.name))
        logger.exception(e)


def add_attributes(attr_set):

    try:
        for attr in attr_set:
            try:
                obj = Attribute.objects.get(name=attr['name'], data_type=attr['type'])
                logger.info("Attribute {} already located in the database - just updating...".format(attr['name']))
            except ObjectDoesNotExist:
                logger.info("Attribute {} not found - creating".format(attr['name']))
                obj, created = Attribute.objects.update_or_create(
                    name=attr['name'], display_name=attr['display_name'], data_type=attr['type'],
                    preformatted_values=True if 'preformatted_values' in attr else False,
                    is_cross_collex=True if 'cross_collex' in attr else False,
                    default_ui_display=attr['display']
                )
            except Exception as e:
                if isinstance(e,MultipleObjectsReturned):
                    logger.info("More than one attribute with the name {} was found!".format(attr['name']))
                    obj = Attribute.objects.filter(name=attr['name'], data_type=attr['type']).first()

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
                attr_sources = obj.get_data_sources(DataSource.SOLR, all=True)
                missing_sources = [x for x in attr['solr_collex'] if x not in attr_sources]
                if len(missing_sources):
                    sources = DataSource.objects.filter(name__in=missing_sources)
                    attr_to_src = []

                    for src in sources:
                        attr_to_src.append(Attribute.data_sources.through(datasource_id=src.id, attribute_id=obj.id))

                    Attribute.data_sources.through.objects.bulk_create(attr_to_src)

            if 'bq_tables' in attr:
                attr_sources = obj.get_data_sources(DataSource.BIGQUERY, all=True)
                missing_sources = [x for x in attr['bq_tables'] if x not in attr_sources]
                if len(missing_sources):
                    sources = DataSource.objects.filter(name__in=missing_sources)
                    attr_to_src = []

                    for src in sources:
                        attr_to_src.append(Attribute.data_sources.through(datasource_id=src.id, attribute_id=obj.id))

                    Attribute.data_sources.through.objects.bulk_create(attr_to_src)

    except Exception as e:
        logger.error("[ERROR] Attribute {} may not have been added!".format(attr['name']))
        logger.exception(e)


def copy_attrs(from_data_sources, to_data_sources):
    to_sources = DataSource.objects.filter(name__in=to_data_sources)
    from_sources = DataSource.objects.filter(name__in=from_data_sources)
    to_sources_attrs = to_sources.get_source_attrs()
    bulk_add = []

    for fds in from_sources:
        if to_sources_attrs['ids']:
            from_source_attrs = fds.attribute_set.exclude(id__in=to_sources_attrs['ids'])
        else:
            from_source_attrs = fds.attribute_set.all()
        logger.info("Copying {} attributes from {} to: {}.".format(
            len(from_source_attrs.values_list('name',flat=True)),
            fds.name, "; ".join(to_data_sources),

        ))

        for attr in from_source_attrs:
            for ds in to_sources:
                bulk_add.append(Attribute.data_sources.through(attribute_id=attr.id, datasource_id=ds.id))

    Attribute.data_sources.through.objects.bulk_create(bulk_add)


def main(config, make_attr=False):

    try:
        if 'programs' in config:
            for prog in config['programs']:
                try:
                    obj = Program.objects.get(name=prog['name'], owner=isb_superuser, active=True, is_public=True)
                    logger.info("[STATUS] Program {} found - skipping creation.".format(prog))
                except ObjectDoesNotExist:
                    logger.info("[STATUS] Program {} not found - creating.".format(prog))
                    obj = Program.objects.update_or_create(owner=isb_superuser, active=True, is_public=True, **prog)

        if 'projects' in config:
            for proj in config['projects']:
                program = Program.objects.get(name=proj['program'], owner=isb_superuser, active=True)
                try:
                    obj = Project.objects.get(name=proj['name'], owner=isb_superuser, active=True, program=program)
                    logger.info("[STATUS] Project {} found - skipping.".format(proj['name']))
                except ObjectDoesNotExist:
                    logger.info("[STATUS] Project {} not found - creating.".format(proj['name']))
                    obj = Project.objects.update_or_create(name=proj['name'], owner=isb_superuser, active=True, program=program)

        if 'versions' in config:
            add_data_versions(config['versions'])

        # Preload all display value information, as we'll want to load it into the attributes while we build that set
        if 'display_values' in config and exists(join(dirname(__file__), config['display_values'])):
            attr_vals_file = open(join(dirname(__file__), config['display_values']), "r")
            line_reader = attr_vals_file.readlines()

            for line in line_reader:
                line = line.strip()
                line_split = line.split(",")
                if line_split[0] not in DISPLAY_VALS:
                    DISPLAY_VALS[line_split[0]] = {}
                    if line_split[1] == 'NULL':
                        DISPLAY_VALS[line_split[0]]['preformatted_values'] = True
                    else:
                        DISPLAY_VALS[line_split[0]]['vals'] = [{'raw_value': line_split[1], 'display_value': line_split[2]}]
                else:
                    DISPLAY_VALS[line_split[0]]['vals'].append({'raw_value': line_split[1], 'display_value': line_split[2]})

            attr_vals_file.close()

        if 'data_sources' in config:
            add_data_sources(config['data_sources'])

        if 'attr_copy' in config:
            for each in config['attr_copy']:
                copy_attrs(each['src'],each['dest'])

        len(ATTR_SET) and make_attr and add_attributes([ATTR_SET[x] for x in ATTR_SET])

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    cmd_line_parser = ArgumentParser(description="Extract a data source from BigQuery and ETL it into Solr")
    cmd_line_parser.add_argument('-j', '--json-config-file', type=str, default='', help="JSON settings file")
    cmd_line_parser.add_argument('-a', '--parse_attributes', type=str, default='False', help="Attempt to create/update attributes from the sources")

    args = cmd_line_parser.parse_args()

    if not len(args.json_config_file):
        logger.info("[ERROR] You must supply a JSON settings file!")
        cmd_line_parser.print_help()
        exit(1)

    if not exists(join(dirname(__file__),args.json_config_file)):
        logger.info("[ERROR] JSON config file {} not found.".format(args.json_config_file))
        exit(1)

    f = open(join(dirname(__file__),args.json_config_file), "r")
    settings = json.load(f)

    main(settings, (args.parse_attributes == 'True'))
