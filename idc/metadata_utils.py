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

from idc_collections.models import SolrCollection, Attribute, Program
from solr_helpers import *
from google_helpers.bigquery.bq_support import BigQuerySupport
from django.conf import settings

logger = logging.getLogger('main_logger')

def getWithNullGuard(curDic, curKey, nullRet):
    if curKey in curDic:
        ret = curDic[curKey]
    else:
        ret = nullRet
    return ret

# Fetch metadata from Solr
def get_collex_metadata(filters, fields, with_docs=True):
    results = {'docs': None, 'facets': {}}

    # TODO: This needs to be altered to accept settings on *which* image program/collection set and corresponding ancillary data it's querying
    # That will take the place of the current name=<foo> search being used here; instead, it'll be id=<etc>
    # Presumably this will come in from the request, based on the tab a user is looking at, or where they clicked the filter, etc.
    tcga_facet_attrs = SolrCollection.objects.get(name="tcga_clin_bios").get_collection_attr().values_list('name', flat=True)
    tcia_facet_attrs = SolrCollection.objects.get(name="tcia_images").get_collection_attr().values_list('name', flat=True)

    solr_query = build_solr_query(filters, with_tags_for_ex=True)
    query_set = []

    if solr_query['queries'] is not None:
        for attr in solr_query['queries']:
            if attr in tcga_facet_attrs:
                query_set.append("{!join from=case_barcode fromIndex=tcga_clin_bios to=case_barcode}" + solr_query['queries'][attr])
            else:
                query_set.append(solr_query['queries'][attr])

    solr_facets = build_solr_facets(list(tcia_facet_attrs), solr_query['filter_tags'])

    solr_result = query_solr_and_format_result({
        'collection': 'tcia_images',
        'fields': fields,
        'fqs': query_set,
        'query_string': "*:*",
        'facets': solr_facets,
        'limit': record_limit if with_docs else 0,
        # what is with_docs supposed to do?? 'limit': 10 if with_docs else 0,
        'collapse_on': 'SeriesInstanceUID',
        'counts_only': counts_only
    })
    if (not(counts_only)):
        results['docs'] = solr_result['docs']
    results['facets']['cross_collex'] = solr_result['facets']
    results['total'] = solr_result['numFound']

    # The attributes being faceted against here would be whatever list of facet counts we want to display in the
    # UI (probably not ALL of them).
    solr_facets = build_solr_facets(list(["vital_status","sample_type"]), solr_query['filter_tags'])


    solr_facets = build_solr_facets(list(["vital_status","race", "vital_status", "ethnicity", "bmi", "age_at_diagnosis","gender", "disease_code"]), solr_query['filter_tags'])
    #solr_facets = build_solr_facets(list(tcia_facet_attrs), solr_query['filter_tags'])
    query_set = []
    if solr_query['queries'] is not None:
        for attr in solr_query['queries']:
            if attr in tcia_facet_attrs:
                query_set.append("{!join from=case_barcode fromIndex=tcia_images to=case_barcode}" + solr_query['queries'][attr])
            else:
                query_set.append(solr_query['queries'][attr])


    solr_result = query_solr_and_format_result({
        'collection': 'tcga_clin_bios',
        'fields': fields,
        'fqs': query_set,
        'query_string': "*:*",
        'facets': solr_facets,
        'limit': record_limit,
        'collapse_on': 'case_barcode',
        'counts_only': True
    })


    results['clinical'] = solr_result

    get_bq_metadata(filters, fields)

    return results


# Fetch meta from BigQuery
def get_bq_metadata(filters, fields, programs=None):
    results = {}
    filter_attr_by_bq = {}
    field_attr_by_bq = {}

    query_base = """
        SELECT {field_clause}
        FROM {table_clause} 
        {join_clause}
        {where_clause}
    """

    join_clause_base = """
        JOIN {filter_table} {filter_alias}
        ON {field_alias}.{field_join_id} = {filter_alias}.{filter_join_id}
    """

    filter_attrs = Attribute.objects.filter(active=True, name__in=list(filters.keys()))
    field_attrs = Attribute.objects.filter(active=True, name__in=fields)

    table_info = {}

    for attr in filter_attrs:
        bqtables = attr.bq_tables.all().filter(version__active=True).distinct()
        for bqtable in bqtables:
            if bqtable.name not in filter_attr_by_bq:
                filter_attr_by_bq[bqtable.name] = {}
                table_info[bqtable.name] = {
                    'id_col': bqtable.shared_id_col
                }
                alias = bqtable.name.split(".")[-1].lower().replace("-", "_")
                table_info[bqtable.name]['alias'] = alias
                filter_attr_by_bq[bqtable.name]['attrs'] = [attr.name]
            else:
                filter_attr_by_bq[bqtable.name]['attrs'].append(attr.name)

    for attr in field_attrs:
        bqtables = attr.bq_tables.all().filter(version__active=True, ).distinct()
        for bqtable in bqtables:
            if bqtable.name not in field_attr_by_bq:
                field_attr_by_bq[bqtable.name] = {}
                field_attr_by_bq[bqtable.name]['attrs'] = [attr.name]
                table_info[bqtable.name] = {
                    'id_col': bqtable.shared_id_col
                }
                alias = bqtable.name.split(".")[-1].lower().replace("-", "_")
                table_info[bqtable.name]['alias'] = alias
            else:
                field_attr_by_bq[bqtable.name]['attrs'].append(attr.name)

    filter_clauses = {}
    field_clauses = {}

    for bqtable in filter_attr_by_bq:
        filter_set = {x: filters[x] for x in filters if x in filter_attr_by_bq[bqtable]['attrs']}
        filter_clauses[bqtable] = BigQuerySupport.build_bq_where_clause(filter_set, field_prefix=table_info[bqtable]['alias'])

    for bqtable in field_attr_by_bq:
        alias = table_info[bqtable]['alias']
        field_clauses[bqtable] = ",".join(["{}.{}".format(alias, x) for x in field_attr_by_bq[bqtable]['attrs']])

    for_union = []

    for field_bqtable in field_attr_by_bq:
        for filter_bqtable in filter_attr_by_bq:
            join_clause = join_clause_base.format(
                field_alias=table_info[field_bqtable]['alias'],
                field_join_id=table_info[field_bqtable]['id_col'],
                filter_alias=table_info[filter_bqtable]['alias'],
                filter_table=filter_bqtable,
                filter_join_id=table_info[filter_bqtable]['id_col']
            )
            for_union.append(query_base.format(
                field_clause=field_clauses[field_bqtable],
                table_clause="{} {}".format(field_bqtable, table_info[field_bqtable]['alias']),
                join_clause=join_clause,
                where_clause="WHERE {}".format(filter_clauses[filter_bqtable]) if filters else "")
            )

    print("""UNION ALL""".join(for_union))

    return results
