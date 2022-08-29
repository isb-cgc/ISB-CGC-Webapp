###
# Copyright 2015-2021, Institute for Systems Biology
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
import os
from os.path import join, dirname, exists
import re
import json
from csv import reader as csv_reader
import csv
from argparse import ArgumentParser
import sys
import time
from copy import deepcopy
from itertools import combinations, product
from django.core.exceptions import ObjectDoesNotExist

from idc import secret_settings, settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "idc.settings")

import django
django.setup()

from idc_collections.models import Program, Collection, Attribute, Attribute_Ranges, \
    Attribute_Display_Values, DataSource, DataSourceJoin, DataVersion, DataSetType, \
    Attribute_Set_Type, Attribute_Display_Category, ImagingDataCommonsVersion, Attribute_Tooltips
from google_helpers.bigquery.bq_support import BigQuerySupport

from django.contrib.auth.models import User
idc_superuser = User.objects.get(username="idc")

logger = logging.getLogger('main_logger')

ATTR_SET = {}
DISPLAY_VALS = {}
SEPERATOR = "[]"

COLLECTION_HEADER_CHK = "collection_uuid"

FIELD_MAP = {x: i for i, x in enumerate(['collection_id','collection_uuid','name','collections','image_types','supporting_data',
                            'subject_count','doi','source_url','cancer_type','species','location','analysis_artifacts',
                            'description','collection_type','program','access','date_updated','tcia_wiki_collection_id',
                            'active'])}

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
    'SUVbw': 'SUVbw',
    'Volume': 'Volume',
    'Diameter': 'Diameter',
    'Surface_area_of_mesh': 'Surface_area_of_mesh',
    'Total_Lesion_Glycolysis': 'Total_Lesion_Glycolysis',
    'Standardized_Added_Metabolic_Activity': 'Standardized_Added_Metabolic_Activity',
    'Percent_Within_First_Quarter_of_Intensity_Range': 'Percent_Within_First_Quarter_of_Intensity_Range',
    'Percent_Within_Third_Quarter_of_Intensity_Range': 'Percent_Within_Third_Quarter_of_Intensity_Range',
    'Percent_Within_Fourth_Quarter_of_Intensity_Range': 'Percent_Within_Fourth_Quarter_of_Intensity_Range',
    'Percent_Within_Second_Quarter_of_Intensity_Range': 'Percent_Within_Second_Quarter_of_Intensity_Range',
    'Standardized_Added_Metabolic_Activity_Background': 'Standardized_Added_Metabolic_Activity_Background',
    'Glycolysis_Within_First_Quarter_of_Intensity_Range': 'Glycolysis_Within_First_Quarter_of_Intensity_Range',
    'Glycolysis_Within_Third_Quarter_of_Intensity_Range': 'Glycolysis_Within_Third_Quarter_of_Intensity_Range',
    'Glycolysis_Within_Fourth_Quarter_of_Intensity_Range': 'Glycolysis_Within_Fourth_Quarter_of_Intensity_Range',
    'Glycolysis_Within_Second_Quarter_of_Intensity_Range': 'Glycolysis_Within_Second_Quarter_of_Intensity_Range'
}

ranges = {
    'by_200': [{'first': "200", "last": "1400", "gap": "200", "include_lower": True, "unbounded": True,
                "include_upper": True, 'type': 'F', 'unit': '0.01'}],
    'by_negative_3k': [{'first': "-15000", "last": "-5000", "gap": "3000", "include_lower": True, "unbounded": True,
                        "include_upper": False, 'type': 'I'}],
    'by_500': [{'first': "500", "last": "6000", "gap": "500", "include_lower": False, "unbounded": True,
                "include_upper": True, 'type': 'I'}],
    'year': [{'first': "1976", "last": "2015", "gap": "5", "include_lower": True, "unbounded": False,
              "include_upper": False, 'type': 'I'}],
    'SUVbw': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '3', 'last': '12', 'gap': '1'}],
    'Volume': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '10', 'last': '28000', 'gap': '2800'}],
    'Diameter': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '6', 'last': '55', 'gap': '6'}],
    'Surface_area_of_mesh': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '150', 'last': '4500', 'gap': '435'}],
    'Total_Lesion_Glycolysis': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '78', 'last': '698', 'gap': '78'}],
    'Standardized_Added_Metabolic_Activity': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '56', 'last': '502', 'gap': '56'}],
    'Percent_Within_First_Quarter_of_Intensity_Range': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '10', 'last': '90', 'gap': '10'}],
    'Percent_Within_Third_Quarter_of_Intensity_Range': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '10', 'last': '90', 'gap': '10'}],
    'Percent_Within_Fourth_Quarter_of_Intensity_Range': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '10', 'last': '90', 'gap': '10'}],
    'Percent_Within_Second_Quarter_of_Intensity_Range': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '10', 'last': '90', 'gap': '10'}],
    'Standardized_Added_Metabolic_Activity_Background': [{'type': 'F', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '0.5', 'last': '5', 'gap': '0.5'}],
    'Glycolysis_Within_First_Quarter_of_Intensity_Range': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '28', 'last': '251', 'gap': '28'}],
    'Glycolysis_Within_Third_Quarter_of_Intensity_Range': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '25', 'last': '225', 'gap': '25'}],
    'Glycolysis_Within_Fourth_Quarter_of_Intensity_Range': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '19', 'last': '170', 'gap': '19'}],
    'Glycolysis_Within_Second_Quarter_of_Intensity_Range': [{'type': 'I', 'include_lower': '1', 'include_upper': '0', 'unbounded': '1', 'first': '25', 'last': '227', 'gap': '25'}]
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
    "StudyInstanceUID": ["PatientID", "StudyInstanceUID", "crdc_study_uuid"],
    "SeriesInstanceUID": ["PatientID", "StudyInstanceUID", "SeriesInstanceUID", "crdc_study_uuid", "crdc_series_uuid"]
}


def new_attribute(name, displ_name, type, display_default, cross_collex=False, units=None):
    return {
                'name': name,
                "display_name": displ_name,
                "type": type,
                'units': units,
                'cross_collex': cross_collex,
                'solr_collex': [],
                'bq_tables': [],
                'set_types': [],
                'display': display_default,
                'categories': []
            }


def add_data_sets(sets_set):
    for dss in sets_set:
        try:
            obj, created = DataSetType.objects.update_or_create(name=dss['name'], data_type=dss['data_type'], set_type=dss['set_type'])

            print("Data Set Type created:")
            print(obj)
        except Exception as e:
            logger.error("[ERROR] Data Version {} may not have been added!".format(dss['name']))
            logger.exception(e)


def add_data_versions(idc_version, create_set, associate_set):
    try:
        idc_dev, created = ImagingDataCommonsVersion.objects.update_or_create(**idc_version)
        ver_to_idc = []
        ver_to_prog = []
        for dv in create_set:
            obj, created = DataVersion.objects.update_or_create(name=dv['name'], version=dv['ver'], current=True)
            if len(dv.get('programs',[])):
                progs = Program.objects.filter(name__in=dv['programs'])
                for prog in progs:
                    ver_to_prog.append(DataVersion.programs.through(dataversion_id=obj.id, program_id=prog.id))

            ver_to_idc.append(DataVersion.idc_versions.through(dataversion_id=obj.id, imagingdatacommonsversion_id=idc_dev.id))

        for dv in DataVersion.objects.filter(name__in=associate_set):
            ver_to_idc.append(DataVersion.idc_versions.through(dataversion_id=dv.id, imagingdatacommonsversion_id=idc_dev.id))

        len(ver_to_prog) and DataVersion.programs.through.objects.bulk_create(ver_to_prog)
        DataVersion.idc_versions.through.objects.bulk_create(ver_to_idc)

        logger.info("[STATUS] Current Active data versions:")
        logger.info("{}".format(DataVersion.objects.filter(active=True)))
    except Exception as e:
        logger.error("[ERROR] Data Versions may not have been added!")
        logger.exception(e)


def add_programs(program_set):
    results = {}
    for prog in program_set:
        try:
            obj, created = Program.objects.update_or_create(
                short_name=prog['short_name'], name=prog['full_name'], is_public=prog['public'],
                owner=User.objects.get(email=prog['owner']) if 'owner' in prog else idc_superuser)

            print("Program created:")
            print(obj)

            results[obj.short_name] = obj

        except Exception as e:
            logger.error("[ERROR] Program {} may not have been added!".format(prog['short_name']))
            logger.exception(e)
    return results


def add_data_sources(source_set, subversions, set_types):
    for source in source_set:
        source.update({
            "versions": subversions,
            "set_types": set_types
        })
        add_data_source(**source)


def add_data_source(name, count_col, source_type, versions, programs, aggregate_level, set_types, joins, attr_from):
    obj = None
    try:
        obj, created = DataSource.objects.update_or_create(
            name=name,
            count_col=count_col,
            source_type=source_type,
            aggregate_level=aggregate_level
        )

        progs = Program.objects.filter(short_name__in=programs)
        src_to_prog = []
        for prog in progs:
            src_to_prog.append(DataSource.programs.through(datasource_id=obj.id, program_id=prog.id))
        DataSource.programs.through.objects.bulk_create(src_to_prog)

        data_versions = DataVersion.objects.filter(name__in=versions)
        versions_to_source = []
        for dv in data_versions:
            versions_to_source.append(DataSource.versions.through(dataversion_id=dv.id, datasource_id=obj.id))
        DataSource.versions.through.objects.bulk_create(versions_to_source)

        datasets = DataSetType.objects.filter(name__in=set_types)
        datasets_to_source = []
        for data_set in datasets:
            datasets_to_source.append(DataSource.data_sets.through(datasource_id=obj.id, datasettype_id=data_set.id))
        DataSource.data_sets.through.objects.bulk_create(datasets_to_source)

        for jn in joins:
            add_source_joins(
                [name],
                jn['from'],
                jn['sources'],
                jn['to']
            )
        copy_attrs([attr_from], [name])

        print("DataSource entry created: {}".format(obj.name))
    except Exception as e:
        logger.error("[ERROR] DataSource {} may not have been added!".format(obj.name if obj else 'Unknown'))
        logger.exception(e)


def add_source_joins(froms, from_col, tos=None, to_col=None):
    src_joins = []

    if not tos and not to_col:
        joins = combinations(froms, 2)
        for join in joins:
            for from_join in DataSource.objects.filter(name=join[0]):
                for to_join in DataSource.objects.filter(name=join[1]):
                    src_joins.append(DataSourceJoin(
                        from_src=from_join,
                        to_src=to_join,
                        from_src_col=from_col,
                        to_src_col=from_col)
                    )
    else:
        joins = product(froms,tos)
        for join in joins:
            for from_join in DataSource.objects.filter(name=join[0]):
                for to_join in DataSource.objects.filter(name=join[1]):
                    src_joins.append(DataSourceJoin(
                        from_src=from_join,
                        to_src=to_join,
                        from_src_col=from_col,
                        to_src_col=to_col)
                    )

    if len(src_joins):
        DataSourceJoin.objects.bulk_create(src_joins)


def load_collections(filename, data_version="8.0"):
    try:
        collection_file = open(filename, "r")
        new_collection_set = []
        updated_collection_set = {}
        exact_collection_fields = [
            "collection_id", "collection_uuid", "name", "collections", "image_types", "supporting_data", "subject_count", "doi",
            "source_url", "cancer_type", "species", "location", "analysis_artifacts", "description", "collection_type",
            "access", "date_updated", "active"]
        field_map = FIELD_MAP
        for line in csv_reader(collection_file):
            if COLLECTION_HEADER_CHK in line:
                print("[STATUS] Header found - mappping attributes.")
                i = 0
                field_map = {}
                for field in line:
                    field_map[field] = i
                    i += 1
                print(field_map)
                continue
            collex = {
                'data': { x: line[field_map[x]] for x in exact_collection_fields },
                "data_versions": [{"ver": data_version, "name": "TCIA Image Data"}]
            }
            collex['data']['nbia_collection_id'] = line[field_map['tcia_wiki_collection_id']]
            collex['data']['tcia_collection_id'] = line[field_map['tcia_wiki_collection_id']]
            collex['data']['active'] = bool((line[field_map['active']]).lower() == "true")
            collex['data']['date_updated'] = datetime.datetime.strptime(line[field_map['date_updated']], '%Y-%m-%d')
            collex['data']['description'] = re.sub(r' style="[^"]+"', '', (re.sub(r'<div [^>]+>',"<p>", line[field_map['description']]).replace("</div>","</p>")))
            if line[field_map['program']] and len(line[field_map['program']]):
                try:
                    prog = Program.objects.get(short_name=line[field_map['program']])
                    collex['data']['program'] = prog
                except Exception as e:
                    logger.info("[STATUS] Program {} not found for collection {} - it will not be added!".format(
                        line[field_map['program']], line[field_map['name']]
                    ))
            try:
                Collection.objects.get(collection_uuid=line[field_map['collection_uuid']])
                logger.info("[STATUS] Collection {} already exists - it will be updated.".format(line[field_map['name']]))
                updated_collection_set[line[field_map['collection_uuid']]] = collex
            except ObjectDoesNotExist:
                logger.info("[STATUS] Saw new Collection {}".format(line[field_map['name']]))
                new_collection_set.append(collex)

        add_collections(new_collection_set, updated_collection_set)

        load_tooltips(Collection.objects.filter(owner=idc_superuser, active=True, collection_type=Collection.ORIGINAL_COLLEX), "collection_id", "description")
        load_tooltips(Collection.objects.filter(owner=idc_superuser, active=True, collection_type=Collection.ANALYSIS_COLLEX), "analysis_results_id", "description", "collection_id")
    except Exception as e:
        logger.error("[ERROR] While processing collections file {}:".format(filename))
        logger.exception(e)
        logger.error("Line: {}".format(line))


def add_collections(new, update):
    collex_list = []
    try:
        for collex in new:
            collex_list.append(
                Collection(
                    **collex['data'],
                    owner=User.objects.get(email=collex['owner']) if 'owner' in collex else idc_superuser
                )
            )

        Collection.objects.bulk_create(collex_list)

        collex_to_dv = []
        for collex in new:
            obj = Collection.objects.get(collection_uuid=collex['data']['collection_uuid'])

            if len(collex.get('data_versions',[])):
                collex_to_dv = []
                data_versions = DataVersion.objects.filter(name__in=collex['data_versions'])
                for dv in data_versions:
                    collex_to_dv.append(Collection.data_versions.through(collection_id=obj.id, dataversion_id=dv.id))

        Collection.data_versions.through.objects.bulk_create(collex_to_dv)

        updated_collex = Collection.objects.filter(collection_uuid__in=list(update.keys()))
        if len(updated_collex):
            for upd in updated_collex:
                fields = list(update[upd.collection_uuid]['data'].keys())
                vals = update[upd.collection_uuid]['data']
                for key in vals:
                    setattr(upd, key, vals[key])
            Collection.objects.bulk_update(updated_collex, fields)

    except Exception as e:
        logger.error("[ERROR] While adding/updating collections:")
        logger.exception(e)


def create_solr_params(schema_src, solr_src):
    solr_src = DataSource.objects.get(name=solr_src)
    schema_src = schema_src.split('.')
    schema = BigQuerySupport.get_table_schema(schema_src[0],schema_src[1],schema_src[2])
    solr_schema = []
    solr_index_strings = []
    SCHEMA_BASE = '{"add-field": %s}'
    CORE_CREATE_STRING = "sudo -u solr /opt/bitnami/solr/bin/solr create -c {solr_src} -s 2 -rf 2"
    SCHEMA_STRING = "curl -u {solr_user}:{solr_pwd} -X POST -H 'Content-type:application/json' --data-binary '{schema}' https://localhost:8983/solr/{solr_src}/schema --cacert solr-ssl.pem"
    INDEX_STRING = "curl -u {solr_user}:{solr_pwd} -X POST 'https://localhost:8983/solr/{solr_src}/update?commit=yes{params}' --data-binary @{file_name}.csv -H 'Content-type:application/csv' --cacert solr-ssl.pem"
    for field in schema:
        if not re.search(r'has_',field['name']):
            field_schema = {
                "name": field['name'],
                "type": SOLR_TYPES[field['type']] if field['name'] not in SOLR_TYPE_EXCEPTION else SOLR_TYPE_EXCEPTION[field['name']],
                "multiValued": False if field['name'] in SOLR_SINGLE_VAL.get(solr_src.aggregate_level, {}) else True,
                "stored": True
            }
            solr_schema.append(field_schema)
            if field_schema['multiValued']:
                solr_index_strings.append("f.{}.split=true&f.{}.separator=|".format(field['name'],field['name']))

    with open("{}_solr_cmds.txt".format(solr_src.name), "w") as cmd_outfile:
        schema_array = SCHEMA_BASE % solr_schema
        params = "&{}".format("&".join(solr_index_strings))
        cmd_outfile.write(CORE_CREATE_STRING.format(solr_src=solr_src.name))
        cmd_outfile.write("\n\n")
        cmd_outfile.write(SCHEMA_STRING.format(
            solr_user=settings.SOLR_LOGIN,
            solr_pwd=settings.SOLR_PASSWORD,
            solr_src=solr_src.name,
            schema=schema_array
        ))
        cmd_outfile.write("\n\n")
        cmd_outfile.write(INDEX_STRING.format(
            solr_user=settings.SOLR_LOGIN,
            solr_pwd=settings.SOLR_PASSWORD,
            solr_src=solr_src.name,
            params=params,
            file_name=solr_src.name
        ))

    cmd_outfile.close()


def load_attributes(filename, solr_sources, bq_sources):
    attr_file = open(filename, "r")
    for line in csv_reader(attr_file):
        if line[0] not in ATTR_SET:
            ATTR_SET[line[0]] = new_attribute(
                line[0],
                line[0].replace("_", " ").title() if re.search(r'_', line[1]) else line[1],
                Attribute.CATEGORICAL if line[2] == 'CATEGORICAL STRING' else Attribute.STRING if line[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                True if line[-1] == 'True' else False,
                True
            )
        attr = ATTR_SET[line[0]]
        if attr['name'] != 'gcs_url':
            attr['solr_collex'].extend(solr_sources)
        attr['bq_tables'].extend(bq_sources)

        attr['set_types'].append({'set': DataSetType.IMAGE_DATA, 'child_record_search': 'StudyInstanceUID'})

        if attr['name'] in DISPLAY_VALS:
            if 'preformatted_values' in DISPLAY_VALS[attr['name']]:
                attr['preformatted_values'] = True
            else:
                attr['display_vals'] = DISPLAY_VALS[attr['name']]['vals']

    attr_file.close()


def add_attributes(attr_set):
    for attr_name, attr in attr_set.items():
        try:
            obj = Attribute.objects.get(name=attr['name'])
            logger.info("[STATUS] Attribute {} already found - skipping!".format(attr['name']))
        except ObjectDoesNotExist as e:
            obj, created = Attribute.objects.update_or_create(
                name=attr['name'], display_name=attr['display_name'], data_type=attr['type'],
                preformatted_values=True if 'preformatted_values' in attr else False,
                is_cross_collex=True if 'cross_collex' in attr else False,
                default_ui_display=attr['display'],
                units=attr.get('units',None)
            )
            if 'range' in attr:
                if len(attr['range']):
                    for attr_range in attr['range']:
                        Attribute_Ranges.objects.update_or_create(
                            **attr_range, attribute=obj
                        )
                else:
                    Attribute_Ranges.objects.update_or_create(
                        attribute=obj
                    )
            if len(attr.get('display_vals',[])):
                for dv in attr['display_vals']:
                    Attribute_Display_Values.objects.update_or_create(
                        raw_value=dv['raw_value'], display_value=dv['display_value'], attribute=obj
                    )
            if len(attr.get('solr_collex',[])):
                for sc in DataSource.objects.filter(name__in=attr['solr_collex']):
                    obj.data_sources.add(sc)
            if len(attr.get('bq_tables',[])):
                for bqt in DataSource.objects.filter(name__in=attr['bq_tables']):
                    obj.data_sources.add(bqt)
            if len(attr.get('set_types',[])):
                for set_type in attr.get('set_types'):
                    Attribute_Set_Type.objects.update_or_create(
                        datasettype=DataSetType.objects.get(data_type=set_type['set']), attribute=obj,
                        child_record_search=set_type['child_record_search']
                    )
            if len(attr.get('categories',[])):
                for cat in attr['categories']:
                    Attribute_Display_Category.objects.update_or_create(
                        category=cat['name'], category_display_name=cat['display_name'], attribute=obj
                    )

        except Exception as e:
            logger.error("[ERROR] Attribute {} may not have been added!".format(attr['name']))
            logger.exception(e)


def copy_attrs(from_data_sources, to_data_sources):
    to_sources = DataSource.objects.filter(name__in=to_data_sources)
    from_sources = DataSource.objects.filter(name__in=from_data_sources)
    to_sources_attrs = to_sources.get_source_attrs()
    bulk_add = []

    for fds in from_sources:
        from_source_attrs = fds.attribute_set.exclude(id__in=to_sources_attrs['ids'])
        print("Copying {} attributes from {} to: {}.".format(
            len(from_source_attrs.values_list('name',flat=True)),
            fds.name, "; ".join(to_data_sources),

        ))

        for attr in from_source_attrs:
            for ds in to_sources:
                bulk_add.append(Attribute.data_sources.through(attribute_id=attr.id, datasource_id=ds.id))

    Attribute.data_sources.through.objects.bulk_create(bulk_add)


def update_data_sources(to_data_sources,set_types=None, versions=None, progs=None):
    to_sources = DataSource.objects.filter(name__in=to_data_sources)
    for ds in to_sources:
        if versions and len(versions):
            data_versions = DataVersion.objects.filter(name__in=versions)
            versions_to_source = []
            for dv in data_versions:
                versions_to_source.append(DataSource.versions.through(dataversion_id=dv.id, datasource_id=ds.id))
            DataSource.versions.through.objects.bulk_create(versions_to_source)

        if set_types and len(set_types):
            datasets = DataSetType.objects.filter(name__in=set_types)
            datasets_to_source = []
            for data_set in datasets:
                datasets_to_source.append(DataSource.data_sets.through(datasource_id=ds.id, datasettype_id=data_set.id))
            DataSource.data_sets.through.objects.bulk_create(datasets_to_source)

        if progs and len(progs):
            progs = Program.objects.filter(short_name__in=progs)
            src_to_prog = []
            for prog in progs:
                src_to_prog.append(DataSource.programs.through(datasource_id=ds.id, program_id=prog.id))
            DataSource.programs.through.objects.bulk_create(src_to_prog)


def disable_data_sources(sources):
    disable = DataSource.objects.filter(name__in=sources)
    for ds in disable:
        ds.versions.clear()
        ds.data_sets.clear()
        ds.attribute_set.clear()
        ds.programs.clear()


def deactivate_data_versions(versions, idc_version):
    try:
        for dv in DataVersion.objects.filter(name__in=versions):
            dv.active=False
            dv.save()
        for dv in ImagingDataCommonsVersion.objects.filter(version_number__in=idc_version):
            dv.active=False
            dv.save()
    except Exception as e:
        logger.error("[ERROR] While deactivating versions:")
        logger.exception(e)


def load_programs(filename):
    try:
        attr_vals_file = open(filename, "r")
        for line in csv_reader(attr_vals_file):
            try:
                Program.objects.get(short_name=line[0])
                logger.info("[STATUS] Program {} already exists: skipping.".format(line[0]))
            except ObjectDoesNotExist as e:
                obj = Program.objects.update_or_create(short_name=line[0],name=line[1],is_public=True,active=True,owner=idc_superuser)
                logger.info("[STATUS] Program {} added.".format(obj))

    except Exception as e:
        logger.error("[ERROR] While adding programs:")
        logger.exception(e)


def update_display_values(attr, updates):
    if len(updates):
        new_vals = []
        to_update = Attribute_Display_Values.objects.filter(raw_value__in=[x for x in updates], attribute=attr)
        if len(to_update):
            for upd in to_update:
                upd.display_value = updates[upd.raw_value]['display_value']
            Attribute_Display_Values.objects.bulk_update(to_update, ['display_value'])
            logger.info("[STATUS] Updated {} display values.".format(str(len(to_update))))
        to_add = set([x for x in updates]).difference(set([x.raw_value for x in to_update]))
        for rv in to_add:
            new_vals.append(Attribute_Display_Values(raw_value=rv, display_value=updates[rv]['display_value'], attribute=attr))
        if len(new_vals):
            Attribute_Display_Values.objects.bulk_create(new_vals)
            logger.info("[STATUS] Added {} display values.".format(str(len(new_vals))))


def load_tooltips(source_objs, attr_name, source_tooltip, obj_attr=None):
    try:
        attr = Attribute.objects.get(name=attr_name, active=True)
        if not obj_attr:
            obj_attr = attr_name

        tips = Attribute_Tooltips.objects.select_related('attribute').filter(attribute=attr)

        extent_tooltips = {}

        for tip in tips:
            if tip.attribute.id not in extent_tooltips:
                extent_tooltips[tip.attribute.id] = []
            extent_tooltips[tip.attribute.id].append(tip.tooltip_id)

        tooltips_by_val = {x[obj_attr]: {'tip': x[source_tooltip]} for x in source_objs.values() if x[obj_attr] != '' and x[obj_attr] is not None}

        new_tooltips = []
        updated_tooltips = []

        for val in tooltips_by_val:
            if not tooltips_by_val[val]['tip']:
                continue
            if val not in extent_tooltips.get(attr.id, []):
                new_tooltips.append(Attribute_Tooltips(tooltip_id=val, tooltip=tooltips_by_val[val]['tip'],
                                                   attribute=attr))
            else:
                updated_tooltips.append(val)

        if len(new_tooltips):
            logger.info("[STATUS] Adding {} new tooltips.".format(str(len(new_tooltips))))
            Attribute_Tooltips.objects.bulk_create(new_tooltips)
        if len(updated_tooltips):
            logger.info("[STATUS] Updating {} tooltips.".format(str(len(updated_tooltips))))
            to_update = Attribute_Tooltips.objects.filter(tooltip_id__in=updated_tooltips, attribute=attr)
            for ttip in to_update:
                ttip.tooltip = tooltips_by_val[ttip.tooltip_id]['tip']
            Attribute_Tooltips.objects.bulk_update(to_update, ['tooltip'])

        if not len(new_tooltips) and not len(updated_tooltips):
            logger.info("[STATUS] No new or changed tooltips found.")
    except Exception as e:
        logger.error("[ERROR] While attempting to load tooltips:")
        logger.exception(e)


def load_display_vals(filename):
    display_vals = {}
    try:
        attr_vals_file = open(filename, "r")

        for line in csv_reader(attr_vals_file):
            if 'display_value' in line:
                continue
            if line[0] not in display_vals:
                display_vals[line[0]] = {
                    'vals': {}
                }
            if line[1] == 'NULL':
                display_vals[line[0]]['preformatted_values'] = True
            else:
                display_vals[line[0]]['vals'][line[1]] = {'raw_value': line[1], 'display_value': line[2]}

        attr_vals_file.close()
    except Exception as e:
        logger.error("[ERROR] While attempting to load display values:")
        logger.exception(e)
    return display_vals


def update_data_versions(filename):
    f = open(join(dirname(__file__),filename), "r")
    config = json.load(f)

    add_data_versions(
        config['new_major_version'],
        [{'name': x, 'ver': config['subversion_number']} for x in config['new_sub_versions']],
        config['bioclin_version']
    )

    add_data_sources(config['data_sources'], config['new_sub_versions'], config['set_types'])

    deactivate_data_versions(config['deactivate']['minor'], config['deactivate']['major'])

    return


def parse_args():
    parser = ArgumentParser()
    parser.add_argument('-v', '--version-file', type=str, default='', help='JSON file of version data to update')
    parser.add_argument('-c', '--collex-file', type=str, default='', help='CSV data of collections to update/create')
    parser.add_argument('-d', '--display-vals', type=str, default='', help='CSV data of display values to add/update')
    parser.add_argument('-p', '--programs-file', type=str, default='', help='CSV data of programs to add/update')
    parser.add_argument('-a', '--attributes-file', type=str, default='', help='CSV data of attributes to add/update')
    parser.add_argument('-s', '--solr-files', type=str, default='n', help='Should Solr parameter and JSON schema files be made? (Yy/Nn)')
    return parser.parse_args()


def main():

    try:
        args = parse_args()

        len(args.version_file) and update_data_versions(args.version_file)

        len(args.attributes_file) and load_attributes(args.attributes_file,
            ["dicom_derived_series_v11", "dicom_derived_study_v11"], ["idc-dev-etl.idc_v11_pub.dicom_pivot_v11"]
        )

        len(ATTR_SET.keys()) and add_attributes(ATTR_SET)
        len(args.programs_file) and load_programs(args.programs_file)
        len(args.collex_file) and load_collections(args.collex_file)
        if len(args.display_vals):
            dvals = load_display_vals(args.display_vals)
            for attr in dvals:
                update_display_values(Attribute.objects.get(name=attr), dvals[attr]['vals'])

        if args.solr_files.lower() == 'y':
            for src in [("idc-dev-etl.idc_v11_pub.dicom_derived_all", "dicom_derived_series_v11",),
                    ("idc-dev-etl.idc_v11_pub.dicom_derived_all", "dicom_derived_study_v11",),]:
                create_solr_params(src[0], src[1])

    except Exception as e:
        logger.error("[ERROR] While parsing ETL:")
        logger.exception(e)


if __name__ == "__main__":
    main()
