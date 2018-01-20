"""

Copyright 2017, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

from collections import defaultdict
from copy import deepcopy
import logging as logger

from MySQLdb.cursors import DictCursor
from _mysql_exceptions import MySQLError
from bq_data_access.v2.feature_search.common import BackendException, InvalidFieldException, EmptyQueryException
from bq_data_access.v2.feature_search.common import FOUND_FEATURE_LIMIT
from bq_data_access.v2.methylation_data import METH_FEATURE_TYPE
from cohorts.metadata_helpers import get_sql_connection


class METHSearcher(object):
    feature_search_valid_fields = set(['gene_name', 'probe_name', 'platform', 'relation_to_gene', 'relation_to_island', 'genomic_build'])
    field_search_valid_fields = set(['gene_name', 'probe_name'])

    searchable_fields = [
        {
            'name': 'gene_name',
            'label': 'Gene',
            'static': False
        },
        {
            'name': 'probe_name',
            'label': 'CpG Probe',
            'static': False
        },
        {
            'name': 'platform',
            'label': 'Platform',
            'static': True,
            'values': ['HumanMethylation27', 'HumanMethylation450']
        },
        {
            'name': 'relation_to_gene',
            'label': 'Gene region',
            'static': True, 'values': ['Body', '5\'UTR', '1stExon', 'TSS200', 'TSS1500', '3\'UTR']
        },
        {
            'name': 'relation_to_island',
            'label': 'CpG Island region',
            'static': True, 'values': ['Island', 'N_Shelf', 'N_Shore', 'S_Shore', 'S_Shelf']
        },
        {
            'name': 'genomic_build',
            'label': 'Genomic Build',
            'static': True,
            'values': ['hg19', 'hg38']
        }
    ]

    @classmethod
    def get_searchable_fields(cls):
        return deepcopy(cls.searchable_fields)

    @classmethod
    def get_datatype_identifier(cls):
        return METH_FEATURE_TYPE

    @classmethod
    def get_table_name(cls):
        return "feature_defs_meth_v2"

    def validate_field_search_input(self, keyword, field):
        if field not in self.field_search_valid_fields:
            raise InvalidFieldException("METH", keyword, field)

    def field_value_search(self, keyword, field):
        self.validate_field_search_input(keyword, field)

        query = 'SELECT DISTINCT {search_field} FROM {table_name} WHERE {search_field} LIKE %s LIMIT %s'.format(
            table_name=self.get_table_name(),
            search_field=field
        )
        # Format the keyword for MySQL string matching
        sql_keyword = '%' + keyword + '%'
        query_args = [sql_keyword, FOUND_FEATURE_LIMIT]

        try:
            db = get_sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(query_args))
            items = []

            for row in cursor.fetchall():
                items.append(row[field])

            return items

        except MySQLError as mse:
            logger.exception(mse)
            raise BackendException('database error: ' + str(mse))

    def validate_feature_search_input(self, parameters):
        # Check that the input contains only allowed fields
        for field, keyword in parameters.iteritems():
            if field not in self.feature_search_valid_fields:
                raise InvalidFieldException(", ".join([self.get_datatype_identifier(), field, keyword]))

        # At least one field has to have a non-empty keyword
        found_field = False
        for field, keyword in parameters.iteritems():
            if len(keyword) > 0:
                found_field = True
                continue

        if not found_field:
            raise EmptyQueryException(self.get_datatype_identifier())

    def build_feature_label(self, row):
        # Example: 'Methylation | Build:hg19, Probe:cg07311521, Gene:EGFR, Gene Region:TSS1500, Relation to CpG Island:Island, Platform:HumanMethylation450, Value:beta_value'
        # If value is not present, display '-'
        if row['gene_name'] is '':
            row['gene_name'] = "-"
            row['relation_to_gene'] = "-"
        if row['relation_to_island'] is '':
            row['relation_to_island'] = "-"

        label = "Methylation | Build:{build_id}, Probe:{probe_name}, Gene:{gene_label}" \
                ", Gene Region:{relation_to_gene}, CpG Island Region:{relation_to_island}" \
                ", Platform:{platform}, Value:{value_field}".format(
                    build_id=row['genomic_build'],
                    probe_name=row['probe_name'],
                    gene_label=row['gene_name'],
                    relation_to_gene=row['relation_to_gene'],
                    relation_to_island=row['relation_to_island'],
                    platform=row['platform'],
                    value_field=row['value_field']
                )
        return label

    def search(self, parameters):
        self.validate_feature_search_input(parameters)

        query = 'SELECT gene_name, probe_name, platform, relation_to_gene, relation_to_island, ' \
                       'value_field, genomic_build, internal_feature_id ' \
                'FROM {table_name} ' \
                'WHERE gene_name=%s ' \
                'AND probe_name LIKE %s ' \
                'AND platform LIKE %s ' \
                'AND relation_to_gene LIKE %s ' \
                'AND relation_to_island LIKE %s ' \
                'AND genomic_build=%s' \
                'LIMIT %s'.format(table_name=self.get_table_name()
        )

        # Fills in '' for fields that were not specified in the parameters
        input = defaultdict(lambda: '', parameters)

        # Format the keyword for MySQL string matching
        query_args = [input['gene_name'],
                      '%' + input['probe_name'] + '%',
                      '%' + input['platform'] + '%',
                      '%' + input['relation_to_gene'] + '%',
                      '%' + input['relation_to_island'] + '%',
                      input['genomic_build'],
                      FOUND_FEATURE_LIMIT]

        try:
            db = get_sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(query_args))
            items = []

            for row in cursor.fetchall():
                items.append(row)

            # Generate human readable labels
            for item in items:
                item['feature_type'] = METH_FEATURE_TYPE
                item['label'] = self.build_feature_label(item)

            return items

        except MySQLError as mse:
            logger.exception(mse)
            raise BackendException('database error')