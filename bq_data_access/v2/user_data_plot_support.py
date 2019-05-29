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

from builtins import str
import logging

from django.conf import settings
from MySQLdb.cursors import DictCursor

from bq_data_access.v2.feature_id_utils import FeatureProviderFactory
from bq_data_access.v2.user_data import UserDataQueryHandler
from bq_data_access.v2.data_access import submit_tcga_job, get_submitted_job_results

from cohorts.metadata_helpers import get_sql_connection
from google_helpers.bigquery.service import get_bigquery_service


def user_feature_handler(feature_id, cohort_id_array):
    include_tcga = False
    user_studies = ()
    for cohort_id in cohort_id_array:
        try:
            db = get_sql_connection()
            cursor = db.cursor(DictCursor)

            cursor.execute("SELECT project_id FROM cohorts_samples WHERE cohort_id = %s GROUP BY project_id", (cohort_id,))
            for row in cursor.fetchall():
                if row['project_id'] is None:
                    include_tcga = True
                else:
                    user_studies += (row['project_id'],)

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    user_feature_id = None
    if feature_id.startswith('USER:'):
        # Try and convert it with a shared ID to a TCGA queryable id
        user_feature_id = feature_id
        feature_id = UserDataQueryHandler.convert_feature_id(feature_id)
        if feature_id is None:
            # Querying user specific data, don't include TCGA
            include_tcga = False

    return {
        'converted_feature_id': feature_id,
        'include_tcga': include_tcga,
        'user_studies': user_studies,
        'user_feature_id': user_feature_id
    }


def submit_jobs_with_user_data(params_array):
    bigquery_service = get_bigquery_service()
    provider_array = []

    cohort_settings = settings.GET_BQ_COHORT_SETTINGS()

    # Submit jobs
    for parameter_object in params_array:
        feature_id = parameter_object.feature_id
        cohort_id_array = parameter_object.cohort_id_array

        user_data = user_feature_handler(feature_id, cohort_id_array)

        if user_data['include_tcga']:
            job_item = submit_tcga_job(parameter_object, bigquery_service, cohort_settings)
            provider_array.append(job_item)

        if len(user_data['user_studies']) > 0:
            converted_feature_id = user_data['converted_feature_id']
            user_feature_id = user_data['user_feature_id']
            logging.debug("user_feature_id: {0}".format(user_feature_id))
            provider = UserDataQueryHandler(converted_feature_id, user_feature_id=user_feature_id)

            # The UserDataQueryHandler instance might not generate a BigQuery query and job at all given the combination
            # of cohort(s) and feature identifiers. The provider is not added to the array, and therefore to the
            # polling loop below, if it would not submit a BigQuery job.
            if provider.is_queryable(cohort_id_array):
                job_reference = provider.get_data_job_reference(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)

                logging.info("Submitted USER {job_id}: {fid} - {cohorts}".format(job_id=job_reference['jobId'], fid=feature_id,
                                                                                 cohorts=str(cohort_id_array)))
                provider_array.append({
                    'feature_id': feature_id,
                    'provider': provider,
                    'ready': False,
                    'job_reference': job_reference['job_reference'],
                    'tables_used': job_reference['tables_queried']
                })
            else:
                logging.debug("No UserFeatureDefs for '{0}'".format(converted_feature_id))

    return provider_array


# This code was part of the V1 data_access code, pulled out of V2 data_access.py, and only used in
# the V1 Pairwise analysis.

def get_feature_vector(feature_id, cohort_id_array):
    include_tcga = False
    user_studies = ()
    for cohort_id in cohort_id_array:
        try:
            db = get_sql_connection()
            cursor = db.cursor(DictCursor)

            cursor.execute("SELECT project_id FROM cohorts_samples WHERE cohort_id = %s GROUP BY project_id", (cohort_id,))
            for row in cursor.fetchall():
                if row['project_id'] is None:
                    include_tcga = True
                else:
                    user_studies += (row['project_id'],)

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    #  ex: feature_id 'CLIN:Disease_Code'
    user_feature_id = None
    if feature_id.startswith('USER:'):
        # Try and convert it with a shared ID to a TCGA queryable id
        user_feature_id = feature_id
        feature_id = UserDataQueryHandler.convert_user_feature_id(feature_id)
        if feature_id is None:
            # Querying user specific data, don't include TCGA
            include_tcga = False

    items = []
    type = None
    result = []
    cohort_settings = settings.GET_BQ_COHORT_SETTINGS()
    if include_tcga:
        provider = FeatureProviderFactory.from_feature_id(feature_id)
        result = provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)

        # ex: result[0]
        # {'aliquot_id': None, 'case_id': u'TCGA-BH-A0B1', 'sample_id': u'TCGA-BH-A0B1-10A', 'value': u'BRCA'}
        for data_point in result:
            data_item = {key: data_point[key] for key in ['case_id', 'sample_id', 'aliquot_id']}
            value = provider.process_data_point(data_point)
            # TODO refactor missing value logic
            if value is None:
                value = 'NA'
            data_item['value'] = value
            items.append(data_item)

        type = provider.get_value_type()

    if len(user_studies) > 0:
        # Query User Data
        user_provider = UserDataQueryHandler(feature_id, user_feature_id=user_feature_id)
        user_result = user_provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)
        result.extend(user_result)

        for data_point in user_result:
            data_item = {key: data_point[key] for key in ['case_id', 'sample_id', 'aliquot_id']}
            value = provider.process_data_point(data_point)
            # TODO refactor missing value logic
            if value is None:
                value = 'NA'
            data_item['value'] = value
            items.append(data_item)

        if not type:
            type = user_provider.get_value_type()

    return type, items


def get_feature_vectors_with_user_data(params_array, poll_retry_limit=20, skip_formatting_for_plot=False):
    provider_array = submit_jobs_with_user_data(params_array)

    project_id = settings.BIGQUERY_PROJECT_ID
    result = get_submitted_job_results(provider_array, project_id, poll_retry_limit, skip_formatting_for_plot)

    return result

