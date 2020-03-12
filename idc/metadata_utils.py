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
from idc_collections.models import DataSource, Attribute, Attribute_Display_Values, Program, DataVersion
from solr_helpers import *
from idc_collections.collex_metadata_utils import get_bq_metadata, get_bq_facet_counts
from django.conf import settings

logger = logging.getLogger('main_logger')


def retTuple(x, order_docs):
    tlist = []
    for field in order_docs:
        if field in x:
            tlist.push(x[field])
    return tuple(tlist)


# Fetch metadata from Solr
def get_collex_metadata(filters, fields, record_limit=10, counts_only=False, with_clinical = True, collapse_on = 'PatientID', order_docs='[]' ):
    try:
        results = {'docs': None, 'facets': {}}

        # TODO: This needs to be altered to accept settings on *which* image program/collection set and corresponding
        #  ancillary data it's querying, presumably as a list. That will take the place of the current name=<foo>
        #  search being used here; instead, it'll be id=<etc> Presumably this will come in from the request, based
        #  on the tab a user is looking at, or where they clicked the filter, etc.
        tcga_solr = DataSource.objects.get(name="tcga_clin_bios")
        tcia_solr = DataSource.objects.get(name="tcia_images")

        tcga_facet_attrs = tcga_solr.get_collection_attr(for_ui=True).values_list('name', flat=True)
        tcga_filter_attrs = tcga_solr.get_collection_attr(for_faceting=False).values_list('name', flat=True)

        tcia_facet_attrs = tcia_solr.get_collection_attr(for_ui=True).values_list('name', flat=True)
        tcia_filter_attrs = tcia_solr.get_collection_attr(for_faceting=False).values_list('name', flat=True)

        solr_query = None
        if len(filters):
            solr_query = build_solr_query(filters, with_tags_for_ex=True)

        # For now we're query filtering on TCGA only
        # TODO: REMOVE THIS ONCE WE'RE ALLOWING MORE
        tcga_in_tcia = Program.objects.get(short_name="TCGA").collection_set.all()
        query_filter = {
            'collection_id': [x.lower().replace("-","_") for x in list(tcga_in_tcia.values_list('name', flat=True))]
        }
        tcga_query_filter = build_solr_query(query_filter)

        query_set = []

        # Image Data query
        if solr_query and solr_query['queries'] is not None:
            for attr in solr_query['queries']:
                attr_name = re.sub("(_btw|_lt|_lte|_gt|_gte)", "", attr)
                if attr_name in tcga_filter_attrs:
                    query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                        tcga_solr.shared_id_col, tcga_solr.name, tcia_solr.shared_id_col
                    )) + solr_query['queries'][attr])
                else:
                    query_set.append(solr_query['queries'][attr])
        else:
            query_set.append("{!join %s}" % "from={} fromIndex={} to={}".format(
                tcga_solr.shared_id_col, tcga_solr.name, tcia_solr.shared_id_col
            ))

        solr_facets = build_solr_facets(list(tcia_facet_attrs), solr_query['filter_tags'] if solr_query else None)

        solr_result = query_solr_and_format_result({
            'collection': tcia_solr.name,
            'fields': fields,
            'fqs': query_set,
            'query_string': tcga_query_filter['full_query_str'],
            'facets': solr_facets,
            'limit': record_limit,
            'collapse_on': collapse_on,
            'counts_only': counts_only
        })
        if not counts_only:
            results['docs'] = solr_result['docs']
            if 'SeriesNumber' in fields:
                for res in results['docs']:
                    res['SeriesNumber'] = res['SeriesNumber'][0]
            if (len(order_docs)>0):
                results['docs'] = sorted(results['docs'], key=lambda x: tuple([x[item] for item in order_docs]))


        results['facets']['cross_collex'] = solr_result['facets']
        if 'BodyPartExamined' in solr_result['facets']:
            if 'Kidney' in results['facets']['cross_collex']['BodyPartExamined'] and 'KIDNEY' in results['facets']['cross_collex']['BodyPartExamined']:
                results['facets']['cross_collex']['BodyPartExamined']['KIDNEY'] = results['facets']['cross_collex']['BodyPartExamined']['KIDNEY'] + results['facets']['cross_collex']['BodyPartExamined']['Kidney']
                del results['facets']['cross_collex']['BodyPartExamined']['Kidney']
            elif 'Kidney' in results['facets']['cross_collex']['BodyPartExamined']:
                results['facets']['cross_collex']['BodyPartExamined']['KIDNEY'] = results['facets']['cross_collex']['BodyPartExamined']['Kidney']
                del results['facets']['cross_collex']['BodyPartExamined']['Kidney']


        results['total'] = solr_result['numFound']

        if with_clinical:
            # The attributes being faceted against here would be whatever list of facet counts we want to display in the
            # UI (probably not ALL of them).
            solr_facets = build_solr_facets(list(tcga_facet_attrs), solr_query['filter_tags'])

            query_set = []
            joined = False
            # Ancilary data faceting and querying
            if solr_query['queries'] is not None:
                for attr in solr_query['queries']:
                    attr_name = re.sub("(_btw|_lt|_lte|_gt|_gte)", "", attr)
                    if attr_name in tcia_filter_attrs:
                        query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                            tcia_solr.shared_id_col, tcia_solr.name, tcga_solr.shared_id_col
                        )) + solr_query['queries'][attr])
                        joined = True
                    else:
                        query_set.append(solr_query['queries'][attr])

            if not joined:
                query_set.append("{!join %s}*:*" % "from={} fromIndex={} to={}".format(
                    tcia_solr.shared_id_col, tcia_solr.name, tcga_solr.shared_id_col
                ))

            # Fields is hardlocked to None for all Ancillary data because we don't display them,
            # we only faceted count
            solr_result = query_solr_and_format_result({
                'collection': tcga_solr.name,
                'fields': None,
                'fqs': query_set,
                'query_string': "*:*",
                'facets': solr_facets,
                'limit': 0,
                'collapse_on': tcga_solr.shared_id_col,
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
