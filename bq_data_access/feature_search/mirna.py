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

from api.api_helpers import sql_connection

from bq_data_access.feature_search.common import FOUND_FEATURE_LIMIT
from bq_data_access.feature_search.common import BackendException, InvalidFieldException

from bq_data_access.mirna_data import build_feature_label, MIRN_FEATURE_TYPE


class MIRNSearcher(object):
    search_fields = set(['mirna_name', 'platform', 'value_field'])

    @classmethod
    def get_table_name(cls):
        return "feature_defs_mirn"

    def validate_search_field(self, keyword, field):
        if field not in self.search_fields:
            raise InvalidFieldException("MIRN", keyword, field)

    def search(self, keyword, field):
        self.validate_search_field(keyword, field)

        query = 'SELECT mirna_name, platform, value_field, internal_feature_id ' \
                'FROM {table_name} WHERE {search_field} LIKE %s LIMIT %s'.format(
            table_name=self.get_table_name(),
            search_field=field
        )

        # Format the keyword for MySQL string matching
        sql_keyword = '%' + keyword + '%'
        query_args = [sql_keyword, FOUND_FEATURE_LIMIT]

        try:
            db = sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(query_args))
            items = []

            for row in cursor.fetchall():
                items.append(row)

            # Generate human readable labels
            for item in items:
                item['feature_type'] = MIRN_FEATURE_TYPE
                item['label'] = build_feature_label(item)

            return items

        except MySQLError:
            raise BackendException('database error', keyword, field)



