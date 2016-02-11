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
from time import sleep

from django.conf import settings

from api.api_helpers import authorize_credentials_with_Google
from api.api_helpers import sql_connection, MySQLdb

from bq_data_access.feature_value_types import ValueType

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.gexp_data import GEXPFeatureProvider, GEXP_FEATURE_TYPE
from bq_data_access.methylation_data import METHFeatureProvider, METH_FEATURE_TYPE
from bq_data_access.copynumber_data import CNVRFeatureProvider, CNVR_FEATURE_TYPE
from bq_data_access.protein_data import RPPAFeatureProvider, RPPA_FEATURE_TYPE
from bq_data_access.mirna_data import MIRNFeatureProvider, MIRN_FEATURE_TYPE
from bq_data_access.clinical_data import ClinicalFeatureProvider, CLINICAL_FEATURE_TYPE
from bq_data_access.gnab_data import GNABFeatureProvider, GNAB_FEATURE_TYPE
from bq_data_access.user_data import UserFeatureProvider, USER_FEATURE_TYPE

class FeatureProviderFactory(object):
    @classmethod
    def get_feature_type_string(cls, feature_id):
        regex = re_compile("^(CLIN|GEXP|METH|CNVR|RPPA|MIRN|GNAB|USER):")

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            return None

        feature_type = feature_fields[0]
        return feature_type

    @classmethod
    def get_provider_class_from_feature_id(cls, feature_id):
        """
        Args:
            feature_id: Feature identifier

        Returns:
            Feature data provider class for the datatype defined in the
            feature identifier.

        Raises:
            FeatureNotFoundException: If the datatype part of the feature
            identifier is unknown.

        """
        feature_type = cls.get_feature_type_string(feature_id)
        if feature_type is None:
            logging.debug("FeatureProviderFactory.from_feature_id: invalid feature ID: " + str(feature_id))
            raise FeatureNotFoundException(feature_id)

        if feature_type == CLINICAL_FEATURE_TYPE:
            return ClinicalFeatureProvider
        elif feature_type == GEXP_FEATURE_TYPE:
            return GEXPFeatureProvider
        elif feature_type == METH_FEATURE_TYPE:
            return METHFeatureProvider
        elif feature_type == CNVR_FEATURE_TYPE:
            return CNVRFeatureProvider
        elif feature_type == RPPA_FEATURE_TYPE:
            return RPPAFeatureProvider
        elif feature_type == MIRN_FEATURE_TYPE:
            return MIRNFeatureProvider
        elif feature_type == GNAB_FEATURE_TYPE:
            return GNABFeatureProvider
        elif feature_type == USER_FEATURE_TYPE:
            return UserFeatureProvider

    @classmethod
    def from_feature_id(cls, feature_id, **kwargs):
        provider_class = cls.get_provider_class_from_feature_id(feature_id)
        return provider_class(feature_id, **kwargs)


def is_valid_feature_identifier(feature_id):
    """
    Answers if given internal feature identifier is valid.

    Args:
        feature_id: Internal feature identifier

    Returns:
        True if feature id is valid, otherwise False.
    """
    is_valid = False
    try:
        provider_class = FeatureProviderFactory.get_provider_class_from_feature_id(feature_id)
        is_valid = provider_class.is_valid_feature_id(feature_id)
    except FeatureNotFoundException:
        # FeatureProviderFactory.get_provider_class_from_feature_id raises FeatureNotFoundException
        # if the feature identifier does not look valid. Nothing needs to be done here,
        # since is_valid is already False.
        pass
    finally:
        return is_valid


def get_feature_vector(feature_id, cohort_id_array):
    """
    Fetches the data from BigQuery tables for a given feature identifier and
    one or more stored cohorts. Returns the intersection of the samples defined
    by the feature identifier and the stored cohort.

    Each returned data point is represented as a dict containing patient, sample and
    aliquot barcodes, and the value as defined by the feature identifier.

    Args:
        feature_id: Feature identifier
        cohort_id_array: Array of cohort identifiers (integers)

    Returns:
        Data as an array of dicts.
    """
    provider = FeatureProviderFactory.from_feature_id(feature_id)
    cohort_settings = settings.GET_BQ_COHORT_SETTINGS()

    result = provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)

    items = []
    for data_point in result:
        data_item = {key: data_point[key] for key in ['patient_id', 'sample_id', 'aliquot_id']}
        value = provider.process_data_point(data_point)
        # TODO refactor missing value logic
        if value is None:
            value = 'NA'
        data_item['value'] = value
        items.append(data_item)

    return provider.get_value_type(), items


# TODO refactor to smaller functions and document
def get_feature_vectors_async(params_array, poll_retry_limit=20):
    bigquery_service = authorize_credentials_with_Google()
    project_id = settings.BQ_PROJECT_ID
    result = {}
    provider_array = []

    cohort_settings = settings.GET_BQ_COHORT_SETTINGS()

    # Submit jobs
    for feature_id, cohort_id_array in params_array:
        user_data = user_feature_handler(feature_id, cohort_id_array)

        if user_data['include_tcga']:
            provider = FeatureProviderFactory.from_feature_id(feature_id, bigquery_service=bigquery_service)
            job_reference = provider.get_data_job_reference(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)

            logging.info("Submitted TCGA {job_id}: {fid} - {cohorts}".format(job_id=job_reference['jobId'], fid=feature_id,
                                                                             cohorts=str(cohort_id_array)))
            provider_array.append({
                'feature_id': feature_id,
                'provider': provider,
                'ready': False,
                'job_reference': job_reference
            })

        if len(user_data['user_studies']) > 0:
            converted_feature_id = user_data['converted_feature_id']
            user_feature_id = user_data['user_feature_id']
            logging.debug("user_feature_id: {0}".format(user_feature_id))
            provider = UserFeatureProvider(converted_feature_id, user_feature_id=user_feature_id)

            # The UserFeatureProvider instance might not generate a BigQuery query and job at all given the combination
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
                    'job_reference': job_reference
                })
            else:
                logging.debug("No UserFeatureDefs for '{0}'".format(converted_feature_id))

    all_done = False
    total_retries = 0
    poll_count = 0

    # Poll for completion
    while all_done is False and total_retries < poll_retry_limit:
        poll_count += 1
        total_retries += 1

        for item in provider_array:
            provider = item['provider']
            is_finished = provider.is_bigquery_job_finished(project_id)
            logging.info("Status {job_id}: {status}".format(job_id=item['job_reference']['jobId'],
                                                            status=str(is_finished)))

            if item['ready'] is False and is_finished:
                item['ready'] = True
                query_result = provider.download_and_unpack_query_result()
                data = []

                for data_point in query_result:
                    data_item = {key: data_point[key] for key in ['patient_id', 'sample_id', 'aliquot_id']}
                    value = str(provider.process_data_point(data_point))

                    if value is None:
                        value = 'NA'
                    data_item['value'] = value
                    data.append(data_item)

                feature_id = item['feature_id']
                value_type = provider.get_value_type()
                if feature_id not in result:
                    result[feature_id] = {
                        'type': value_type,
                        'data': data
                    }
                else:
                    # TODO fix possible bug:
                    # The ValueType of the data from the user feature provider may not match that of the TCGA
                    # provider above.
                    result[feature_id]['data'].extend(data)

            sleep(1)

        all_done = all([j['ready'] for j in provider_array])
        logging.debug("Done: {done}    retry: {retry}".format(done=str(all_done), retry=total_retries))

    for feature_id, _ in params_array:
        if feature_id not in result:
            result[feature_id] = {
                'ready': True,
                'data': [],
                'type': ValueType.STRING
            }

    return result


def user_feature_handler(feature_id, cohort_id_array):
    include_tcga = False
    user_studies = ()
    for cohort_id in cohort_id_array:
        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)

            cursor.execute("SELECT study_id FROM cohorts_samples WHERE cohort_id = %s GROUP BY study_id", (cohort_id,))
            for row in cursor.fetchall():
                if row['study_id'] is None:
                    include_tcga = True
                else:
                    user_studies += (row['study_id'],)

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    user_feature_id = None
    if feature_id.startswith('USER:'):
        # Try and convert it with a shared ID to a TCGA queryable id
        user_feature_id = feature_id
        feature_id = UserFeatureProvider.convert_user_feature_id(feature_id)
        if feature_id is None:
            # Querying user specific data, don't include TCGA
            include_tcga = False

    return {
        'converted_feature_id': feature_id,
        'include_tcga': include_tcga,
        'user_studies': user_studies,
        'user_feature_id': user_feature_id
    }


def get_feature_vector(feature_id, cohort_id_array):
    include_tcga = False
    user_studies = ()
    for cohort_id in cohort_id_array:
        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)

            cursor.execute("SELECT study_id FROM cohorts_samples WHERE cohort_id = %s GROUP BY study_id", (cohort_id,))
            for row in cursor.fetchall():
                if row['study_id'] is None:
                    include_tcga = True
                else:
                    user_studies += (row['study_id'],)

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    #  ex: feature_id 'CLIN:Disease_Code'
    user_feature_id = None
    if feature_id.startswith('USER:'):
        # Try and convert it with a shared ID to a TCGA queryable id
        user_feature_id = feature_id
        feature_id = UserFeatureProvider.convert_user_feature_id(feature_id)
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
        # {'aliquot_id': None, 'patient_id': u'TCGA-BH-A0B1', 'sample_id': u'TCGA-BH-A0B1-10A', 'value': u'BRCA'}
        for data_point in result:
            data_item = {key: data_point[key] for key in ['patient_id', 'sample_id', 'aliquot_id']}
            value = provider.process_data_point(data_point)
            # TODO refactor missing value logic
            if value is None:
                value = 'NA'
            data_item['value'] = value
            items.append(data_item)

        type = provider.get_value_type()

    if len(user_studies) > 0:
        # Query User Data
        user_provider = UserFeatureProvider(feature_id, user_feature_id=user_feature_id)
        user_result = user_provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)
        result.extend(user_result)

        for data_point in user_result:
            data_item = {key: data_point[key] for key in ['patient_id', 'sample_id', 'aliquot_id']}
            value = provider.process_data_point(data_point)
            # TODO refactor missing value logic
            if value is None:
                value = 'NA'
            data_item['value'] = value
            items.append(data_item)

        if not type:
            type = user_provider.get_value_type()

    return type, items
