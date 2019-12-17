#
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
#

from builtins import str
from builtins import object
import logging
from re import compile as re_compile

from cohorts.metadata_helpers import get_sql_connection

import MySQLdb

from django.conf import settings

from bq_data_access.v1.feature_value_types import ValueType

from bq_data_access.v1.errors import FeatureNotFoundException
from bq_data_access.v1.feature_value_types import DataTypes
from bq_data_access.v1.feature_data_provider import FeatureDataProvider
from bq_data_access.v1.utils import DurationLogged

USER_FEATURE_TYPE = 'USER'


class InvalidUserFeatureIDException(Exception):
    def __init__(self, feature_id, reason):
        self.feature_id = feature_id
        self.reason = reason

    def __str__(self):
        return "Invalid feature ID '{feature_id}', reason '{reason}'".format(
            feature_id=self.feature_id,
            reason=self.reason
        )


class UserFeatureDef(object):
    def __init__(self, bq_table, column_name, project_id, is_numeric, filters):
        logger.debug(str([bq_table, column_name, project_id, is_numeric, filters]))
        self.bq_table = bq_table
        self.column_name = column_name
        self.project_id = project_id
        self.filters = filters
        self.bq_row_id = None
        self.type = "STRING" if is_numeric else "FLOAT"

    def get_value_type(self):
        if self.type == "STRING":
            return ValueType.STRING
        else:
            return ValueType.FLOAT

    @classmethod
    def get_table_and_field(cls, bq_id):
        split = bq_id.split(':')
        # First pieces are the project:dataset:table:Data_type:symbol:column_name
        bq_table = split[0] + ':' + split[1] + '.' + split[2]
        # Last piece is the column name
        column_name = bq_id.split(':')[-1]

        # Is only symbol at the moment
        symbol = None
        if len(split) > 5:
            symbol = split[4]

        return bq_table, column_name, symbol

    @classmethod
    def from_user_feature_id(cls, feature_id):
        logger.debug("UserFeatureDef.from_user_feature_id {0}".format(str([feature_id])))
        # ID breakdown: project ID:Feature ID
        # Example ID: USER:1:6
        regex = re_compile("^USER:"
                           # project ID
                           "([0-9]+):"
                           # Feature ID
                           "([0-9]+)$"
                           )

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        project_id, user_feature_id = feature_fields[0]
        bq_id = None
        shared_id = None
        is_numeric = False

        try:
            db = get_sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute("""
                SELECT feature_name, bq_map_id, shared_map_id, is_numeric
                FROM projects_user_feature_definitions
                WHERE id = %s
            """, (user_feature_id,))
            for row in cursor.fetchall():
                if row['shared_map_id']:
                    shared_id = row['shared_map_id']
                bq_id = row["bq_map_id"]
                is_numeric = row['is_numeric'] == 1

            cursor.close()
            db.close()

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

        if shared_id is not None:
            return cls.from_feature_id(bq_id, project_id)

        if bq_id is None:
            raise FeatureNotFoundException(feature_id)

        # Else we're querying a very specific feature from a specific project
        bq_table, column_name, symbol = cls.get_table_and_field(bq_id)
        if bq_table is None or column_name is None:
            raise FeatureNotFoundException(feature_id)

        logger.debug("{0} {1} {2}".format(bq_table, column_name, symbol))

        filters = None
        if symbol is not None:
            filters = {
                'Symbol': symbol
            }

        return [cls(bq_table, column_name, project_id, is_numeric, filters)]

    @classmethod
    def from_feature_id(cls, feature_id, project_id=None):
        logger.debug("UserFeatureDef.from_feature_id: {0}".format(str([feature_id, project_id])))
        if feature_id is None:
            raise FeatureNotFoundException(feature_id)
        # ID breakdown: project ID:Feature ID
        # Example ID: USER:1:6
        regex = re_compile("^USER:"
                           # project ID
                           "([0-9]+):"
                           # Feature ID
                           "([0-9]+)$"
                           )

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        project_id, user_feature_id = feature_fields[0]


        try:
            db = get_sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute("""
                SELECT bq_map_id, project_id, is_numeric
                FROM projects_user_feature_definitions
                WHERE id = %s
            """, (user_feature_id,))

            results = []
            for row in cursor.fetchall():
                bq_table, column_name, symbol = cls.get_table_and_field(row['bq_map_id'])
                filters = None
                if symbol is not None:
                    filters = {
                        'Symbol': symbol
                    }
                results.append(cls(bq_table, column_name, row['project_id'], row['is_numeric'] == 1, filters))

            cursor.close()
            db.close()

            return results

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    def unpack_value_from_bigquery_row(self, bq_row):
        return bq_row['f'][self.bq_row_id + 2]['v']

    def build_query(self, cohort_table, cohort_ids, project_id_array):

        cohort_str = ",".join([str(cohort_id) for cohort_id in cohort_ids])
        project_id_stmt = ''
        if project_id_array is not None and len(project_id_array):
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

        query_template =  "SELECT {fdef_id} AS fdef_id, t.sample_barcode, t.{column_name} FROM [{table_name}] AS t " \
                          "JOIN [{cohort_table}] AS c ON c.sample_barcode = t.sample_barcode " \
                          "WHERE c.cohort_id IN ({cohort_list}) AND (c.project_id IS NULL"


        query_template += (" OR c.project_id IN ({project_id_list}))" if project_id_array is not None and len(project_id_array) else ")")
        query = query_template.format(fdef_id=self.bq_row_id,
                              column_name=self.column_name,
                              table_name=self.bq_table,
                              cohort_table=cohort_table,
                              cohort_list=cohort_str,
                              project_id_list=project_id_stmt)

        if self.filters is not None:
            for key, val in list(self.filters.items()):
                query += ' AND t.{filter_key} = "{value}" '.format(filter_key=key, value=val)

                query += " GROUP BY t.sample_barcode, t.{column_name} ".format(column_name=self.column_name) # To prevent duplicates from multiple cohorts
        return query


class UserFeatureProvider(FeatureDataProvider):
    """
    Feature data provider for user data.
    """
    def __init__(self, feature_id, user_feature_id=None, **kwargs):
        self.feature_defs = None
        self.parse_internal_feature_id(feature_id, user_feature_id=user_feature_id)
        self._project_ids = None
        super(UserFeatureProvider, self).__init__(**kwargs)

    def get_feature_type(self):
        return DataTypes.USER

    @classmethod
    def convert_user_feature_id(cls, feature_id):
        bq_id = None
        try:
            db = get_sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute("""
                SELECT feature_name, bq_map_id, shared_map_id
                FROM projects_user_feature_definitions
                WHERE id = %s
            """, (int(feature_id.split(':')[-1]),))
            for row in cursor.fetchall():
                bq_id = row["shared_map_id"]

            cursor.close()
            db.close()

            logger.debug("UserFeatureProvider.convert_user_feature_id {0} -> {1}".format(feature_id, bq_id))
            return bq_id

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def get_value_type(self):
        return self.feature_defs[0].get_value_type()

    def build_query(self, project_ids, cohort_id_array, cohort_dataset, cohort_table, project_id_array):
        """
        Builds the BigQuery query string for USER data. The query string is constructed from one or more data sources
        (queries), such that each associated UserFeatureDef instance constructs one data source. Each data source
        selects one column from a user data table, and therefore maps to one column in the query result.

        The query result table contains a column ("fdef_id") that identifies which data source (UserFeatureDef instance)
        that produced each row.

        When unpacking the query result table, the decoding of each row is delegated to the a UserFeatureDef instance
        identified by the "fdef_id" column value in that row.

        Example of a query result table:

            |-------+--------------+--------+--------+--------|
            |fdef_id|sample_barcode|column_0|column_1|column_n|
            |-------+--------------+--------+--------+--------|
            |0      |barcode_1     |<val>   |null    |null    |
            |0      |barcode_2     |<val>   |null    |null    |
            |0      |...           |<val>   |null    |null    |
            |0      |barcode_m     |<val>   |null    |null    |
            |-------+--------------+--------+--------+--------|
            |1      |barcode_1     |null    |<val>   |null    |
            |1      |barcode_2     |null    |<val>   |null    |
            |1      |...           |null    |<val>   |null    |
            |1      |barcode_m     |null    |<val>   |null    |
            |-------+--------------+--------+--------+--------|
            |n      |barcode_1     |null    |null    |<val>   |
            |n      |barcode_2     |null    |null    |<val>   |
            |n      |...           |null    |null    |<val>   |
            |n      |barcode_m     |null    |null    |<val>   |
            |-------+--------------+--------+--------+--------|

        Returns: BigQuery query string.

        """
        queries = []
        cohort_table_full = settings.BIGQUERY_PROJECT_ID + ':' + cohort_dataset + '.' + cohort_table
        # TODO: this is a hack to append project_ids to the tcga project id list. project_id_array is actually empty.
        project_id_array += project_ids
        for feature_def in self.feature_defs:
            if int(feature_def.project_id) in project_ids:
                # Build our query
                queries.append(feature_def.build_query(cohort_table_full, cohort_id_array, project_id_array))

        # Create a combination query using the UNION ALL operator. Each data source defined above (query1, query2, ...)
        # will be combined as follows:
        #
        # (query 1)
        #  ,
        # (query 2)
        #  ,
        #  ...
        #  ,
        # (query n)
        #
        query = ' , '.join(['(' + query + ')' for query in queries])
        logger.info("BQ_QUERY_USER: " + query)
        return query

    def unpack_value_from_row_with_feature_def(self, row):
        """
        Decodes the value from a query result.

        Delegates the selection and decoding of the correct column in the row to the UserFeatureDef instance
        identified by the "fdef_id" column on the row.

        Args:
            row: BigQuery query result row.

        Returns: The value for the row.

        """
        feature_def_index = int(row['f'][0]['v']) # fdef_id
        feature_def = self.feature_defs[feature_def_index]

        return feature_def.unpack_value_from_bigquery_row(row)

    @DurationLogged('USER', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array.

        Args:
            query_result_array: A BigQuery query response object

        Returns:
            Array of dict objects.
        """
        result = []

        for row in query_result_array:
            result.append({
                'case_id': None,
                'sample_id': row['f'][1]['v'],
                'aliquot_id': None,
                'value': self.unpack_value_from_row_with_feature_def(row)
            })

        return result

    def get_project_ids(self, cohort_id_array):
        """
        Returns: The user project identifiers associated with the samples in all given cohorts.
        """
        if self._project_ids is not None:
            return self._project_ids

        project_ids = ()
        for cohort_id in cohort_id_array:
            try:
                db = get_sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)

                cursor.execute("SELECT project_id FROM cohorts_samples WHERE cohort_id = %s GROUP BY project_id", (cohort_id,))
                for row in cursor.fetchall():
                    if row['project_id'] is not None:
                        project_ids += (row['project_id'],)

            except Exception as e:
                if db: db.close()
                if cursor: cursor.close()
                raise e

        self._project_ids = project_ids
        return self._project_ids

    def parse_internal_feature_id(self, feature_id, user_feature_id=None):
        if user_feature_id is None or user_feature_id is '':
            logger.debug("UserFeatureProvider.parse_internal_feature_id - feature_id: {0}".format(feature_id))
            self.feature_defs = UserFeatureDef.from_feature_id(feature_id)
        else:
            logger.debug("UserFeatureProvider.parse_internal_feature_id - user_feature_id: {0}".format(user_feature_id))
            self.feature_defs = UserFeatureDef.from_user_feature_id(user_feature_id)

        # Assign a unique identifier to all feature defs.
        # TODO document
        for index, feature_def in enumerate(self.feature_defs):
            feature_def.bq_row_id = index

    def _submit_query_and_get_job_ref(self, project_id, project_name, dataset_name, cohort_dataset, cohort_table, cohort_id_array, project_id_array):
        project_ids = self.get_project_ids(cohort_id_array)

        bigquery_service = self.get_bq_service()

        query_body = self.build_query(project_ids, cohort_id_array, cohort_dataset, cohort_table, project_id_array)
        query_job = self.submit_bigquery_job(bigquery_service, project_id, query_body)

        self.job_reference = query_job['jobReference']

        return self.job_reference

    def is_queryable(self, cohort_id_array):
        """
        Answers if this instance would submit a BigQuery job if the submit_query_and_get_job_ref member function
        was called.
        """
        project_ids = self.get_project_ids(cohort_id_array)
        queryable = False

        for feature_def in self.feature_defs:
            if int(feature_def.project_id) in project_ids:
                queryable = True
                break

        return queryable

    def get_data_job_reference(self, cohort_id_array, cohort_dataset, cohort_table, project_id_array):
        project_id = settings.BIGQUERY_PROJECT_ID
        project_name = settings.BIGQUERY_DATA_PROJECT_ID
        dataset_name = settings.BIGQUERY_DATASET_V1

        result = self._submit_query_and_get_job_ref(project_id, project_name, dataset_name,
                                                    cohort_dataset, cohort_table, cohort_id_array, project_id_array)
        return result

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            UserFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception:
            # UserFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
