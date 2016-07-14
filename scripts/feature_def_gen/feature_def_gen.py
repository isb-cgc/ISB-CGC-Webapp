"""

Copyright 2016, Institute for Systems Biology

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

from csv import DictWriter
import logging
from StringIO import StringIO
from time import sleep

import click

from gexp_features import GEXPFeatureDefConfig, GEXPFeatureDefProvider
from gnab_features import GNABFeatureDefConfig, GNABFeatureDefProvider
from protein_features import RPPAFeatureDefConfig, RPPAFeatureDefProvider
from methylation_features import METHFeatureDefConfig, METHFeatureDefProvider
from copynumber_features import CNVFeatureDefConfig, CNVFeatureDefProvider
from mirna_features import MIRNFeatureDefConfig, MIRNFeatureDefProvider

from scripts.feature_def_gen.feature_def_utils import load_config_json


data_type_registry = {
    'gexp': (GEXPFeatureDefConfig, GEXPFeatureDefProvider),
    'gnab': (GNABFeatureDefConfig, GNABFeatureDefProvider),
    'rppa': (RPPAFeatureDefConfig, RPPAFeatureDefProvider),
    'meth': (METHFeatureDefConfig, METHFeatureDefProvider),
    'cnv': (CNVFeatureDefConfig, CNVFeatureDefProvider),
    'mirn': (MIRNFeatureDefConfig, MIRNFeatureDefProvider)
}


def run_query(project_id, provider, config):
    job_reference = provider.submit_query_and_get_job_ref(project_id)

    poll_retry_limit = 20
    all_done = False
    total_retries = 0
    poll_count = 0

    # Poll for completion
    while all_done is False and total_retries < poll_retry_limit:
        poll_count += 1
        total_retries += 1

        is_finished = provider.is_bigquery_job_finished(project_id)
        all_done = is_finished
        sleep(1)

    logging.debug("Done: {done}    retry: {retry}".format(done=str(all_done), retry=total_retries))
    query_result = provider.download_and_unpack_query_result()

    return query_result


def load_config_from_path(data_type, config_json):
    config_class, _ = data_type_registry[data_type]
    config = load_config_json(config_json, config_class)
    return config


def get_csv_object(data_rows, schema, include_header=False):
    fieldnames = [x['name'] for x in schema]
    file_obj = StringIO()
    writer = DictWriter(file_obj, fieldnames=fieldnames)
    if include_header:
        writer.writeheader()
    writer.writerows(data_rows)
    return file_obj


def save_csv(data_rows, schema, csv_path, include_header=False):
    file_obj = get_csv_object(data_rows, schema, include_header=include_header)
    with open(csv_path, 'w') as file_handle:
        file_handle.write(file_obj.getvalue())


@click.command()
@click.argument('data_type', type=str)
@click.argument('config_json', type=click.Path(exists=True))
def print_query(data_type, config_json):
    config = load_config_from_path(data_type, config_json)
    _, provider_class = data_type_registry[data_type]
    provider = provider_class(config)
    query = provider.build_query(config)
    print(query)


@click.command()
@click.argument('project_id', type=click.INT)
@click.argument('data_type', type=str)
@click.argument('config_json', type=click.Path(exists=True))
def run(project_id, data_type, config_json):
    _, provider_class = data_type_registry[data_type]
    config = load_config_from_path(data_type, config_json)
    provider = provider_class(config)

    csv_path = config.output_csv_path
    result = run_query(project_id, provider, config)
    save_csv(result, provider.get_mysql_schema(), csv_path, include_header=True)


@click.group()
def main():
    pass

main.add_command(print_query)
main.add_command(run)

if __name__ == '__main__':
    main()
