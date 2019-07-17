###
# Copyright 2015-2019, Institute for Systems Biology
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

from builtins import str
from builtins import object
from collections import defaultdict
from copy import deepcopy

from MySQLdb.cursors import DictCursor
from _mysql_exceptions import MySQLError
from bq_data_access.v2.feature_search.common import BackendException, InvalidFieldException, EmptyQueryException
from bq_data_access.v2.feature_search.common import FOUND_FEATURE_LIMIT
from bq_data_access.v2.gnab_data import GNAB_FEATURE_TYPE
from cohorts.metadata_helpers import get_sql_connection


class GNABSearcher(object):
    feature_search_valid_fields = set(['gene_name', 'value_field', 'genomic_build'])
    field_search_valid_fields = set(['gene_name'])

    searchable_fields = [
        {
            'name': 'gene_name',
            'label': 'Gene',
            'static': False
        },
        {
            'name': 'value_field',
            'label': 'Value',
            'static': True,
            'values': ['variant_classification', 'variant_type', 'num_mutations']
        },
        {
            'name': 'genomic_build',
            'label': 'Genomic Build',
            'static': True,
            'values': ['hg19']
        }
    ]

    @classmethod
    def get_searchable_fields(cls):
        return deepcopy(cls.searchable_fields)

    @classmethod
    def get_datatype_identifier(cls):
        return GNAB_FEATURE_TYPE

    @classmethod
    def get_table_name(cls):
        return "feature_defs_gnab_v2"

    def validate_field_search_input(self, keyword, field):
        if field not in self.field_search_valid_fields:
            raise InvalidFieldException("GNAB", keyword, field)

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
            raise BackendException('database error: ' + str(mse))

    def validate_feature_search_input(self, parameters):
        # Check that the input contains only allowed fields
        for field, keyword in parameters.items():
            if field not in self.feature_search_valid_fields:
                raise InvalidFieldException(", ".join([self.get_datatype_identifier(), field, keyword]))

        # At least one field has to have a non-empty keyword
        found_field = False
        for field, keyword in parameters.items():
            if len(keyword) > 0:
                found_field = True
                continue

        if not found_field:
            raise EmptyQueryException(self.get_datatype_identifier())

    def build_feature_label(self, row):
        # Example: 'Mutation | Build:hg19, Gene:EGFR, Value:variant_classification'
        label = "Mutation | Build:" + row['genomic_build'] + ", Gene:" + row['gene_name'] + ", Value:" + row['value_field']
        return label

    def search(self, parameters):
        self.validate_feature_search_input(parameters)

        query = 'SELECT gene_name, genomic_build, value_field, internal_feature_id' \
                ' FROM {table_name}' \
                ' WHERE gene_name=%s' \
                ' AND genomic_build=%s' \
                ' AND value_field LIKE %s' \
                ' LIMIT %s'.format(table_name=self.get_table_name()
        )

        # Fills in '' for fields that were not specified in the parameters
        input = defaultdict(lambda: '', parameters)

        # Format the keyword for MySQL string matching
        # sql_keyword = '%' + keyword + '%'
        query_args = [input['gene_name'],
                      input['genomic_build'],
                      '%' + input['value_field'] + '%',
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
                item['feature_type'] = GNAB_FEATURE_TYPE
                item['label'] = self.build_feature_label(item)

            return items

        except MySQLError as mse:
            raise BackendException('database error')

