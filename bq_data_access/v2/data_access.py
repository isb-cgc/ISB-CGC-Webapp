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
from builtins import object
import logging
from time import sleep

from bq_data_access.bigquery_cohorts import BigQueryCohortStorageSettings
from bq_data_access.v2.feature_data_provider import FeatureDataProvider
from bq_data_access.v2.feature_id_utils import FeatureProviderFactory
from bq_data_access.v2.errors import FeatureNotFoundException


logger = logging.getLogger('main_logger')


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
    except FeatureNotFoundException as e:
        logger.exception(e)
        # FeatureProviderFactory.get_provider_class_from_feature_id raises FeatureNotFoundException
        # if the feature identifier does not look valid. Nothing needs to be done here,
        # since is_valid is already False.
        pass
    except Exception as e:
        logger.error("Unrecognized feature ID: '{}'".format(feature_id))
        logger.exception(e)
    finally:
        return is_valid


def get_feature_vector(feature_id, cohort_id_array, cohort_settings):
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

    result = provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)

    items = []
    for data_point in result:
        data_item = {key: data_point[key] for key in ['case_id', 'sample_id', 'aliquot_id']}
        value = provider.process_data_point(data_point)
        # TODO refactor missing value logic
        if value is None:
            value = 'NA'
        data_item['value'] = value
        items.append(data_item)

    return provider.get_value_type(), items


def submit_tcga_job(param_obj, project_id_number, bigquery_client, cohort_settings):
    query_provider = FeatureProviderFactory.from_parameters(param_obj)
    bigquery_runner = FeatureDataProvider(
        query_provider, bigquery_service=bigquery_client, project_id_number=project_id_number)

    feature_id = param_obj.feature_id
    cohort_id_array = param_obj.cohort_id_array
    project_id_array = param_obj.project_id_array
    logger.info("[STATUS] In submit_tcga_job, project_id_array: {}".format(str(project_id_array)))
    program_set = param_obj.program_set

    job_description = bigquery_runner.get_data_job_reference(
        program_set, cohort_settings.table_id, cohort_id_array, project_id_array
    )

    # Was a query job submitted at all?
    run_query = job_description['run_query']
    if run_query:
        logger.info("Submitted TCGA {job_id}: {fid} - {cohorts}".format(
            job_id=job_description['job_reference']['jobId'],
            fid=feature_id, cohorts=str(cohort_id_array))
        )

        job_item = {
            'run_query': run_query,
            'feature_id': feature_id,
            'provider': bigquery_runner,
            'query_support': query_provider,
            'ready': False,
            'job_reference': job_description['job_reference'],
            'tables_used': job_description['tables_used']
        }
    else:
        job_item = {
            'run_query': run_query,
            'feature_id': feature_id,
            'provider': bigquery_runner,
            'query_support': query_provider,
            'ready': False,
            'job_reference': job_description['job_reference'],
            'tables_used': job_description['tables_used']
        }

    return job_item


def get_submitted_job_results(provider_array, project_id, poll_retry_limit, skip_formatting_for_plot):
    result = {
        'tables_queried': [],
    }
    all_done = False
    total_retries = 0
    poll_count = 0

    # Poll for completion
    while all_done is False and total_retries < poll_retry_limit:
        poll_count += 1
        total_retries += 1

        for item in provider_array:
            # Was a BigQuery job even started for this feature ID and cohort(s)?
            run_query = item['run_query']
            result['tables_queried'].extend(item['tables_used'])
            provider = item['provider']
            query_support = item['query_support']
            feature_id = item['feature_id']

            if not run_query:
                is_finished = True
                logger.info("Query not run for feature {feature_id}".format(
                    feature_id=feature_id))
                item['ready'] = True
                value_type = query_support.get_value_type()
                result[feature_id] = {
                    'type': value_type,
                    'data': []
                }

            if run_query:
                is_finished = provider.is_bigquery_job_finished(project_id)
                logger.info("Status {job_id}: {status}".format(job_id=item['job_reference']['jobId'],
                                                                status=str(is_finished)))

            if item['ready'] is False and is_finished:
                item['ready'] = True
                query_result = provider.download_and_unpack_query_result()

                if not skip_formatting_for_plot:
                    data = format_query_result_for_plot(query_support, query_result)

                    value_type = query_support.get_value_type()
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
                else:
                    result[feature_id] = {
                        'data': query_result,
                        'type': None
                    }

            sleep(1)

        all_done = all([j['ready'] for j in provider_array])

    return result


def format_query_result_for_plot(query_support_instance, query_result):
    data = []

    for data_point in query_result:
        data_item = {key: data_point[key] for key in ['case_id', 'sample_id', 'aliquot_id']}
        value = str(query_support_instance.process_data_point(data_point))

        if value is None:
            value = 'NA'
        data_item['value'] = value
        data.append(data_item)

    return data


class FeatureVectorBigQueryBuilder(object):
    def __init__(self, project_id_number, cohort_settings, big_query_service_support):
        self.project_id_number = project_id_number
        self.cohort_settings = cohort_settings
        self.big_query_service_support = big_query_service_support

    def get_feature_vectors_tcga_only(self, params_array, poll_retry_limit=20, skip_formatting_for_plot=False):
        bigquery_client = self.big_query_service_support.get_client()
        provider_array = []

        # Submit jobs
        for parameter_object in params_array:
            job_item = submit_tcga_job(parameter_object, self.project_id_number, bigquery_client, self.cohort_settings)
            provider_array.append(job_item)
        result = get_submitted_job_results(provider_array, self.project_id_number, poll_retry_limit, skip_formatting_for_plot)
        return result

    @classmethod
    def build_from_django_settings(cls, bqss):
        from django.conf import settings as django_settings
        project_id = django_settings.BIGQUERY_PROJECT_ID
        bigquery_cohort_dataset = django_settings.BIGQUERY_COHORT_DATASET_ID
        biquery_cohort_table = django_settings.BIGQUERY_COHORT_TABLE_ID

        cohort_table_id = "{project_name}:{dataset_id}.{table_id}".format(
            project_name=project_id,
            dataset_id=bigquery_cohort_dataset,
            table_id=biquery_cohort_table
        )

        cohort_settings = BigQueryCohortStorageSettings(cohort_table_id)

        return cls(project_id, cohort_settings, bqss)
