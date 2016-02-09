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

import MySQLdb

from django.conf import settings

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import DataTypes, BigQuerySchemaToValueTypeConverter
from bq_data_access.feature_data_provider import FeatureDataProvider
from bq_data_access.utils import DurationLogged

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
        logging.debug(str([bq_table, column_name, study_id, is_numeric, filters]))
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
        logging.debug("UserFeatureDef.from_user_feature_id {0}".format(str([feature_id])))
        # ID breakdown: Study ID:Feature ID
        # Example ID: USER:1:6
        regex = re_compile("^USER:"
                           # Study ID
                           "([0-9]+):"
                           # Feature ID
                           "([0-9]+)$"
                           )

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        study_id, user_feature_id = feature_fields[0]
        #study_id = feature_fields[0]
        #user_feature_id = feature_fields[1]
        bq_id = None
        shared_id = None
        is_numeric = False

        try:
            db = sql_connection()
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
            return cls.from_feature_id(bq_id, study_id)

        if bq_id is None:
            raise FeatureNotFoundException(feature_id)

        # Else we're querying a very specific feature from a specific study
        bq_table, column_name, symbol = cls.get_table_and_field(bq_id)
        if bq_table is None or column_name is None:
            raise FeatureNotFoundException(feature_id)

        logging.debug("{0} {1} {2}".format(bq_table, column_name, symbol))

        filters = None
        if symbol is not None:
            filters = {
                'Symbol': symbol
            }

        return [cls(bq_table, column_name, study_id, is_numeric, filters)]

    @classmethod
    def from_feature_id(cls, feature_id, study_id=None):
        logging.debug("UserFeatureDef.from_feature_id: {0}".format(str([feature_id, study_id])))
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
                #logging.debug("UserFeatureDef.from_feature_id results: {0}".format(str([bq_table, column_name, symbol])))
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
        logging.debug("USER DEF QUERY: {0}".format(query))
        return query


class UserFeatureProvider(FeatureDataProvider):
    def __init__(self, feature_id, user_feature_id=None, **kwargs):
        self.parse_internal_feature_id(feature_id, user_feature_id=user_feature_id)
        super(UserFeatureProvider, self).__init__(**kwargs)

    def get_feature_type(self):
        return DataTypes.USER

    @classmethod
    def convert_user_feature_id(cls, feature_id):
        bq_id = None
        logging.debug("{0}".format(feature_id.split(':')[-1]))
        try:
            db = sql_connection()
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

            logging.debug("UserFeatureProvider.convert_user_feature_id {0} -> {1}".format(feature_id, bq_id))
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
        logging.debug("UserFeatureProvider.build_query: {0}".format(str([study_ids, cohort_id_array, cohort_dataset, cohort_table])))
        queries = []
        cohort_table_full = settings.BIGQUERY_PROJECT_NAME + ':' + cohort_dataset + '.' + cohort_table
        logging.debug("# feature defs: {0}".format(str(len(self.feature_defs))))
        for feature_def in self.feature_defs:
            if int(feature_def.study_id) in study_ids:
                logging.debug("       building query for study_id {0}".format(str(feature_def.study_id)))
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

    @DurationLogged('USER', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        """
        Unpacks values from a BigQuery response object into a flat array. The array will contain dicts with
        the following fields:
        - 'patient_id': Patient barcode
        - 'sample_id': Sample barcode
        - 'aliquot_id': Aliquot barcode
        - 'value': Value of the selected column from the user data table(s)

        Args:
            query_result_array: A BigQuery query response object

        Returns:
            Array of dict objects.
        """
        result = []

        for row in query_result_array:
            result.append({
                'patient_id': row['f'][0]['v'],
                'sample_id': row['f'][1]['v'],
                'aliquot_id': row['f'][2]['v'],
                'value': row['f'][3]['v']
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

    def get_study_ids(self, cohort_id_array, cohort_dataset, cohort_table):
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

        return study_ids

    def parse_internal_feature_id(self, feature_id, user_feature_id=None):
        if user_feature_id is None or user_feature_id is '':
            logging.debug("UserFeatureProvider.parse_internal_feature_id -      feature_id: {0}".format(feature_id))
            self.feature_defs = UserFeatureDef.from_feature_id(feature_id)
        else:
            logging.debug("UserFeatureProvider.parse_internal_feature_id - user_feature_id: {0}".format(user_feature_id))
            self.feature_defs = UserFeatureDef.from_user_feature_id(user_feature_id)

    def submit_query_and_get_job_ref(self, project_id, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        study_ids = self.get_study_ids(cohort_id_array, cohort_dataset, cohort_table)

        bigquery_service = self.get_bq_service()

        #def build_query(self, study_ids, cohort_id_array, cohort_dataset, cohort_table):
        #query_body = self.build_query(project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array)
        query_body = self.build_query(study_ids, cohort_id_array, cohort_dataset, cohort_table)
        query_job = self.submit_bigquery_job(bigquery_service, project_id, query_body)

        # Poll for completion of the query
        self.job_reference = query_job['jobReference']
        job_id = query_job['jobReference']['jobId']
        logging.debug("JOBID {id}".format(id=job_id))

        return self.job_reference


    def get_data_job_reference(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2

        result = self.submit_query_and_get_job_ref(project_id, project_name, dataset_name, None,
                                                   None, cohort_dataset, cohort_table, cohort_id_array)
        return result

    @classmethod
    def is_valid_feature_id(cls, feature_id):
        is_valid = False
        try:
            UserFeatureDef.from_feature_id(feature_id)
            is_valid = True
        except Exception:
            # GEXPFeatureDef.from_feature_id raises Exception if the feature identifier
            # is not valid. Nothing needs to be done here, since is_valid is already False.
            pass
        finally:
            return is_valid
