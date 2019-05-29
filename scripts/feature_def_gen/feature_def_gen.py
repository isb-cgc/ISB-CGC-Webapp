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
from __future__ import print_function

from future import standard_library
standard_library.install_aliases()
from builtins import str
from builtins import range
from csv import DictWriter
from json import load as load_json
import logging
from io import StringIO
from time import sleep
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "GenespotRE.settings")

import django
django.setup()

import click

from bq_data_access.v2.feature_id_utils import FeatureDataTypeHelper


logging.basicConfig(level=logging.INFO)


def run_query(project_id, provider, config):
    job_reference = provider.submit_query_and_get_job_ref(project_id)

    poll_retry_limit = provider.BQ_JOB_POLL_MAX_RETRIES
    poll_sleep_time = provider.BQ_JOB_POLL_SLEEP_TIME
    all_done = False
    total_retries = 0
    poll_count = 0

    # Poll for completion
    while all_done is False and total_retries < poll_retry_limit:
        poll_count += 1
        total_retries += 1

        is_finished = provider.is_bigquery_job_finished(project_id)
        all_done = is_finished
        sleep(poll_sleep_time)

    logging.debug("Done: {done}    retry: {retry}".format(done=str(all_done), retry=total_retries))
    query_result = provider.download_and_unpack_query_result()

    return query_result


def load_config_from_path(config_class, config_json_path):
    config_dict = load_json(open(config_json_path, 'r'))
    return config_class.from_dict(config_dict)


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
@click.option('--config_json', type=str)
@click.option('-chr', "chromosome_array", type=str, multiple=True, help="Chromosome (required for methylation)")
def print_query(data_type, config_json, chromosome_array):

    feature_type = FeatureDataTypeHelper.get_type(data_type)
    logging.info("Feature type: {}".format(str(feature_type)))
    config_class = FeatureDataTypeHelper.get_feature_def_config_from_data_type(feature_type)
    provider_class = FeatureDataTypeHelper.get_feature_def_provider_from_data_type(feature_type)

    if config_json is not None:
        config_instance = load_config_from_path(config_class, config_json)
    else:
        config_dict = FeatureDataTypeHelper.get_feature_def_default_config_dict_from_data_type(feature_type)
        config_instance = config_class.from_dict(config_dict)

    if not chromosome_array:
        chromosome_array = [str(c) for c in range(1, 23)]
        chromosome_array.extend(['X', 'Y'])

    provider = provider_class(config_instance, chromosome_array=chromosome_array)
    query = provider.build_query(config_instance)
    print(query)


# project_id: project number of the BQ data project (typically isb-cgc's project number)
# data_type: 4-letter data type code, eg. GNAB

@click.command()
@click.argument('project_id', type=click.INT)
@click.argument('data_type', type=str)
@click.argument('csv_path', type=str)
@click.option('--config_json', type=str)
@click.option('-chr', "chromosome_array", type=str, multiple=True, help="Chromosome (required for methylation)")
def run(project_id, data_type, csv_path, config_json, chromosome_array):
    feature_type = FeatureDataTypeHelper.get_type(data_type)
    logging.info("Feature type: {}".format(str(feature_type)))
    config_class = FeatureDataTypeHelper.get_feature_def_config_from_data_type(feature_type)
    provider_class = FeatureDataTypeHelper.get_feature_def_provider_from_data_type(feature_type)

    if config_json is not None:
        config_instance = load_config_from_path(config_class, config_json)
    else:
        config_dict = FeatureDataTypeHelper.get_feature_def_default_config_dict_from_data_type(feature_type)
        config_instance = config_class.from_dict(config_dict)

    if not chromosome_array:
        chromosome_array = [str(c) for c in range(1, 23)]
        chromosome_array.extend(['X', 'Y'])
    else:
        chromosome_array = chromosome_array[0].split(",")

    provider = provider_class(config_instance, chromosome_array=chromosome_array)

    logging.info("Output CSV: {}".format(csv_path))
    logging.info("Config: {}".format(str(config_instance)))

    result = run_query(project_id, provider, config_instance)
    save_csv(result, provider.get_mysql_schema(), csv_path, include_header=True)

@click.group()
def main():
    pass

main.add_command(print_query)
main.add_command(run)

if __name__ == '__main__':
    main()
