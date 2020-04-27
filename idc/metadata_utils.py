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
def get_collex_metadata(filters, fields, record_limit=10, counts_only=False, with_ancillary = True,
                        collapse_on = 'PatientID', order_docs='[]', sources = None, versions = None):

    try:
        #source_type = sources.first().source_type if sources else DataSource.SOLR
        source_type = DataSource.BIGQUERY

        if not versions:
            versions = DataVersion.objects.filter(active=True)
        if not versions.first().active and not sources:
            source_type = DataSource.BIGQUERY

        if not sources:
            sources = DataSource.objects.select_related('version').filter(version__in=versions, source_type=source_type)

        # Only active data is available in Solr, not archived
        if not versions.first().active and sources.first().source_type == DataSource.SOLR:
            raise Exception("[ERROR] Can't request archived data from Solr, only BigQuery.")

        # Split these into source version type
        image_sources = sources.filter(version__data_type=DataVersion.IMAGE_DATA)
        ancillary_sources = sources.filter(version__data_type=DataVersion.ANCILLARY_DATA)

        ancillary_facet_attrs = ancillary_sources.get_source_attrs(for_ui=True)
        ancillary_filter_attrs = ancillary_sources.get_source_attrs(for_faceting=False)
        image_facet_attrs = image_sources.get_source_attrs(for_ui=True)
        image_filter_attrs = image_sources.get_source_attrs(for_faceting=False)

        image_fields = [x for x in fields if x in image_filter_attrs['list']]

        if source_type == DataSource.BIGQUERY:
            results = get_metadata_bq(filters, image_fields, {
                'img': {
                    'src': image_sources,
                    'filters': image_filter_attrs,
                    'facets': image_facet_attrs
                },
                'anc': {
                    'src': ancillary_sources,
                    'filters': ancillary_filter_attrs,
                    'facets': ancillary_facet_attrs
                }
            }, counts_only, with_ancillary, collapse_on, record_limit, order_docs)
        elif source_type == DataSource.SOLR:
            results = get_metadata_solr(filters, image_fields, {
                'img': {
                    'src': image_sources,
                    'filters': image_filter_attrs,
                    'facets': image_facet_attrs
                },
                'anc': {
                    'src': ancillary_sources,
                    'filters': ancillary_filter_attrs,
                    'facets': ancillary_facet_attrs
                }
            }, counts_only, with_ancillary, collapse_on, record_limit, order_docs)

        if 'BodyPartExamined' in results['facets']['cross_collex']:
            if 'Kidney' in results['facets']['cross_collex']['BodyPartExamined'] and 'KIDNEY' in \
                    results['facets']['cross_collex']['BodyPartExamined']:
                results['facets']['cross_collex']['BodyPartExamined']['KIDNEY'] = \
                results['facets']['cross_collex']['BodyPartExamined']['KIDNEY'] + \
                results['facets']['cross_collex']['BodyPartExamined']['Kidney']
                del results['facets']['cross_collex']['BodyPartExamined']['Kidney']
            elif 'Kidney' in results['facets']['cross_collex']['BodyPartExamined']:
                results['facets']['cross_collex']['BodyPartExamined']['KIDNEY'] = \
                results['facets']['cross_collex']['BodyPartExamined']['Kidney']
                del results['facets']['cross_collex']['BodyPartExamined']['Kidney']

        if 'SeriesNumber' in fields:
            for res in results['docs']:
                res['SeriesNumber'] = res['SeriesNumber'][0]
        if (len(order_docs) > 0):
            results['docs'] = sorted(results['docs'], key=lambda x: tuple([x[item] for item in order_docs]))

    except Exception as e:
        logger.error("[ERROR] While fetching solr metadata:")
        logger.exception(e)

    return results


def get_metadata_solr(filters, fields, sources_and_attrs, counts_only, with_ancillary, collapse_on, record_limit):
    results = {'docs': None, 'facets': {}}

    ancillary_sources = sources_and_attrs['anc']['src']
    ancillary_facet_attrs = sources_and_attrs['anc']['facets']
    ancillary_filter_attrs = sources_and_attrs['anc']['filters']
    image_sources = sources_and_attrs['img']['src']
    image_facet_attrs = sources_and_attrs['img']['facets']
    image_filter_attrs = sources_and_attrs['img']['filters']

    solr_query = None
    if len(filters):
        solr_query = build_solr_query(filters, with_tags_for_ex=True)

    # For now we're query filtering on TCGA only
    # TODO: REMOVE THIS ONCE WE'RE ALLOWING MORE
    tcga_in_tcia = Program.objects.get(short_name="TCGA").collection_set.all()
    query_filter = {
        'collection_id': [x.lower().replace("-", "_") for x in list(tcga_in_tcia.values_list('name', flat=True))]
    }
    tcga_query_filter = build_solr_query(query_filter, with_tags_for_ex=True)

    query_set = []

    # We only have one image source right now (TCIA) but theoretically we may have more
    for img_src in image_sources:

        # Image Data query
        if solr_query and solr_query['queries'] is not None:
            for attr in solr_query['queries']:
                attr_name = re.sub("(_btw|_lt|_lte|_gt|_gte)", "", attr)
                if attr_name in ancillary_filter_attrs['list']:
                    for source in ancillary_filter_attrs['sources']:
                        if attr_name in ancillary_filter_attrs['sources'][source]['attrs']:
                            ds = ancillary_filter_attrs['sources'][source]
                            query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                                ds['shared_id_col'], ds['name'], img_src.shared_id_col
                            )) + solr_query['queries'][attr])
                elif attr_name in image_filter_attrs['list'] and attr_name in image_filter_attrs['sources'][img_src.id][
                    'attrs']:
                    query_set.append(solr_query['queries'][attr])
        else:
            # This is forcing all faceted counting to be against an ancillary set, i.e., doesn't allow non-TCGA for the moment
            query_set.append("{!join %s}" % "from={} fromIndex={} to={}".format(
                ancillary_sources.first().shared_id_col, ancillary_sources.first().name, img_src.shared_id_col
            ))

        solr_facets = build_solr_facets(list(image_facet_attrs['sources'][img_src.id]['attrs']),
                                        solr_query['filter_tags'] if solr_query else None, unique='PatientID')

        # Collapse and unique faceted counting can't be used together, so we have to request twice - once to collapse on the requested
        # field and once to faceted count
        solr_counts = query_solr_and_format_result({
            'collection': img_src.name,
            'fields': None,
            'fqs': query_set,
            'query_string': tcga_query_filter['full_query_str'],
            'facets': solr_facets,
            'limit': 0,
            'counts_only': counts_only,
            'unique': img_src.shared_id_col
        })

        if not counts_only:
            solr_result = query_solr_and_format_result({
                'collection': img_src.name,
                'fields': fields,
                'fqs': query_set,
                'query_string': tcga_query_filter['full_query_str'],
                'collapse_on': collapse_on,
                'counts_only': counts_only,
                'limit': record_limit
            })
            results['docs'] = solr_result['docs']
            results['total'] = solr_result['numFound']
        else:
            results['total'] = solr_counts['numFound']

        if with_ancillary:
            results['clinical'] = {}
            # The attributes being faceted against here would be whatever list of facet counts we want to display in the
            # UI (probably not ALL of them).
            for anc_source in ancillary_sources:
                solr_facets = build_solr_facets(list(ancillary_facet_attrs['sources'][anc_source.id]['attrs']),
                                                solr_query['filter_tags'])
                query_set = []
                joined = []
                # Ancilary data faceting and querying
                if solr_query['queries'] is not None:
                    for attr in solr_query['queries']:
                        attr_name = re.sub("(_btw|_lt|_lte|_gt|_gte)", "", attr)
                        if attr_name in image_filter_attrs['list']:
                            for source in image_filter_attrs['sources']:
                                if attr_name in image_filter_attrs['sources'][source]['attrs']:
                                    ds = image_filter_attrs['sources'][source]
                                    query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                                        ds['shared_id_col'], ds['name'], anc_source.shared_id_col
                                    )) + solr_query['queries'][attr])
                                    joined.append(source)
                        elif attr_name not in ancillary_filter_attrs['sources'][anc_source.id]['attrs']:
                            for source in ancillary_filter_attrs['sources']:
                                if source != anc_source.id and attr_name in ancillary_filter_attrs['sources'][source][
                                    'attrs']:
                                    ds = ancillary_filter_attrs['sources'][source]
                                    query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                                        ds['shared_id_col'], ds['name'], anc_source.shared_id_col
                                    )) + solr_query['queries'][attr])
                                    joined.append(source)
                        else:
                            query_set.append(solr_query['queries'][attr])

                # Make sure we only look at ancillary data which is related to image data
                for source in image_sources:
                    if source.id not in joined:
                        query_set.append("{!join %s}*:*" % "from={} fromIndex={} to={}".format(
                            source.shared_id_col, source.name, anc_source.shared_id_col
                        ))

                # Fields is hardlocked to None for all Ancillary data because we don't display them,
                # we only faceted count
                solr_result = query_solr_and_format_result({
                    'collection': anc_source.name,
                    'fields': None,
                    'fqs': query_set,
                    'query_string': "*:*",
                    'facets': solr_facets,
                    'limit': 0,
                    'collapse_on': anc_source.shared_id_col,
                    'counts_only': True,
                    'unique': anc_source.shared_id_col
                })

                results['clinical']["{}:{}".format(anc_source.name, anc_source.version.name)] = solr_result

    return results


def get_metadata_bq(filters, fields, sources_and_attrs, counts_only, with_ancillary, collapse_on, record_limit):
    results = {'docs': None, 'facets': {}}

    facet_counts = get_bq_facet_counts(filters, None, None, sources_and_attrs)

    if not counts_only:
        docs = get_bq_metadata(filters, fields, None, sources_and_attrs, collapse_on, record_limit)




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
