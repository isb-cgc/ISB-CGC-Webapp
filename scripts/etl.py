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
from csv import reader as csv_reader
import csv
from argparse import ArgumentParser
import sys
import time
from copy import deepcopy
from itertools import combinations, product

from idc import secret_settings, settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "idc.settings")

import django
django.setup()

from idc_collections.models import Program, Collection, Attribute, Attribute_Ranges, \
    Attribute_Display_Values, DataSource, DataSourceJoin, DataVersion, DataSetType, \
    Attribute_Set_Type, Attribute_Display_Category, ImagingDataCommonsVersion

from django.contrib.auth.models import User
idc_superuser = User.objects.get(username="idc")

logger = logging.getLogger('main_logger')

BQ_PROJ_DATASET = 'idc-dev-etl.idc_tcia_views_mvp_wave0'


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

def add_data_versions(dv_set):
    idc_dev, created = ImagingDataCommonsVersion.objects.update_or_create(name="Imaging Data Commons Data Release", version_number="1.0")
    ver_to_idc = []
    try:
        for dv in dv_set:
            obj, created = DataVersion.objects.update_or_create(name=dv['name'], version=dv['ver'])

            progs = Program.objects.filter(name__in=dv['progs'])
            ver_to_prog = []
            for prog in progs:
                ver_to_prog.append(DataVersion.programs.through(dataversion_id=obj.id, program_id=prog.id))

            ver_to_idc.append(DataVersion.idc_versions.through(dataversion_id=obj.id, imagingdatacommonsversion_id=idc_dev.id))

        DataVersion.programs.through.objects.bulk_create(ver_to_prog)
        DataVersion.idc_versions.through.objects.bulk_create(ver_to_idc)

        logger.info("[STATUS] Data Versions loaded:")
        logger.info("{}".format(DataVersion.objects.all()))
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

def add_data_source(source_set, versions, programs, data_sets, source_type):
    for source in source_set:
        try:
            obj, created = DataSource.objects.update_or_create(
                name=source,
                count_col="case_barcode" if "tcga" in source else "PatientID",
                source_type=source_type
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

            print("DataSource entry created: {}".format(source))
        except Exception as e:
            logger.error("[ERROR] DataSource {} may not have been added!".format(source))
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

def add_collections(collection_set):
    collex_list = []
    try:
        for collex in collection_set:
            collex_list.append(
                Collection(
                    **collex['data'],
                    owner=User.objects.get(email=collex['owner']) if 'owner' in collex else idc_superuser
                )
            )

        Collection.objects.bulk_create(collex_list)

        for collex in collection_set:
            obj = Collection.objects.get(collection_id=collex['data']['collection_id'])

            if len(collex.get('data_versions',[])):
                collex_to_dv = []
                data_versions = DataVersion.objects.filter(name__in=collex['data_versions'])
                for dv in data_versions:
                    collex_to_dv.append(Collection.data_versions.through(collection_id=obj.id, dataversion_id=dv.id))

                Collection.data_versions.through.objects.bulk_create(collex_to_dv)

    except Exception as e:
        logger.error("[ERROR] Collection {} may not have been added!".format(collex['data']['collection_id']))
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
                        datasettype=DataSetType.objects.get(data_type=set_type['set']), attribute=obj, child_record_search=set_type['child_record_search']
                    )
            if len(attr.get('categories',[])):
                for cat in attr['categories']:
                    Attribute_Display_Category.objects.update_or_create(
                        category=cat['name'], category_display_name=cat['display_name'], attribute=obj
                    )

        except Exception as e:
            logger.error("[ERROR] Attribute {} may not have been added!".format(attr['name']))
            logger.exception(e)

def move_attrs(from_data_sources, to_data_sources):
    to_sources = DataSource.objects.filter(name__in=to_data_sources)
    from_sources = DataSource.objects.filter(name__in=from_data_sources)
    to_sources_attrs = to_sources.get_source_attrs()
    bulk_add = []

    for fds in from_sources:
        from_source_attrs = fds.attribute_set.exclude(id__in=to_sources_attrs['ids'])
        print("Moving attributes from {}: {}".format(fds.name, "; ".join(from_source_attrs.values_list('name',flat=True))))

        for attr in from_source_attrs:
            for ds in to_sources:
                bulk_add.append(Attribute.data_sources.through(attribute_id=attr.id, datasource_id=ds.id))

    Attribute.data_sources.through.objects.bulk_create(bulk_add)

def update_data_sources(to_data_sources,set_types=None,versions=None,progs=None):
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

def main():

    try:
        move_attrs(["idc-dev-etl.idc_tcia_views_mvp_wave0.segmentations",
             "idc-dev-etl.idc_tcia_views_mvp_wave0.qualitative_measurements",
             "idc-dev-etl.idc_tcia_views_mvp_wave0.quantitative_measurements"
         ],["idc-dev.metadata.dicom_pivot_wave0"])

        update_data_sources(["idc-dev.metadata.dicom_pivot_wave0"],['Derived Data'],['TCIA Derived Data'],["TCGA","QIN","ISPY","LIDC"])

        disable_data_sources(["idc-dev-etl.idc_tcia_views_mvp_wave0.segmentations",
             "idc-dev-etl.idc_tcia_views_mvp_wave0.qualitative_measurements",
             "idc-dev-etl.idc_tcia_views_mvp_wave0.quantitative_measurements"
         ])

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
