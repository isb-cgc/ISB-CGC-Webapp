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
from csv import reader as csv_reader
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
    "FLOAT64": "pfloat",
    "FLOAT": "pfloat",
    "NUMERIC": "pfloat",
    "INT64": "plong",
    "INTEGER": "plong",
    "DATE": "pdate",
    "DATETIME": "pdate"
}

SOLR_TYPE_EXCEPTION = {
    'SamplesPerPixel': 'string'
}

SOLR_SINGLE_VAL = {
    "case_barcode": ["case_barcode", "case_node_id"],
    "sample_barcode": ["case_barcode", "case_node_id", "sample_barcode", "sample_node_id"]
}

FIXED_TYPES = {

}

ATTR_SET = {}
DISPLAY_VALS = {}
ATTR_TIPS = {}

SOLR_URI = settings.SOLR_URI
SOLR_LOGIN = settings.SOLR_LOGIN
SOLR_PASSWORD = settings.SOLR_PASSWORD
SOLR_CERT = settings.SOLR_CERT

def new_attribute(name, displ_name, type, display_default, units=None, programs=None):
    return {
        'name': name,
        "display_name": displ_name,
        "type": type,
        'units': units,
        'data_sources': [],
        'data_set_types': [],
        'display': display_default,
        'categories': [],
        'programs': programs
    }


def load_attributes(ds_attr_files, program_attr_file_name):

    if not (ds_attr_files or program_attr_file_name):
        raise Exception("No attribute files provided! You must provide at least one type of attribute file!")

    program_attrs = {}
    if program_attr_file_name:
        progs_attr_file = open(program_attr_file_name, "r")
        for line in csv_reader(progs_attr_file):
            if not program_attrs.get(line[0],None):
                program_attrs[line[0]] = []
            program_attrs[line[0]].append(line[1])

    for ds in ds_attr_files:
        filename = ds_attr_files[ds]
        attr_file = open(filename, "r")
        for line in csv_reader(attr_file):
            if line[0] not in ATTR_SET:
                ATTR_SET[line[0]] = new_attribute(
                    line[0],
                    line[0].replace("_", " ").title() if (not line[1] or re.search(r'_', line[1])) else line[1],
                    line[2],
                    True if line[3] == 'True' else False,
                    programs=program_attrs.get(line[0],None)
                )
            attr = ATTR_SET[line[0]]

            attr['data_sources'].append(ds)

            if attr['name'] in DISPLAY_VALS:
                attr['display_vals'] = DISPLAY_VALS[attr['name']]

            if attr['name'] in ranges_needed:
                attr['range'] = ranges.get(ranges_needed[attr['name']], [])

        attr_file.close()


def add_attributes(attr_set):
    for attr_name, attr in attr_set.items():
        try:
            obj = Attribute.objects.get(name=attr['name'])
            logger.info("[STATUS] Attribute {} already found - skipping!".format(attr['name']))
        except ObjectDoesNotExist as e:
            logger.info("[STATUS] Attribute {} not found - creating!".format(attr['name']))
            obj, created = Attribute.objects.update_or_create(
                name=attr['name'], display_name=attr['display_name'], data_type=attr['type'],
                preformatted_values=True if 'preformatted_values' in attr else False,
                default_ui_display=attr['display'],
                units=attr.get('units',None)
            )
            if 'range' in attr:
                if len(attr.get('range', [])):
                    for attr_range in attr['range']:
                        Attribute_Ranges.objects.update_or_create(
                            **attr_range, attribute=obj
                        )
                else:
                    Attribute_Ranges.objects.update_or_create(
                        attribute=obj
                    )
            if len(attr.get('display_vals', {})):
                for rv, dv in attr['display_vals'].items():
                    Attribute_Display_Values.objects.update_or_create(
                        raw_value=rv, display_value=dv, attribute=obj
                    )

            if len(attr.get('data_sources', [])):
                attr_sources = obj.get_data_sources(all=True)
                missing_sources = [x for x in attr['data_sources'] if x not in attr_sources]
                if len(missing_sources):
                    sources = DataSource.objects.filter(name__in=missing_sources)
                    attr_to_src = []

                    for src in sources:
                        attr_to_src.append(Attribute.data_sources.through(datasource_id=src.id, attribute_id=obj.id))

                    Attribute.data_sources.through.objects.bulk_create(attr_to_src)

            if len(attr.get('programs', [])):
                programs = obj.get_programs()
                missing_progs = [x for x in attr['programs'] if x not in programs]
                if len(missing_progs):
                    progs = Program.objects.filter(name__in=missing_progs)
                    attr_to_prog = []

                    for prog in progs:
                        attr_to_prog.append(Attribute.programs.through(program_id=prog.id, attribute_id=obj.id))

                    Attribute.programs.through.objects.bulk_create(attr_to_prog)


        except Exception as e:
            logger.error("[ERROR] Attribute {} may not have been added!".format(attr['name']))
            logger.exception(e)



def make_solr_commands(sources):
    try:
        for src in sources:
            create_solr_params(src['schema_source'], src['name'], src['aggregated'])

    except Exception as e:
        logger.error("[ERROR] While making Solr params: ")
        logger.exception(e)


def inactivate_data_versions(dv_set):
    for dv in dv_set:
        try:
            dv_objs = DataVersion.objects.filter(version=dv['ver'], data_type__in=dv['type'])
            for dv_obj in dv_objs:
                dv_obj.active = False
                dv_obj.save()
        except ObjectDoesNotExist:
            logger.warning("[WARNING] Could not de-active version {}: it was not found!".format(dv))
        except Exception as e:
            logger.error("[ERROR] While deactivating version {} :".format(dv))
            logger.exceiption(e)


def add_data_versions(dv_set):
    for dv in dv_set:
        try:
            DataVersion.objects.get(name=dv['name'])
            logger.warning("[WARNING] Data Version {} already exists! Skipping.".format(dv['name']))
        except ObjectDoesNotExist:
            progs = Program.objects.filter(name__in=dv['programs'], active=True, is_public=True)
            obj, created = DataVersion.objects.update_or_create(name=dv['name'], data_type=dv['type'], version=dv['ver'], build=dv.get("build",None))
            dv_to_prog = []

            for prog in progs:
                dv_to_prog.append(DataVersion.programs.through(dataversion_id=obj.id, program_id=prog.id))

            DataVersion.programs.through.objects.bulk_create(dv_to_prog)

            logger.info("Data Version created: {}".format(obj))
        except Exception as e:
            logger.error("[ERROR] Data Version {} may not have been added!".format(dv['name']))
            logger.exception(e)


def create_solr_params(schema_src, solr_src, aggregated=False):
    solr_src = DataSource.objects.get(name=solr_src)
    schema_src = schema_src.split('.')
    schema = BigQuerySupport.get_table_schema(schema_src[0],schema_src[1],schema_src[2])
    solr_schema = []
    solr_index_strings = []
    SCHEMA_BASE = '{"add-field": %s}'
    CORE_CREATE_STRING = "sudo -u solr /opt/bitnami/solr/bin/solr create -c {solr_src}"
    SCHEMA_STRING = "curl -u {solr_user}:{solr_pwd} -X POST -H 'Content-type:application/json' --data-binary '{schema}' https://localhost:8983/solr/{solr_src}/schema --cacert solr-ssl.pem"
    INDEX_STRING = "curl -u {solr_user}:{solr_pwd} -X POST 'https://localhost:8983/solr/{solr_src}/update?commit=yes{params}' --data-binary @{file_name}.csv -H 'Content-type:application/csv' --cacert solr-ssl.pem"
    for field in schema:
        if not re.search(r'has_',field['name']):
            field_schema = {
                "name": field['name'],
                "type": SOLR_TYPES[field['type']] if field['name'] not in SOLR_TYPE_EXCEPTION else SOLR_TYPE_EXCEPTION[field['name']],
                "multiValued": False if not aggregated else False if field['name'] in SOLR_SINGLE_VAL.get(solr_src.aggregate_level, {}) else True,
                "stored": True
            }
            solr_schema.append(field_schema)
            if field_schema['multiValued']:
                solr_index_strings.append("f.{}.split=true&f.{}.separator=|".format(field['name'],field['name']))

    with open("{}_solr_cmds.txt".format(solr_src.name), "w") as cmd_outfile:
        schema_array = SCHEMA_BASE % solr_schema
        params = "{}{}".format("&" if len(solr_index_strings) else "", "&".join(solr_index_strings))
        cmd_outfile.write(CORE_CREATE_STRING.format(solr_src=solr_src.name))
        cmd_outfile.write("\n\n")
        cmd_outfile.write(SCHEMA_STRING.format(
            solr_user=SOLR_LOGIN,
            solr_pwd=SOLR_PASSWORD,
            solr_src=solr_src.name,
            schema=schema_array
        ))
        cmd_outfile.write("\n\n")
        cmd_outfile.write(INDEX_STRING.format(
            solr_user=SOLR_LOGIN,
            solr_pwd=SOLR_PASSWORD,
            solr_src=solr_src.name,
            params=params,
            file_name=solr_src.name
        ))

    cmd_outfile.close()


def add_data_sources(sources, build_attrs=True, link_attr=True):
    try:
        attrs_to_srcs = []
        for src in sources:
            try:
                obj = DataSource.objects.get(name=src['name'])
                logger.warning("[WARNING] Source with the name {} already exists - updating ONLY!".format(src['name']))
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

                logger.info("Data Source created: {}".format(src['name']))

            source_attrs = list(obj.get_source_attr(all=True).values_list('name',flat=True))
            schema_src = src['schema_source'].split('.') if src['source_type'] == DataSource.SOLR else src['name'].split('.')
            schema = BigQuerySupport.get_table_schema(schema_src[0],schema_src[1],schema_src[2])
            link_attrs = []
            for field in schema:
                if build_attrs:
                    if field['name'] not in ATTR_SET:
                        attr_type = FIXED_TYPES.get(field['name'], Attribute.CATEGORICAL if (not re.search(r'(_id|_barcode|UID|uuid)', field['name']) and field['type'] == "STRING") else Attribute.STRING if field['type'] == "STRING" else Attribute.CONTINUOUS_NUMERIC)
                        ATTR_SET[field['name']] = {
                            'name': field['name'],
                            "display_name": field['name'].replace("_", " ").title() if re.search(r'_', field['name']) else
                            field['name'],
                            "type": attr_type,
                            'data_sources': [],
                            'display': (
                                    (attr_type == Attribute.STRING and not re.search('_id|_barcode|UID',field['name'].lower())) or attr_type == Attribute.CATEGORICAL or field['name'].lower() in ranges_needed)
                        }
                    attr = ATTR_SET[field['name']]
                    attr['data_sources'].append(src['name'])

                    if attr['name'] in DISPLAY_VALS:
                        if 'display_vals' not in attr:
                            attr['display_vals'] = {}
                        attr['display_vals'].update(DISPLAY_VALS[attr['name']])


                    if 'range' not in attr:
                        if attr['name'].lower() in ranges_needed:
                            attr['range'] = ranges.get(ranges_needed.get(attr['name'], ''), [])
                elif link_attr and field['name'] not in source_attrs:
                    link_attrs.append(field['name'])

            if build_attrs:
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

            (src['source_type'] == DataSource.SOLR) and create_solr_params(src['schema_source'], src['name'])

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


def copy_attrs(from_data_sources, to_data_sources, excludes):
    to_sources = DataSource.objects.filter(name__in=to_data_sources)
    from_sources = DataSource.objects.filter(name__in=from_data_sources)
    to_sources_attrs = to_sources.get_source_attrs()
    bulk_add = []

    for fds in from_sources:
        from_source_attrs = fds.attribute_set.exclude(id__in=to_sources_attrs['ids'] or []).exclude(name__in=excludes)
        logger.info("Copying {} attributes from {} to: {}.".format(
            len(from_source_attrs.values_list('name', flat=True)),
            fds.name, "; ".join(to_data_sources)
        ))

        for attr in from_source_attrs:
            for ds in to_sources:
                bulk_add.append(Attribute.data_sources.through(attribute_id=attr.id, datasource_id=ds.id))

    if len(bulk_add):
        try:
            Attribute.data_sources.through.objects.bulk_create(bulk_add)
        except Exception as e:
            logger.error("[ERROR] While trying to copy attributes from {} to {}:".format(fds.name, "; ".join(to_data_sources)))
            logger.error("Attributes: {}".format(",".join(from_source_attrs.values_list('name',flat=True))))
            logger.exception(e)


def add_programs(progs):
    node_progs = []
    for prog in progs:
        nodes = []
        try:
            Program.objects.get(name=prog['name'], active=True, is_public=True)
            logger.info("[STATUS] Program {} found - updating only!".format(prog))
        except ObjectDoesNotExist:
            logger.info("[STATUS] Program {} not found - creating.".format(prog))

        if 'nodes' in prog:
            nodes = prog['nodes']
            del prog['nodes']

        obj = Program.objects.update_or_create(active=True, **prog)
        if len(nodes):
            node_progs = []
            for node in DataNode.object.filter(name__in=nodes):
                node_progs.append(DataNode.programs.through(datanode_id=node.id, program_id=obj.id))

    len(node_progs) and DataNode.programs.through.objects.bulk_create(node_progs)

def main(config, make_attr=False):

    try:
        if 'data_nodes' in config:
            for node in config['data_nodes']:
                try:
                    DataNode.objects.get(short_name=node['short_name'])
                    logger.info("[STATUS] Data Node {} found - updating only!".format(node))
                except ObjectDoesNotExist:
                    logger.info("[STATUS] Data Node {} not found - creating.".format(node))
                DataNode.objects.update_or_create(active=True, **node)

        if 'programs' in config:
            add_programs(config['programs'])

        if 'projects' in config:
            projects = []
            if config['projects'].get("from_file", None):
                proj_file = open(config['projects'].get("from_file"), "r")
                for line in csv_reader(proj_file):
                    proj = {
                        "name": line[0],
                        "program": line[2]
                    }
                    if len(line[1]):
                        proj['description'] = line[1]
                    projects.append(proj)
            else:
                projects = config['projects']
            for proj in projects:
                progs = {x.name: x for x in Program.objects.filter(active=True)}
                proj['program'] = progs[proj['program']]
                try:
                    Project.objects.get(name=proj['name'], active=True)
                    logger.info("[STATUS] Project {} found - updating!".format(proj['name']))
                except ObjectDoesNotExist:
                    logger.info("[STATUS] Project {} not found - creating.".format(proj['name']))
                Project.objects.update_or_create(**proj)

        if 'versions' in config:
            if 'create' in config['versions']:
                add_data_versions(config['versions']['create'])
            if 'deprecate' in config['versions']:
                inactivate_data_versions(config['versions']['deprecate'])

        # Preload all display value information, as we'll want to load it into the attributes while we build that set
        if 'display_values' in config and exists(join(dirname(__file__), config['display_values'])):
            displ_vals_file = open(join(dirname(__file__), config['display_values']), "r")

            for line in csv_reader(displ_vals_file):
                if line[2] not in DISPLAY_VALS:
                    DISPLAY_VALS[line[2]] = {}
                DISPLAY_VALS[line[2]][line[0]]=line[1]
            displ_vals_file.close()
        else:
            print("[STATUS] Display values file not listed - skipping!")

        # Preload all tooltip information, as we'll want to load it into the attributes while we build that set
        if 'tooltips' in config and exists(join(dirname(__file__), config['attr_tooltips'])):
            attr_tips_file = open(join(dirname(__file__), config['attr_tooltips']), "r")

            for line in csv_reader(attr_tips_file):
                if line[2] not in ATTR_TIPS:
                    ATTR_TIPS[line[2]] = {}
                ATTR_TIPS[line[2]][line[0]]=line[1]
            attr_tips_file.close()

        if 'data_sources' in config:
            add_data_sources(config['data_sources'],build_attrs=('attributes' not in config))

        if 'attributes' in config:
            ds_attr_files = {x['name']: x['attributes'] for x in config['data_sources'] if 'attributes' in x}
            load_attributes(ds_attr_files, config['attributes'].get('program_file',None))

        # Add any attributes found to be new in the prior step to the database, including linkage to the new data sources
        len(ATTR_SET.keys()) and add_attributes(ATTR_SET)

        if 'attr_copy' in config:
            for each in config['attr_copy']:
                copy_attrs(each['src'],each['dest'], config.get("attr_exclude", []))

        len(ATTR_SET) and make_attr and add_attributes([ATTR_SET[x] for x in ATTR_SET])

    except Exception as e:
        logger.exception(e)


if __name__ == "__main__":
    try:
        cmd_line_parser = ArgumentParser(description="Metadata ETL for ISB-CGC Cloud Resource")
        cmd_line_parser.add_argument('-s', '--solr-only', type=str, default='False', help="Use JSON settings file to parse our Solr indexing commands (exclusive of other ETL ops.)")
        cmd_line_parser.add_argument('-j', '--json-config-file', type=str, default='', help="JSON settings file")
        cmd_line_parser.add_argument('-a', '--parse_attributes', type=str, default='False', help="Attempt to create/update attributes")

        args = cmd_line_parser.parse_args()

        if not len(args.json_config_file):
            logger.error("[ERROR] You must supply a JSON settings file!")
            cmd_line_parser.print_help()
            exit(1)

        if not exists(join(dirname(__file__),args.json_config_file)):
            logger.error("[ERROR] JSON config file {} not found.".format(args.json_config_file))
            exit(1)

        f = open(join(dirname(__file__),args.json_config_file), "r")
        settings = json.load(f)

        if args.solr_only in ["True", "T", "t", "true"]:
            make_solr_commands(settings['data_sources'])
        else:
            main(settings, (args.parse_attributes in ["True", "T", "t", "true"]))

    except Exception as e:
        logger.error("[ERROR] While processing ETL command line and running operations:")
        logger.exception(e)
        exit(1)
