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

import logging
from sys import exit as sys_exit

import click

from bq_data_access.v2.feature_id_utils import FeatureProviderFactory
from bq_data_access.v2.data_access import FeatureVectorBigQueryBuilder
from bq_data_access.bigquery_cohorts import BigQueryCohortStorageSettings
from bq_data_access.v2.plot_data_support import get_merged_feature_vectors
from google_helpers.bigquery_service_v2 import BigQueryServiceSupport

logging.basicConfig(level=logging.INFO)
logger = logging


def get_bq_program_set(program_array):
    supported_programs = set(['tcga', 'target'])
    return set(program_array).intersection(supported_programs)


@click.command()
# Google Cloud Platform project number
@click.argument('project_id', type=click.INT)
# Feature identifier for x-axis
@click.argument('x', type=str)
# Feature identifier for y-axis
@click.argument('y', type=str)
@click.argument('cohort_id', type=str)
@click.option('--program', '-p', multiple=True)
@click.option('--cohort-table', type=str, default="test-project:cohort_dataset.cohorts")
@click.option('--log-transform', type=str, help="Log transform JSON object")
def run_query(project_id, x, y, cohort_id, program, cohort_table, log_transform):
    program_set = get_bq_program_set(program)
    logger.info("Selected programs: {}".format(program_set))
    if len(program_set) == 0:
        logger.info("No selected programs, quitting.")
        sys_exit(0)

    cohort_settings = BigQueryCohortStorageSettings.build_from_full_table_id(cohort_table)
    bqss = BigQueryServiceSupport.build_from_application_default()
    fvb = FeatureVectorBigQueryBuilder(project_id, cohort_settings, bqss)

    data = get_merged_feature_vectors(fvb, x, y, None, [cohort_id], None, None, program_set=program_set)


@click.command()
@click.argument('feature_id', type=str)
@click.argument('cohort_id', type=str)
@click.option('--program', '-p', multiple=True)
@click.option('--cohort-table', type=str, default="test-project:cohort_dataset.cohorts")
def print_query(feature_id, cohort_id, program, cohort_table):
    program_set = get_bq_program_set(program)
    logger.info("Selected programs: {}".format(program_set))
    if len(program_set) == 0:
        logger.info("No selected programs, quitting.")
        sys_exit(0)

    provider = FeatureProviderFactory.from_feature_id(feature_id)

    query_string = provider.build_query(program_set,
                                        cohort_table,
                                        [cohort_id],
                                        None
                                        )

    logger.info("QUERY:\n\n{}".format(query_string))


@click.group()
def main():
    pass

main.add_command(print_query)
main.add_command(run_query)

if __name__ == '__main__':
    main()
