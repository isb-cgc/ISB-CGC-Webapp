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
def get_collex_metadata(filters, fields, record_limit=1000, counts_only=False, with_ancillary = True,
                        collapse_on = 'PatientID', order_docs='[]', sources = None, versions = None, with_derived=True):

    try:
        source_type = sources.first().source_type if sources else DataSource.SOLR

        if not versions:
            versions = DataVersion.objects.filter(active=True)
        if not versions.first().active and not sources:
            source_type = DataSource.BIGQUERY

        sources = DataSource.objects.select_related('version').filter(
            version__in=versions, source_type=source_type
        ) if not sources else sources.select_related('version')

        # Only active data is available in Solr, not archived
        if len(versions.filter(active=False)) and len(sources.filter(source_type=DataSource.SOLR)):
            raise Exception("[ERROR] Can't request archived data from Solr, only BigQuery.")

        if source_type == DataSource.BIGQUERY:
            data_types = [DataVersion.IMAGE_DATA]
            if with_ancillary: data_types.append(DataVersion.ANCILLARY_DATA)
            if with_derived: data_types.append(DataVersion.DERIVED_DATA)

            sources = sources.filter(version__data_type__in=data_types)

            results = get_metadata_bq(filters, fields, {
                'filters': sources.get_source_attrs(for_ui=True, for_faceting=False),
                'facets': sources.get_source_attrs(for_ui=True),
                'fields': sources.get_source_attrs(for_faceting=False, named_set=fields)
            }, counts_only, collapse_on, record_limit)
        elif source_type == DataSource.SOLR:
            results = get_metadata_solr(filters, fields, sources, counts_only, collapse_on, record_limit)

        for source in results['facets'][DataVersion.SET_TYPES[DataVersion.IMAGE_DATA]]:
            facets = results['facets'][DataVersion.SET_TYPES[DataVersion.IMAGE_DATA]][source]['facets']
            if 'BodyPartExamined' in facets:
                if 'Kidney' in facets['BodyPartExamined']:
                    if 'KIDNEY' in facets['BodyPartExamined']:
                        facets['BodyPartExamined']['KIDNEY'] += facets['BodyPartExamined']['Kidney']
                    else:
                        facets['BodyPartExamined']['KIDNEY'] = facets['BodyPartExamined']['Kidney']
                    del facets['BodyPartExamined']['Kidney']

        if not counts_only:
            if 'SeriesNumber' in fields:
                for res in results['docs']:
                    res['SeriesNumber'] = res['SeriesNumber'][0] if 'SeriesNumber' in res else 'None'
            if len(order_docs):
                results['docs'] = sorted(results['docs'], key=lambda x: tuple([x[item] for item in order_docs]))

    except Exception as e:
        logger.error("[ERROR] While fetching metadata:")
        logger.exception(e)

    return results


def get_metadata_solr(filters, fields, sources, counts_only, collapse_on, record_limit):
    results = {'docs': None, 'facets': {}}

    attrs_for_faceting = sources.get_source_attrs(for_ui=True)
    all_ui_attrs = sources.get_source_attrs(for_ui=True, for_faceting=False)
    # Eventually this will need to go per program
    for source in sources:
        joined_origin = False
        if source.version.get_set_type() not in results['facets']:
            results['facets'][source.version.get_set_type()] = {}
        solr_query = build_solr_query(filters, with_tags_for_ex=True) if filters else None
        solr_facets = build_solr_facets(attrs_for_faceting['sources'][source.id]['attrs'],
                                        filter_tags=solr_query['filter_tags'] if solr_query else None,
                                        unique=source.shared_id_col)

        query_set = []

        if solr_query:
            for attr in solr_query['queries']:
                attr_name = re.sub("(_btw|_lt|_lte|_gt|_gte)", "", attr)
                # If an attribute from the filters isn't in the attribute listing, just warn and continue
                if attr_name in all_ui_attrs['list']:
                    # If the attribute is from this source, just add the query
                    if attr_name in all_ui_attrs['sources'][source.id]['list']:
                        query_set.append(solr_query['queries'][attr])
                    # If it's in another source for this program, we need to join on that source
                    else:
                        for ds in sources:
                            if ds.id != source.id and attr_name in all_ui_attrs['sources'][ds.id]['list']:
                                if source.version.data_type != DataVersion.IMAGE_DATA and not joined_origin and ds.version.data_type == DataVersion.IMAGE_DATA:
                                    joined_origin = True
                                query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                                    ds.shared_id_col, ds.name, source.shared_id_col
                                )) + solr_query['queries'][attr])
                else:
                    logger.warning("[WARNING] Attribute {} not found in data sources {}".format(attr_name, ", ".join(list(sources.values_list('name',flat=True)))))

        if not joined_origin:
            ds = sources.filter(version__data_type=DataVersion.IMAGE_DATA).first()
            query_set.append(("{!join %s}" % "from={} fromIndex={} to={}".format(
                ds.shared_id_col, ds.name, source.shared_id_col
            ))+"*:*")

        solr_result = query_solr_and_format_result({
            'collection': source.name,
            'facets': solr_facets,
            'fqs': query_set,
            'query_string': None,
            'limit': 0,
            'counts_only': True,
            'fields': None
        })

        if source.version.data_type == DataVersion.IMAGE_DATA:
            results['facets'][source.version.get_set_type()][source.id] = {'facets': solr_result['facets']}
            if not counts_only:
                solr_result = query_solr_and_format_result({
                    'collection': source.name,
                    'fields': list(fields),
                    'fqs': query_set,
                    'query_string': None,
                    'collapse_on': collapse_on,
                    'counts_only': counts_only,
                    'limit': record_limit
                })
                results['docs'] = solr_result['docs']
                results['total'] = solr_result['numFound']
        else:
            results['total'] = solr_result['numFound']
            results['facets'][source.version.get_set_type()]["{}:{}".format(source.name, source.version.name)] = {'facets': solr_result['facets']}

    return results


def get_metadata_bq(filters, fields, sources_and_attrs, counts_only, collapse_on, record_limit):
    results = {'docs': None, 'facets': {}}

    try:
        res = get_bq_facet_counts(filters, None, None, sources_and_attrs)
        results['facets'] = res['facets']
        results['total'] = res['facets']['total']

        if not counts_only:
            docs = get_bq_metadata(filters, fields, None, sources_and_attrs, [collapse_on], record_limit)
            doc_result_schema = {i: x['name'] for i,x in enumerate(docs['schema']['fields'])}

            results['docs'] = [{
                doc_result_schema[i]: y['v'] for i,y in enumerate(x['f'])
            } for x in docs['results'] ]

    except Exception as e:
        logger.error("[ERROR] During BQ facet and doc fetching:")
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
