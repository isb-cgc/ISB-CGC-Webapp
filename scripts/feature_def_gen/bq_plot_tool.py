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

import click

from bq_data_access.v2.feature_id_utils import FeatureProviderFactory

logging.basicConfig(level=logging.INFO)
logger = logging


@click.command()
@click.argument('feature_id', type=str)
@click.argument('cohort_id', type=str)
@click.option('--program', '-p', multiple=True)
@click.option('--cohort-table', type=str, default="test-project:cohort_dataset.cohorts")
def print_query(feature_id, cohort_id, program, cohort_table):
    supported_programs = set(['tcga', 'target'])
    program_set = set(program).intersection(supported_programs)

    logger.info("Selected programs: {}".format(program_set))
    if len(program_set) == 0:
        logger.info("No selected programs, quitting.")
        return

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

if __name__ == '__main__':
    main()
