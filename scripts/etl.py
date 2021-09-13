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

ranges_needed = {

}

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
    "NUMERIC": "pfloat",
    "INT64": "plong",
    "INTEGER": "plong",
    "DATE": "pdate",
    "DATETIME": "pdate"
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
            obj, created = DataVersion.objects.update_or_create(name=dv['name'], version=dv['ver'])
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


def add_data_sources(source_set):
    for source in source_set:
        add_data_source(**source)


def add_data_source(name, count_col, source_type, versions, programs, data_sets, aggregate_level):
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

        datasets = DataSetType.objects.filter(name__in=data_sets)
        datasets_to_source = []
        for data_set in datasets:
            datasets_to_source.append(DataSource.data_sets.through(datasource_id=obj.id, datasettype_id=data_set.id))
        DataSource.data_sets.through.objects.bulk_create(datasets_to_source)

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


def load_collections(filename):
    try:
        collection_file = open(filename, "r")
        new_collection_set = []
        updated_collection_set = {}
        for line in csv_reader(collection_file):
            collex = {
                'data': {
                    "collection_id": line[0],
                    "name": line[1],
                    "collections": line[2],
                    "image_types": line[3],
                    "supporting_data": line[4],
                    "subject_count": line[5],
                    "doi": line[6],
                    "cancer_type": line[7],
                    "species": line[8],
                    "location": line[9],
                    "analysis_artifacts": line[10],
                    "description": re.sub(r' style="[^"]+"', '', (re.sub(r'<div [^>]+>',"<p>", line[11]).replace("</div>","</p>"))),
                    "collection_type": line[12],
                    "date_updated": datetime.datetime.strptime(line[14], '%Y-%m-%d'),
                    "nbia_collection_id": line[15],
                    "tcia_collection_id": line[15]
                },
                "data_versions": [{"ver": "4.0", "name": "TCIA Image Data"}]
            }
            if line[13] and len(line[13]):
                try:
                    prog = Program.objects.get(short_name=line[13])
                    collex['data']['program'] = prog
                except Exception as e:
                    logger.info("[STATUS] Program {} not found for collection {} - it will not be added!".format(line[13],line[1]))
            try:
                Collection.objects.get(name=line[1])
                logger.info("[STATUS] Collection {} already exists - it will be updated.".format(line[1]))
                updated_collection_set[line[1]] = collex
            except ObjectDoesNotExist:
                new_collection_set.append(collex)

        add_collections(new_collection_set,updated_collection_set)

        load_tooltips(Collection,"collection_id","description")
    except Exception as e:
        logger.error("[ERROR] While processing collections file {}:".format(filename))
        logger.exception(e)


def add_collections(new,update):
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
            obj = Collection.objects.get(name=collex['data']['name'])

            if len(collex.get('data_versions',[])):
                collex_to_dv = []
                data_versions = DataVersion.objects.filter(name__in=collex['data_versions'])
                for dv in data_versions:
                    collex_to_dv.append(Collection.data_versions.through(collection_id=obj.id, dataversion_id=dv.id))

        Collection.data_versions.through.objects.bulk_create(collex_to_dv)

        updated_collex = Collection.objects.filter(name__in=list(update.keys()))
        fields = None

        for upd in updated_collex:
            if not fields:
                fields = list(update[upd.name]['data'].keys())
            vals = update[upd.name]['data']
            for key in vals:
                setattr(upd,key,vals[key])
        Collection.objects.bulk_update(updated_collex,fields)

    except Exception as e:
        logger.error("[ERROR] Collection '{}' may not have been added!".format(collex['data']['name']))
        logger.exception(e)


def create_solr_params(schema_src, solr_src):
    solr_src = DataSource.objects.get(name=solr_src)
    schema_src = schema_src.split('.')
    schema = BigQuerySupport.get_table_schema(schema_src[0],schema_src[1],schema_src[2])
    solr_schema = []
    solr_index_strings = []
    for field in schema:
        if not re.search(r'has_',field['name']):
            field_schema = {
                "name": field['name'],
                "type": SOLR_TYPES[field['type']],
                "multiValued": False if field['name'] in SOLR_SINGLE_VAL.get(solr_src.aggregate_level, {}) else True,
                "stored": True
            }
            solr_schema.append(field_schema)
            if field_schema['multiValued']:
                solr_index_strings.append("f.{}.split=true&f.{}.separator=|".format(field['name'],field['name']))

    with open("{}_solr_schemas.json".format(solr_src.name), "w") as schema_outfile:
        json.dump(solr_schema, schema_outfile)
    schema_outfile.close()
    with open("{}_solr_index_vars.txt".format(solr_src.name), "w") as solr_index_string:
        solr_index_string.write("&{}".format("&".join(solr_index_strings)))
    solr_index_string.close()


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


def update_attribute(attr,updates):
    if len(updates.get('display_vals',[])):
        new_vals = []
        updated_vals = {}
        for dv in updates['display_vals']['vals']:
            if len(Attribute_Display_Values.objects.filter(raw_value=dv['raw_value'], attribute=attr)):
                updated_vals["{}:{}".format(attr.id,dv['raw_value'])] = dv['display_value']
            else:
                new_vals.append(Attribute_Display_Values(raw_value=dv['raw_value'], display_value=dv['display_value'], attribute=attr))

        if len(updated_vals):
            updates = Attribute_Display_Values.objects.filter(id__in=[x.split(':')[0] for x in updated_vals], raw_value__in=[x.split(':')[1] for x in updated_vals])
            for upd in updates:
                update = updated_vals["{}:{}".format(upd.id,upd.raw_value)]
                upd.display_value = update['display_value']
            Attribute_Display_Values.objects.bulk_update(updates, ['display_value'])
        len(new_vals) and Attribute_Display_Values.objects.bulk_create(new_vals)


def load_tooltips(SourceObj,attr_name,source_tooltip):
    try:
        source_objs = SourceObj.objects.filter(owner=idc_superuser, active=True)
        attr = Attribute.objects.get(name=attr_name, active=True)

        tips = Attribute_Tooltips.objects.select_related('attribute').filter(attribute=attr)

        extent_tooltips = {}

        for tip in tips:
            if not tip.attribute.id in extent_tooltips:
                extent_tooltips[tip.attribute.id] = []
            extent_tooltips[tip.attribute.id].append(tip.tooltip_id)

        tooltips_by_val = {x[attr_name]: {'tip': x[source_tooltip], 'obj': attr} for x in source_objs.values() if x[attr_name] != '' and x[attr_name] is not None}

        tooltips = []

        for val in tooltips_by_val:
            if not tooltips_by_val[val]['tip']:
                continue
            if val not in extent_tooltips.get(tooltips_by_val[val]['obj'].id,[]):
                tooltips.append(Attribute_Tooltips(tooltip_id=val, tooltip=tooltips_by_val[val]['tip'],
                                                   attribute=tooltips_by_val[val]['obj']))

        if len(tooltips):
            logger.info("[STATUS] Adding {} new tooltips.".format(str(len(tooltips))))
            Attribute_Tooltips.objects.bulk_create(tooltips)
        else:
            logger.info("[STATUS] - No new tooltips available.")
    except Exception as e:
        logger.error("[ERROR] While attempting to load tooltips:")
        logger.exception(e)


def load_display_vals(filename):
    display_vals = {}
    try:
        attr_vals_file = open(filename, "r")
        line_reader = attr_vals_file.readlines()

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")
            if line_split[0] not in display_vals:
                display_vals[line_split[0]] = {
                    'vals': []
                }
            if line_split[1] == 'NULL':
                display_vals[line_split[0]]['preformatted_values'] = True
            else:
                display_vals[line_split[0]]['vals'].append({'raw_value': line_split[1], 'display_value': line_split[2]})

        attr_vals_file.close()
    except Exception as e:
        logger.error("[ERROR] While attempting to load display values:")
        logger.exception(e)
    return display_vals


def parse_args():
    parser = ArgumentParser()
    parser.add_argument('-c', '--collex-file', type=str, default='', help='List of Collections to update/create')
    parser.add_argument('-v', '--display-vals', type=str, default='', help='List of display values to add/update')
    parser.add_argument('-p', '--programs-file', type=str, default='', help='List of programs to add/update')
    parser.add_argument('-a', '--attributes-file', type=str, default='', help='List of attributes to add/update')
    return parser.parse_args()


def main():

    try:
        args = parse_args()
        new_versions = ["TCIA Image Data Wave 4","TCIA Derived Data Wave 4"]

        set_types = ["IDC Source Data","Derived Data"]
        bioclin_version = ["GDC Data Release 9"]

        add_data_versions(
            {'name': "IDC Data Release",
             'version_number': "4.0",
             'case_count': 43428,
             'collex_count': 113,
             'data_volume': 16.7,
             'series_count': 371814
             },
            [{'name': x, 'ver': '4'} for x in new_versions],
            bioclin_version
        )

        add_data_sources([
            {
                'name': 'dicom_derived_series_v4',
                'source_type': DataSource.SOLR,
                'count_col': 'PatientID',
                'programs': [],
                'versions': new_versions,
                'data_sets': set_types,
                'aggregate_level': "SeriesInstanceUID"
            },
            {
                'name': 'dicom_derived_study_v4',
                'source_type': DataSource.SOLR,
                'count_col': 'PatientID',
                'programs': [],
                'versions': new_versions,
                'data_sets': set_types,
                'aggregate_level': "StudyInstanceUID"
            },
            {
                'name': 'idc-dev-etl.idc_v4.dicom_pivot_v4',
                'source_type': DataSource.BIGQUERY,
                'count_col': 'PatientID',
                'programs': [],
                'versions': new_versions,
                'data_sets': set_types,
                'aggregate_level': 'SOPInstanceUID'
            }
        ])

        add_source_joins(
            ['dicom_derived_study_v4','dicom_derived_series_v4'],
            "PatientID",
            ["tcga_bios","tcga_clin"],
            "case_barcode"
        )

        add_source_joins(
            ["idc-dev-etl.idc_v4.dicom_pivot_v4"],
            "PatientID",
            ["isb-cgc.TCGA_bioclin_v0.Biospecimen","isb-cgc.TCGA_bioclin_v0.clinical_v1_1"],
            "case_barcode"
        )

        copy_attrs(["idc-dev-etl.idc_v3.dicom_pivot_v3"],["idc-dev-etl.idc_v4.dicom_pivot_v4"])
        copy_attrs(["dicom_derived_series_v3"],["dicom_derived_series_v4","dicom_derived_study_v4"])

        deactivate_data_versions(["TCIA Image Data Wave 3","TCIA Derived Data Wave 3"], ["3.0"])

        len(args.attributes_file) and load_attributes(args.attributes_file,
            ["dicom_derived_series_v4","dicom_derived_study_v4"], ["idc-dev-etl.idc_v4.dicom_pivot_v4"]
        )

        len(ATTR_SET.keys()) and add_attributes(ATTR_SET)
        # len(args.programs_file) and load_programs(args.programs_file)
        # len(args.collex_file) and load_collections(args.collex_file)
        if len(args.display_vals):
            dvals = load_display_vals(args.display_vals)
            for attr in dvals:
                update_attribute(Attribute.objects.get(name=attr),{'display_vals': dvals[attr]})

        for src in [("idc-dev-etl.idc_v4.dicom_derived_all", "dicom_derived_series_v4",),
                    ("idc-dev-etl.idc_v4.dicom_derived_all", "dicom_derived_study_v4",),]:
            create_solr_params(src[0],src[1])

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
