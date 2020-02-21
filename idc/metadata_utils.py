#
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
#

import logging
import re
from idc_collections.models import SolrCollection, Attribute, Attribute_Display_Values, Program, DataVersion
from solr_helpers import *
from idc_collections.collex_metadata_utils import get_bq_metadata, get_bq_string
from django.conf import settings

logger = logging.getLogger('main_logger')


def getWithNullGuard(curDic, curKey, nullRet):
    if curKey in curDic:
        ret = curDic[curKey]
    else:
        ret = nullRet
    return ret

def translateCollectionData(solrArr, idcRetDic):

    idcRetDic['projects'] = []
    idcRetDic['projectIndex'] = {}
    idcRetDic['projectA'] = []
    idcRetDic['patientIndex'] = {}
    idcRetDic['patientProject'] = {}
    idcRetDic['studyIndex'] = {}
    idcRetDic['studyPatient'] = {}
    idcRetDic['seriesIndex'] = {}
    idcRetDic['seriesStudy'] = {}


    for i in range(len(solrArr)):
        curRow=solrArr[i]
        if (not 'collection_id' in curRow) or (not 'case_barcode' in curRow):
            continue
        projectId= curRow['collection_id'];
        patientId = curRow['case_barcode']
        studyId = curRow['StudyInstanceUID'];
        seriesId = curRow['SeriesInstanceUID'];

        curProject={}
        if not (projectId in idcRetDic['projectIndex']):
            idcRetDic['projectIndex'][projectId]=len(idcRetDic['projects'])
            idcRetDic['projectA'].append(projectId)
            curProject['id']=projectId
            curProject['patients'] = []
            curProject['isActive']=True
            curProject['numActivePatients']=0
            curProject['reasonsInActive']={}
            idcRetDic['projects'].append(curProject)

        else:
            curProject = idcRetDic['projects'][idcRetDic['projectIndex'][projectId]]

        curPatient = {}
        if not (patientId in idcRetDic['patientIndex']):
            curProject['numActivePatients'] = curProject['numActivePatients']+1
            idcRetDic['patientIndex'][patientId] = len(curProject['patients'])
            idcRetDic['patientProject'][patientId] = curProject['id']
            curPatient['id'] = patientId
            curPatient['isActive'] = True
            curPatient['numActiveStudies'] = 0
            curPatient['reasonsInActive'] = {}
            curPatient['studies'] = []
            curProject['patients'].append(curPatient)


        else:
            curPatient = curProject['patients'][idcRetDic['patientIndex'][patientId]]

        curStudy = {}

        if not(studyId in idcRetDic['studyIndex']):
            curPatient['numActiveStudies'] = curPatient['numActiveStudies'] + 1
            idcRetDic['studyIndex'][studyId] = len(curPatient['studies'])
            idcRetDic['studyPatient'][studyId] = curPatient['id']
            curStudy['id'] = studyId
            curStudy['isActive'] = True
            curStudy['reasonsInActive'] = {}
            curStudy['numActiveSeries'] = 0
            curStudy['seg'] = False
            curStudy['StudyDescription'] = getWithNullGuard(curRow,'StudyDescription','none')
            curStudy['StudyDate'] = getWithNullGuard(curRow, 'StudyDate', 'none')
            curStudy['series'] = []
            curPatient['studies'].append(curStudy)

        else:
            curStudy = curPatient['studies'][idcRetDic['studyIndex'][studyId]]

        curSeries = {}
        if not(seriesId in idcRetDic['seriesIndex']):
            idcRetDic['seriesIndex'][seriesId] = len(curStudy['series'])
            idcRetDic['seriesStudy'][seriesId] = curStudy['id']
            curStudy['numActiveSeries'] = curStudy['numActiveSeries'] +1;
            curSeries['id'] = seriesId
            curSeries['isActive'] = True
            curSeries['reasonsInActive'] = {}
            curSeries['Modality'] = getWithNullGuard(curRow, 'Modality', 'none')
            curSeries['BodyPartExamined'] = getWithNullGuard(curRow, 'BodyPartExamined', 'none')
            curSeries['SeriesNumber'] = getWithNullGuard(curRow, 'SeriesNumber', 'none')
            curStudy['series'].append(curSeries)


# Fetch metadata from Solr
def get_collex_metadata(filters, fields, with_docs=True, record_limit=10, counts_only=False, with_clinical = True, collapse_on = 'PatientID' ):
    try:
        results = {'docs': None, 'facets': {}}

        # TODO: This needs to be altered to accept settings on *which* image program/collection set and corresponding
        #  ancillary data it's querying, presumably as a list. That will take the place of the current name=<foo>
        #  search being used here; instead, it'll be id=<etc> Presumably this will come in from the request, based
        #  on the tab a user is looking at, or where they clicked the filter, etc.
        tcga_solr = SolrCollection.objects.get(name="tcga_clin_bios")
        tcia_solr = SolrCollection.objects.get(name="tcia_images")

        tcga_facet_attrs = tcga_solr.get_collection_attr().values_list('name', flat=True)
        tcga_filter_attrs = tcga_solr.get_collection_attr(for_faceting=False).values_list('name', flat=True)

        tcia_facet_attrs = tcia_solr.get_collection_attr().values_list('name', flat=True)

        solr_query = build_solr_query(filters, with_tags_for_ex=True)

        query_set = []

        # Image Data query
        if solr_query['queries'] is not None:
            for attr in solr_query['queries']:
                attr_name = re.sub("(_btw|_lt|_lte|_gt|_gte)", "", attr)
                if attr_name in tcga_filter_attrs:
                    query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                        tcga_solr.shared_id_col, tcga_solr.name, tcia_solr.shared_id_col
                    )) + solr_query['queries'][attr])
                else:
                    query_set.append(solr_query['queries'][attr])

        solr_facets = build_solr_facets(list(tcia_facet_attrs), solr_query['filter_tags'])

        solr_result = query_solr_and_format_result({
            'collection': tcia_solr.name,
            'fields': fields,
            'fqs': query_set,
            'query_string': "*:*",
            'facets': solr_facets,
            'limit': record_limit, #record_limit if with_docs else 0
            'collapse_on': collapse_on,
            'counts_only': counts_only
        })
        if not counts_only:
            if ('SeriesInstanceUID' in fields):
                results['docs'] = sorted(solr_result['docs'], key=lambda row: (row['collection_id'], row['PatientID'], row['StudyInstanceUID'], row['SeriesInstanceUID']))
            elif ('StudyInstanceUID' in fields):
                results['docs'] = sorted(solr_result['docs'], key=lambda row: (row['collection_id'], row['PatientID'], row['StudyInstanceUID']))
            else:
                results['docs'] = solr_result['docs']

        results['facets']['cross_collex'] = solr_result['facets']
        results['total'] = solr_result['numFound']

        if with_clinical:
            # The attributes being faceted against here would be whatever list of facet counts we want to display in the
            # UI (probably not ALL of them).
            #solr_facets = build_solr_facets(list(tcga_facet_attrs), solr_query['filter_tags'])
            #solr_facets = ["race", "vital_status", "ethnicity", "bmi", "age_at_diagnosis", "gender", "disease_code"]
            solr_facets= {"race": {"field": "race", "missing": True, "type": "terms", "limit": -1},"vital_status": {"field": "vital_status", "missing": True, "type": "terms", "limit": -1}, \
                    "ethnicity": {"field": "ethnicity", "missing": True, "type": "terms", "limit": -1}, \
                 "bmi": {"field": "bmi", "missing": True, "type": "terms", "limit": -1}, "age_at_diagnosis": {"field": "age_at_diagnosis", "missing": True, "type": "terms", "limit": -1}, \
                 "gender": {"field": "gender", "missing": True, "type": "terms", "limit": -1}, \
                 "disease_code": {"field": "disease_code", "missing": True, "type": "terms", "limit": -1} }
            query_set = []

            # Ancilary data faceting and querying
            if solr_query['queries'] is not None:
                for attr in solr_query['queries']:
                    attr_name = re.sub("(_btw|_lt|_lte|_gt|_gte)", "", attr)
                    if attr_name in tcia_facet_attrs:
                        query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                            tcia_solr.shared_id_col, tcia_solr.name, tcga_solr.shared_id_col
                        )) + solr_query['queries'][attr])
                    else:
                        query_set.append(solr_query['queries'][attr])



            solr_result = query_solr_and_format_result({
                'collection': tcga_solr.name,
                'fields': fields,
                'fqs': query_set,
                'query_string': "*:*",
                'facets': solr_facets,
                'limit': 0,
                'collapse_on': 'case_barcode',
                'counts_only': True
            })

            results['clinical'] = solr_result


    except Exception as e:
        logger.error("[ERROR] While fetching solr metadata:")
        logger.exception(e)

    return results


# Returns the Display settings for all attributes, or optionally an indicated set
# TODO: this is accepting names but going forward should require either PKs or ORM objects
# due to the possibility of name crossover
def get_display_settings(attrs=None):

    full_display = {}

    if not attrs:
        attr_obj = Attribute.objects.filter(active=True)
    else:
        attr_obj = Attribute.objects.filter(active=True, name__in=attrs)

    for attr in attr_obj:
        display = attr.get_display_values()
        if len(display.keys()):
            full_display[attr.id] = {
                'name': attr.name,
                'values': [
                    {'raw': x, 'display': display[x]} for x in display
                ]
            }

    return full_display
