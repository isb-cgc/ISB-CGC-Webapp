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

import logging as logger
from collections import defaultdict
from copy import deepcopy

from MySQLdb.cursors import DictCursor
from _mysql_exceptions import MySQLError
from bq_data_access.v2.feature_search.common import BackendException, InvalidFieldException, EmptyQueryException
from bq_data_access.v2.feature_search.common import FOUND_FEATURE_LIMIT
from bq_data_access.v2.mirna_data import MIRN_FEATURE_TYPE
from cohorts.metadata_helpers import get_sql_connection


class MIRNSearcher(object):
    feature_search_valid_fields = set(['mirna_name', 'genomic_build'])
    field_search_valid_fields = set(['mirna_name'])

    searchable_fields = [
        {
            'name': 'mirna_name',
            'label': 'miRNA Name',
            'static': False
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
        return MIRN_FEATURE_TYPE

    @classmethod
    def get_table_name(cls):
        return "feature_defs_mirn_v3"

    def validate_field_search_input(self, keyword, field):
        if field not in self.field_search_valid_fields:
            raise InvalidFieldException("MIRN", keyword, field)

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
        # Example: 'MicroRNA | Build:hg19, miRNA Name:hsa-mir-126, Value:RPM'
        # TODO: Get "value" for label from table configuration.
        label = "MicroRNA | Build:{build_id}, miRNA Name:{mirna_name}, Value:RPM".format(
            build_id=row['genomic_build'],
            mirna_name=row['mirna_name']
        )

        return label

    def search(self, parameters):
        self.validate_feature_search_input(parameters)

        query = 'SELECT mirna_name, genomic_build, internal_feature_id ' \
                'FROM {table_name} ' \
                'WHERE mirna_name LIKE %s ' \
                'AND genomic_build=%s' \
                'LIMIT %s'.format(table_name=self.get_table_name()
        )
        # Fills in '' for fields that were not specified in the parameters
        input = defaultdict(lambda: '', parameters)

        # Format the keyword for MySQL string matching
        query_args = ['%' + input['mirna_name'] + '%',
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
                item['feature_type'] = MIRN_FEATURE_TYPE
                item['label'] = self.build_feature_label(item)

            return items

        except MySQLError as mse:
            logger.exception(mse)
            raise BackendException('database error')