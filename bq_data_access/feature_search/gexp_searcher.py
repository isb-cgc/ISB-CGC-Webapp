"""

Copyright 2015, Institute for Systems Biology

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

from MySQLdb.cursors import DictCursor
from _mysql_exceptions import MySQLError

from copy import deepcopy
from collections import defaultdict

import logging

from api.api_helpers import sql_connection
from bq_data_access.feature_search.common import FOUND_FEATURE_LIMIT
from bq_data_access.feature_search.common import BackendException, InvalidFieldException, EmptyQueryException

from bq_data_access.gexp_data import GEXP_FEATURE_TYPE


class GEXPSearcher(object):
    feature_search_valid_fields = set(['gene_name', 'platform', 'center'])
    field_search_valid_fields = set(['gene_name'])

    searchable_fields = [
        {'name': 'gene_name',
         'label': 'Gene',
         'static': False},
        {'name': 'platform',
         'label': 'Platform',
         'static': True,
         'values': ['Illumina GA', 'Illumina HiSeq']},
        {'name': 'center',
         'label': 'Center',
         'static': True, 'values': ['BCGSC', 'UNC']}
    ]

    @classmethod
    def get_searchable_fields(cls):
        return deepcopy(cls.searchable_fields)

    @classmethod
    def get_datatype_identifier(cls):
        return GEXP_FEATURE_TYPE

    @classmethod
    def get_table_name(cls):
        return "feature_defs_gexp"

    def validate_field_search_input(self, keyword, field):
        if field not in self.field_search_valid_fields:
            raise InvalidFieldException("GEXP: '%s', '%s'", keyword, field)

    def field_value_search(self, keyword, field):
        self.validate_field_search_input(keyword, field)

        query = 'SELECT DISTINCT {search_field} FROM {table_name} WHERE {search_field} LIKE %s LIMIT %s'.format(
            table_name=self.get_table_name(),
            search_field=field
        )
        # Format the keyword for MySQL string matching
        sql_keyword = '%' + keyword + '%'
        query_args = [sql_keyword, FOUND_FEATURE_LIMIT]
        logging.debug("CLOUDSQL_QUERY_GEXP_FIELDS: {}".format(query))

        try:
            db = sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(query_args))
            items = []

            for row in cursor.fetchall():
                items.append(row[field])

            return items

        except MySQLError as mse:
            raise BackendException("MySQLError: {}".format(str(mse)))

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

    def build_feature_label(self, gene, info):
        # print info
        # Example: 'EGFR mRNA (Illumina HiSeq, UNC RSEM)'
        label = gene + " mRNA (" + info['platform'] + ", " + info['center'] + " " + info['value_label'] + ")"
        return label

    def search(self, parameters):
        self.validate_feature_search_input(parameters)

        query = 'SELECT gene_name, platform, center, value_label, internal_feature_id' \
                ' FROM {table_name}' \
                ' WHERE gene_name LIKE %s'\
                ' AND platform LIKE %s' \
                ' AND center LIKE %s'\
                ' LIMIT %s'.format(table_name=self.get_table_name()
        )
        logging.debug("CLOUDSQL_QUERY_GEXP_SEARCH: {}".format(query))

        # Fills in '' for fields that were not specified in the parameters
        input = defaultdict(lambda: '', parameters)

        # Format the keyword for MySQL string matching
        # sql_keyword = '%' + keyword + '%'
        query_args = ['%' + input['gene_name'] + '%',
                      '%' + input['platform'] + '%',
                      '%' + input['center'] + '%',
                      FOUND_FEATURE_LIMIT]

        try:
            db = sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(query_args))
            items = []

            for row in cursor.fetchall():
                items.append(row)

            # Generate human readable labels
            for item in items:
                item['feature_type'] = GEXP_FEATURE_TYPE
                item['label'] = self.build_feature_label(item['gene_name'], item)

            return items

        except MySQLError as mse:
            raise BackendException("MySQLError: {}".format(str(mse)))

