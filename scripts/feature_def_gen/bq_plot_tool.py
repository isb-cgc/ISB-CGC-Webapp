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

logging.basicConfig(level=logging.INFO)
logger = logging


def get_bq_program_set(program_array):
    supported_programs = set(['tcga', 'target'])
    return set(program_array).intersection(supported_programs)


@click.command()
# Google Cloud Platform project number
@click.argument('gcp_project_id', type=click.INT)
# Feature identifier for x-axis
@click.argument('x', type=str)
# Feature identifier for y-axis
@click.argument('y', type=str)
@click.option('-c', '--cohort_id', "cohort_id_array", type=click.INT, multiple=True, help="Cohort ID number")
@click.option('-p', '--program', "program_array", type=str, multiple=True, help="Program name ('tcga', 'target')")
@click.option('-j', '--project', "project_id_array", type=click.INT, multiple=True, help="Project ID number")
@click.option('--cohort-table', "cohort_table_id", type=str, default="test-project:cohort_dataset.cohorts", help="Cohort table identifier, including project and dataset name.")
@click.option('--log-transform', type=str, help="Log transform JSON object")
def run_query(gcp_project_id, x, y, cohort_id_array, program_array, project_id_array, cohort_table_id, log_transform):
    from bq_data_access.v2.data_access import FeatureVectorBigQueryBuilder
    from bq_data_access.bigquery_cohorts import BigQueryCohortStorageSettings
    from bq_data_access.v2.plot_data_support import get_merged_feature_vectors
    from google_helpers.bigquery.service_v2 import BigQueryServiceSupport

    # Verify the program set
    # ----------------------
    program_set = get_bq_program_set(program_array)
    logger.info("Selected programs: {}".format(program_set))
    if len(program_set) == 0:
        logger.info("No programs set. Please include at least one program.")
        sys_exit(0)

    # Verify the cohort ID array
    # --------------------------
    if len(cohort_id_array) == 0:
        logger.info("No cohort IDs set. Please include at least one cohort ID.")
        sys_exit(0)

    # Verify the project ID array
    # ---------------------------
    if len(project_id_array) == 0:
        logger.info("No project IDs set. Please include at least one project ID.")
        sys_exit(0)

    cohort_settings = BigQueryCohortStorageSettings.build_from_full_table_id(cohort_table_id)
    bqss = BigQueryServiceSupport.build_from_application_default()
    fvb = FeatureVectorBigQueryBuilder(gcp_project_id, cohort_settings, bqss)

    data = get_merged_feature_vectors(fvb, x, y, None, cohort_id_array, log_transform, project_id_array, program_set=program_set)


@click.command()
@click.argument('feature_id', type=str)
@click.option('-c', '--cohort_id', "cohort_id_array", type=click.INT, multiple=True, help="Cohort ID number")
@click.option('-p', '--program', "program_array", type=str, multiple=True, help="Program name ('tcga', 'target')")
@click.option('-j', '--project', "project_id_array", type=click.INT, multiple=True, help="Project ID number")
@click.option('--cohort-table', "cohort_table_id", type=str, default="test-project:cohort_dataset.cohorts", help="Cohort table identifier, including project and dataset name.")
def print_query(feature_id, cohort_id_array, program_array, project_id_array, cohort_table_id):
    program_set = get_bq_program_set(program_array)
    logger.info("Selected programs: {}".format(program_set))

    # Verify the program set
    # ----------------------
    if len(program_set) == 0:
        logger.info("No programs set. Please include at least one program.")
        sys_exit(0)

    # Verify the cohort ID array
    # --------------------------
    if len(cohort_id_array) == 0:
        logger.info("No cohort IDs set. Please include at least one cohort ID.")
        sys_exit(0)

    # Verify the project ID array
    # ---------------------------
    logger.info("Selected projects: {}".format(project_id_array))
    if len(project_id_array) == 0:
        logger.info("No project IDs set. Using NULL.")
        project_id_array = None

    provider = FeatureProviderFactory.from_feature_id(feature_id)

    query_string, _ = provider.build_query(
        program_set,
        cohort_table_id,
        cohort_id_array,
        project_id_array
    )

    logger.info("QUERY:\n\n{}".format(query_string))


@click.group()
def main():
    pass

main.add_command(print_query)
main.add_command(run_query)

if __name__ == '__main__':
    main()
