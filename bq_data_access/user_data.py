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

import logging
from re import compile as re_compile

from api.api_helpers import authorize_credentials_with_Google, sql_connection
from api.schema.tcga_clinical import schema as clinical_schema

import MySQLdb

from django.conf import settings

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import DataTypes, BigQuerySchemaToValueTypeConverter
import sys

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
    def __init__(self, bq_table, column_name, study_id, is_numeric, filters):
        self.bq_table = bq_table
        self.column_name = column_name
        self.study_id = study_id
        self.filters = filters
        self.type = "STRING" if is_numeric else "FLOAT"

    @classmethod
    def get_table_and_field(cls, bq_id):

        split = bq_id.split(':')
        # First pieces are the project:dataset:table
        bq_table = split[0] + ':' + split[1] + '.' + split[2]
        # Last piece is the column name
        column_name = bq_id.split(':')[-1]

        # Is only symbol at the moment
        symbol = None
        if len(split) > 3:
            symbol = split[3]

        return bq_table, column_name, symbol

    @classmethod
    def from_user_feature_id(cls, feature_id):
        # ID breakdown: Study ID:Feature ID
        # Example ID: USER:1:6
        regex = re_compile("^USER:"
                           # Study ID
                           "([0-9]+)$"
                           # Feature ID
                           "([0-9]+)$"
                           )

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        study_id = feature_fields[0]
        user_feature_id = feature_fields[1]
        bq_id = None
        shared_id = None
        is_numeric = False

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute("""
                SELECT feature_name, bq_map_id, shared_map_id, is_numeric
                FROM projects_user_feature_definitions
                WHERE id = %d
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
            return cls.from_feature_id(bq_id, study_id)

        if bq_id is None:
            raise FeatureNotFoundException(feature_id)

        # Else we're querying a very specific feature from a specific study
        bq_table, column_name, symbol = cls.get_table_and_field(bq_id)
        if bq_table is None or column_name is None:
            raise FeatureNotFoundException(feature_id)

        filters = None
        if symbol is not None:
            filters = {
                'Symbol': symbol
            }

        return [cls(bq_table, column_name, study_id, is_numeric, filters)]

    @classmethod
    def from_feature_id(cls, feature_id, study_id=None):
        if feature_id is None:
            raise FeatureNotFoundException(feature_id)

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute("""
                SELECT bq_map_id, study_id, is_numeric
                FROM projects_user_feature_definitions
                WHERE shared_map_id = %s
            """, (feature_id,))

            results = []
            for row in cursor.fetchall():
                bq_table, column_name, symbol = cls.get_table_and_field(row['bq_map_id'])
                filters = None
                if symbol is not None:
                    filters = {
                        'Symbol': symbol
                    }
                results.append(cls(bq_table, column_name, row['study_id'], row['is_numeric'] == 1, filters))

            cursor.close()
            db.close()

            return results

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    def build_query(self, cohort_table, cohort_ids):
        cohort_str = ",".join([str(cohort_id) for cohort_id in cohort_ids])
        query =  """
            SELECT t.sample_barcode, t.{column_name}
            FROM [{table_name}] AS t
            JOIN [{cohort_table}] AS c
              ON c.sample_id = t.sample_barcode
            WHERE
              c.study_id = {study_id}
              AND c.cohort_id IN ({cohort_list})
        """.format(column_name=self.column_name, table_name=self.bq_table, cohort_table=cohort_table,
                   study_id=self.study_id, cohort_list=cohort_str)

        if self.filters is not None:
            for key, val in self.filters.items():
                query += ' AND t.{filter_key} = "{value}" '.format(filter_key=key, value=val)

        query += ' GROUP BY t.sample_barcode ' # To prevent duplicates from multiple cohorts

        return query


class UserFeatureProvider(object):
    def __init__(self, feature_id, user_feature_id=None):
        self.parse_internal_feature_id(feature_id)

    def get_feature_type(self):
        return DataTypes.USER

    @classmethod
    def convert_user_feature_id(cls, feature_id):
        bq_id = None
        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute("""
                SELECT feature_name, bq_map_id, shared_map_id
                FROM projects_user_feature_definitions
                WHERE id = %d
            """, (feature_id.split(':')[-1],))
            for row in cursor.fetchall():
                bq_id = row["shared_map_id"]

            cursor.close()
            db.close()

            return bq_id

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def get_value_type(self):
        if len(self.feature_defs) > 0:
            return self.feature_defs[0].type
        return "Unknown"

    def build_query(self, study_ids, cohort_id_array, cohort_dataset, cohort_table):
        queries = []
        cohort_table_full = settings.BIGQUERY_PROJECT_NAME + ':' + cohort_dataset + '.' + cohort_table
        for feature_def in self.feature_defs:
            if feature_def.study_id in study_ids:
                # Build our query
                queries.append(feature_def.build_query(cohort_table_full, cohort_id_array))

        query = ' UNION '.join(queries)
        logging.info("BQ_QUERY_USER: " + query)
        return query

    def do_query(self, study_ids, cohort_id_array, cohort_dataset, cohort_table):
        bigquery_service = authorize_credentials_with_Google()
        query = self.build_query(study_ids, cohort_id_array, cohort_dataset, cohort_table)

        if query is '':
            # No matching features <=> study data; Return
            return []

        query_body = {
            'query': query
        }

        print >> sys.stderr, "RUNNING QUERY: " + str(query)
        table_data = bigquery_service.jobs()
        query_response = table_data.query(projectId=settings.BQ_PROJECT_ID, body=query_body).execute()

        result = []
        num_result_rows = int(query_response['totalRows'])
        if num_result_rows == 0:
            return result

        for row in query_response['rows']:
            result.append({
                'patient_id': None,
                'sample_id': row['f'][0]['v'],
                'aliquot_id': None,
                'value': row['f'][1]['v']
            })

        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        # NOTE: We ignore cohort info here because we will be pull from a specified location
        study_ids = ()
        for cohort_id in cohort_id_array:
            try:
                db = sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)

                cursor.execute("SELECT study_id FROM cohorts_samples WHERE cohort_id = %s GROUP BY study_id", (cohort_id,))
                for row in cursor.fetchall():
                    if row['study_id'] is None:
                        include_tcga = True
                    else:
                        study_ids += (row['study_id'],)

            except Exception as e:
                if db: db.close()
                if cursor: cursor.close()
                raise e

        result = self.do_query(study_ids, cohort_id_array, cohort_dataset, cohort_table)
        return result

    def parse_internal_feature_id(self, feature_id, user_feature_id=None):
        if user_feature_id is None or user_feature_id is '':
            self.feature_defs = UserFeatureDef.from_feature_id(feature_id)
        else:
            self.feature_defs = UserFeatureDef.from_user_feature_id(user_feature_id)
