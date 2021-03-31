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


def add_data_versions(idc_version, create_set, associate_set):
    try:
        idc_dev, created = ImagingDataCommonsVersion.objects.update_or_create(name=idc_version['name'], version_number=idc_version['number'])
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


def add_data_source(name, count_col, source_type, versions, programs, data_sets):
    try:
        obj, created = DataSource.objects.update_or_create(
            name=name,
            count_col=count_col,
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
        collection_set = []
        for line in csv_reader(collection_file):
            collection_set.append({
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
                    "program": line[13],
                    "date_updated": line[14],
                    "nbia_collection_id": line[15]
                },
                "data_versions": [{"ver": "2.0", "name": "TCIA Image Data"}]
            })
        return collection_set
    except Exception as e:
        logger.error("[ERROR] While processing collections file {}:".format(filename))
        logger.exception(e)


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
            dv.save
    except Exception as e:
        logger.error("[ERROR] While deactivating versions:")
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
        print(updated_vals)

        if len(updated_vals):
            updates = Attribute_Display_Values.objects.filter(id__in=[x.split(':')[0] for x in updated_vals], raw_value__in=[x.split(':')[1] for x in updated_vals])
            for upd in updates:
                update = updated_vals["{}:{}".format(upd.id,upd.raw_value)]
                upd.display_value = update['display_value']
            Attribute_Display_Values.objects.bulk_update(updates, ['display_value'])
        len(new_vals) and Attribute_Display_Values.objects.bulk_create(new_vals)


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
    return parser.parse_args()

def main():

    try:
        args = parse_args()
        new_versions = ["TCIA Image Data Wave 2","TCIA Derived Data Wave 2"]
        new_programs = ["APOLLO","RIDER","VICTRE","MIDRC","ACRIN","CPTAC","PDMR","LCTSC","PROSTATEX","HNSCC","IVYGAP","REMBRANDT"]

        set_types = ["IDC Source Data","Derived Data"]
        bioclin_version = ["GDC Data Release 9"]

        add_data_versions(
            {'name': "Imaging Data Commons Data Release",
             'number': "2.0",
             'date_active': "2021-04-05",
             'case_count': '',
             'collex_count': '',
             'data_volume': '',
             'series_count': ''
             },
            [{'name': x, 'ver': '2'} for x in new_versions],
            bioclin_version
        )

        add_data_sources([
            {
                'name': 'dicom_derived_series_v2',
                'source_type': DataSource.SOLR,
                'count_col': 'PatientID',
                'programs': [],
                'versions': new_versions,
                'data_sets': set_types,
            },
            {
                'name': 'dicom_derived_study_v2',
                'source_type': DataSource.SOLR,
                'count_col': 'PatientID',
                'programs': [],
                'versions': new_versions,
                'data_sets': set_types,
            },
            {
                'name': 'idc-dev-etl.idc_v2.dicom_derived_all_pivot',
                'source_type': DataSource.BIGQUERY,
                'count_col': 'PatientID',
                'programs': [],
                'versions': new_versions,
                'data_sets': set_types,
            }
        ])

        add_source_joins(
            ['dicom_derived_study_v2','dicom_derived_series_v2'],
            "PatientID",
            ["tcga_bios","tcga_clin"],
            "case_barcode"
        )

        add_source_joins(
            ["idc-dev-etl.idc_v2.dicom_derived_all_pivot"],
            "PatientID",
            ["isb-cgc.TCGA_bioclin_v0.Biospecimen","isb-cgc.TCGA_bioclin_v0.clinical_v1"],
            "case_barcode"
        )

        new_attr = new_attribute("Apparent_Diffusion_Coefficient", "Apparent Diffusion Coefficient", Attribute.CONTINUOUS_NUMERIC, True, units="um2/s")
        new_attr['solr_collex'] = ['dicom_derived_study_v2','dicom_derived_series_v2']
        new_attr['bq_tables'] = ["idc-dev-etl.idc_v2.dicom_derived_all_pivot"]
        new_attr['set_types'] = [{'set': DataSetType.DERIVED_DATA, 'child_record_search': None}]

        add_attributes([new_attr])

        copy_attrs(["idc-dev.metadata.dicom_pivot_wave1"],["idc-dev-etl.idc_v2.dicom_derived_all_pivot"])
        copy_attrs(["dicom_derived_all"],["dicom_derived_series_v2","dicom_derived_study_v2"])

        deactivate_data_versions(["TCIA Image Data Wave 1","TCIA Derived Data Wave 1"], ["1.0"])

        len(args.collex_file) and load_collections(args.collex_file)
        if len(args.display_vals):
            dvals = load_display_vals(args.display_vals)
            for attr in dvals:
                update_attribute(Attribute.objects.get(name=attr),{'display_vals': dvals[attr]})

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
