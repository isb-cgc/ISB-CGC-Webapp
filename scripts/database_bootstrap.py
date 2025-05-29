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

PREFORMATTED_CLIN_ATTR = []

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "idc.settings")

import django
django.setup()

from idc_collections.models import Program, Collection, Attribute, Attribute_Ranges, \
    Attribute_Display_Values, DataSource, DataSourceJoin, DataVersion, DataSetType, \
    Attribute_Set_Type, Attribute_Display_Category, ImagingDataCommonsVersion

from django.contrib.auth.models import User
idc_superuser = User.objects.get(username="idc")

logger = logging.getLogger(__name__)

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

BQ_PROJ_DATASET = 'idc-dev-etl.idc_tcia_views_mvp_wave0'

BQ_TABLES = {
    'dicom': '{}.{}'.format(BQ_PROJ_DATASET,'dicom_all'),
    'segs': '{}.{}'.format(BQ_PROJ_DATASET,'segmentations'),
    'qual': '{}.{}'.format(BQ_PROJ_DATASET,'qualitative_measurements'),
    'quan': '{}.{}'.format(BQ_PROJ_DATASET,'quantitative_measurements'),
    'clin': 'isb-cgc.TCGA_bioclin_v0.clinical_v1',
    'bios': 'isb-cgc.TCGA_bioclin_v0.Biospecimen'
}

SOLR_INDEX = {
    'dicom_derived': 'dicom_derived_all',
    'clin': 'tcga_clin',
    'bios': 'tcga_bios'
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

            progs = Program.objects.filter(name__in=programs)
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


def main():

    try:
        programs = add_programs([{
            "full_name": "The Cancer Genome Atlas",
            "short_name": "TCGA",
            "public": True
        },
        {
            "full_name": "Quantitative Imagine Network",
            "short_name": "QIN",
            "public": True
        },
        {
            "full_name": "I-SPY TRIAL",
            "short_name": "ISPY",
            "public": True
        },{
            "full_name": "Lung Image Database Consortium",
            "short_name": "LIDC",
            "public": True
        }])

        add_data_sets([
            {'name': 'IDC Source Data', 'data_type': 'I', 'set_type': 'O'},
            {'name': 'Clinical, Biospecimen, and Mutation Data', 'data_type': 'A', 'set_type': 'C'},
            {'name': 'Derived Data', 'data_type': 'D', 'set_type': 'R'}
        ])

        add_data_versions([
            {"name": "GDC Data Release 9", "ver": "r9", "progs":["TCGA"]},
            {"name": "TCIA Image Data", "ver": "1","progs":["TCGA", "ISPY", "QIN", "LIDC"]},
            {"name": "TCIA Derived Data", "ver": "1", "progs":["LIDC"]},
        ])

        add_data_source([SOLR_INDEX['dicom_derived']], ["TCIA Image Data", "TCIA Derived Data"],["TCGA", "ISPY", "QIN", "LIDC"], ["IDC Source Data", "Derived Data"], DataSource.SOLR)
        add_data_source([SOLR_INDEX['clin'], SOLR_INDEX['bios']], ["GDC Data Release 9"],["TCGA"], ["Clinical, Biospecimen, and Mutation Data"], DataSource.SOLR)

        add_data_source([BQ_TABLES['dicom']], ["TCIA Image Data"],["TCGA", "ISPY", "QIN", "LIDC"], ["IDC Source Data"], DataSource.BIGQUERY)
        add_data_source([BQ_TABLES['bios'], BQ_TABLES['clin']], ["GDC Data Release 9"],["TCGA"], ["Clinical, Biospecimen, and Mutation Data"], DataSource.BIGQUERY)
        add_data_source([BQ_TABLES['segs']], ["TCIA Derived Data"],["LIDC"], ["Derived Data"], DataSource.BIGQUERY)
        add_data_source([BQ_TABLES['qual']], ["TCIA Derived Data"],["LIDC"], ["Derived Data"], DataSource.BIGQUERY)
        add_data_source([BQ_TABLES['quan']], ["TCIA Derived Data"],["LIDC"], ["Derived Data"], DataSource.BIGQUERY)

        add_source_joins([SOLR_INDEX['clin'], SOLR_INDEX['bios']], "case_barcode")
        add_source_joins(
            [SOLR_INDEX['dicom_derived']],
            "PatientID",
            [SOLR_INDEX['clin'], SOLR_INDEX['bios']], "case_barcode"
        )

        add_source_joins([BQ_TABLES['dicom'], BQ_TABLES['segs'],
                          BQ_TABLES['qual'], BQ_TABLES['quan']], "SOPInstanceUID")
        add_source_joins([BQ_TABLES['clin'], BQ_TABLES['bios']], "case_barcode")
        add_source_joins(
            [BQ_TABLES['dicom'], BQ_TABLES['segs'],
             BQ_TABLES['qual'], BQ_TABLES['quan']],
            "PatientID",
            [BQ_TABLES['clin'], BQ_TABLES['bios']], "case_barcode"
        )

        all_attrs = {}

        collection_file = open("tcia_collections.csv", "r")
        collection_set = []
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
                    "tcia_collection_id": line[13],
                    "date_updated": line[14],
                    "nbia_collection_id": line[15]
                },
                "data_versions": [{"ver": "1", "name": "TCIA Image Data"}]
            }
            if 'lidc' in line[0]:
                collex['data_versions'].append({"ver": "1", "name": "TCIA Derived Data"})
                collex['data']["program"] = programs["LIDC"]
            if 'tcga' in line[0]:
                collex['data_versions'].append({"ver": "r9", "name": "GDC Data Release 9"})
                collex['data']["program"] = programs["TCGA"]
            if 'ispy' in line[0]:
                collex['data']["program"] = programs["ISPY"]
            if 'qin' in line[0]:
                collex['data']["program"] = programs["QIN"]

            collection_set.append(collex)

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
                all_attrs[line_split[0]] = new_attribute(
                    line_split[0],
                    line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else line_split[1],
                    Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                    True if line_split[-1] == 'True' else False
                )

            attr = all_attrs[line_split[0]]

            attr['set_types'].append({'set': DataSetType.ANCILLARY_DATA, 'child_record_search': None})

            if attr['name'] in clin_table_attr:
                attr['solr_collex'].append(SOLR_INDEX['clin'])
                attr['bq_tables'].append(BQ_TABLES['clin'])

            if attr['name'] in bios_table_attr:
                attr['solr_collex'].append(SOLR_INDEX['bios'])
                attr['bq_tables'].append(BQ_TABLES['bios'])

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
            elif attr['type'] == Attribute.CONTINUOUS_NUMERIC and 'range' not in attr:
                if attr['name'].lower() in ranges_needed:
                    attr['range'] = ranges.get(ranges_needed.get(attr['name'], ''), [])
                else:
                    attr['range'] = []

            attr_set.append(attr)

        attr_file.close()

        attr_file = open("tcia_attr.csv", "r")
        line_reader = attr_file.readlines()

        for line in line_reader:
            line = line.strip()
            line_split = line.split(",")

            if line_split[0] not in all_attrs:
                all_attrs[line_split[0]] = new_attribute(
                    line_split[0],
                    line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else line_split[1],
                    Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                    True if line_split[-1] == 'True' else False,
                    True
                )

            attr = all_attrs[line_split[0]]

            if attr['name'] != 'gcs_url':
                attr['solr_collex'].append(SOLR_INDEX['dicom_derived'])
            attr['bq_tables'].append(BQ_TABLES['dicom'])

            attr['set_types'].append({'set': DataSetType.IMAGE_DATA, 'child_record_search': 'StudyInstanceUID'})

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
                all_attrs[line_split[0]] = new_attribute(
                    line_split[0],
                    line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else line_split[1],
                    Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                    True if line_split[-1] == 'True' else False,
                    True
                )

            attr = all_attrs[line_split[0]]

            if attr['type'] == Attribute.CONTINUOUS_NUMERIC:
                attr['range'] = []

            attr['solr_collex'].append(SOLR_INDEX['dicom_derived'])
            attr['bq_tables'].append(BQ_TABLES['segs'])

            attr['set_types'].append({'set': DataSetType.DERIVED_DATA, 'child_record_search': 'StudyInstanceUID'})

            attr['categories'].append({'name': 'segmentation', 'display_name': 'Segmentation'})

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
                all_attrs[line_split[0]] = new_attribute(
                    line_split[0],
                    line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else line_split[1],
                    Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                    True if line_split[3] == 'True' else False,
                    True,
                    line_split[-1]
                )

            attr = all_attrs[line_split[0]]

            if attr['type'] == Attribute.CONTINUOUS_NUMERIC and 'range' not in attr:
                if attr['name'] in ranges_needed:
                    attr['range'] = ranges.get(ranges_needed.get(attr['name'], ''), [])
                else:
                    attr['range'] = []

            attr['solr_collex'].append(SOLR_INDEX['dicom_derived'])
            attr['bq_tables'].append(BQ_TABLES['quan'])

            attr['set_types'].append({'set': DataSetType.DERIVED_DATA, 'child_record_search': 'StudyInstanceUID'})

            attr['categories'].append({'name': 'quantitative', 'display_name': 'Quantitative Analysis'})

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
                all_attrs[line_split[0]] = new_attribute(
                    line_split[0],
                    line_split[0].replace("_", " ").title() if re.search(r'_', line_split[1]) else line_split[1],
                    Attribute.CATEGORICAL if line_split[2] == 'CATEGORICAL STRING' else Attribute.STRING if line_split[2] == "STRING" else Attribute.CONTINUOUS_NUMERIC,
                    True if line_split[-1] == 'True' else False,
                    True
                )

            attr = all_attrs[line_split[0]]

            if attr['type'] == Attribute.CONTINUOUS_NUMERIC:
                attr['range'] = []

            attr['solr_collex'].append(SOLR_INDEX['dicom_derived'])
            attr['bq_tables'].append(BQ_TABLES['qual'])

            attr['categories'].append({'name': 'qualitative', 'display_name': 'Qualitative Analysis'})

            attr['set_types'].append({'set': DataSetType.DERIVED_DATA, 'child_record_search': 'StudyInstanceUID'})

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
