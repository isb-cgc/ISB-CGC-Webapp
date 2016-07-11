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
from sys import argv as cmdline_argv, stdout
from time import sleep

import click

from feature_def_bq_provider import FeatureDefBigqueryProvider

from scripts.feature_def_gen.feature_def_utils import DataSetConfig, load_config_json

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
_ch = logging.StreamHandler(stream=stdout)
logger.addHandler(_ch)

MYSQL_SCHEMA = [
    {
        'name': 'gene_name',
        'type': 'string'
    },
    {
        'name': 'generating_center',
        'type': 'string'
    },
    {
        'name': 'platform',
        'type': 'string'
    },
    {
        'name': 'value_label',
        'type': 'string'
    },
    {
        'name': 'internal_feature_id',
        'type': 'string'
    },
]


class GEXPTableConfig(object):
    def __init__(self, table_name, platform, generating_center, value_label, value_field, internal_table_id):
        self.table_name = table_name
        self.platform = platform
        self.generating_center = generating_center
        self.value_label = value_label
        self.value_field = value_field
        self.internal_table_id = internal_table_id

    @classmethod
    def from_dict(cls, param):
        table_name = param['table_id']
        platform = param['platform']
        generating_center = param['generating_center']
        value_label = param['value_label']
        value_field = param['value_field']
        internal_table_id = param['feature_id']

        return cls(table_name, platform, generating_center, value_label, value_field, internal_table_id)


class GEXPFeatureDefConfig(object):
    def __init__(self, project_id, reference, target_config, gene_label_field, tables_array, out_path):
        self.project_id = project_id
        self.reference_config = reference
        self.target_config = target_config
        self.gene_label_field = gene_label_field
        self.data_table_list = tables_array
        self.output_csv_path = out_path

    @classmethod
    def from_dict(cls, param):
        project_id = param['project_id']
        reference_config = DataSetConfig.from_dict(param['reference_config'])
        target_config = DataSetConfig.from_dict(param['target_config'])
        output_csv_path = param['output_csv_path']
        gene_label_field = param['gene_label_field']
        data_table_list = [GEXPTableConfig.from_dict(item) for item in param['tables']]

        return cls(project_id, reference_config, target_config, gene_label_field, data_table_list, output_csv_path)


def build_feature_query(config, table_name):
    query_template = \
        'SELECT \'{table_name}\' AS table_name, {gene_label_field} ' \
        'FROM [{main_project_name}:{main_dataset_name}.{table_name}] ' \
        'WHERE {gene_label_field} IS NOT NULL ' \
        'GROUP BY {gene_label_field}'

    query = query_template.format(
        gene_label_field=config.gene_label_field,
        main_project_name=config.target_config.project_name,
        main_dataset_name=config.target_config.dataset_name,
        table_name=table_name
    )

    return query


def build_internal_feature_id(feature_type, gene, table_id):
    return '{feature_type}:{gene}:{table}'.format(
        feature_type=feature_type,
        gene=gene,
        table=table_id
    )


# TODO remove duplicate code
def get_feature_type():
    return 'GEXP'


class GEXPFeatureDefProvider(FeatureDefBigqueryProvider):
    def build_subqueries_for_tables(self, config):
        query_strings = []
        for table_item in config.data_table_list:
            query = build_feature_query(config, table_item.table_name)
            query_strings.append(query)

        return query_strings


    def merge_queries(self, gene_label_field, query_strings):
        # Union of the subqueries
        result = []

        for subquery in query_strings:
            result.append("   ({query})".format(query=subquery))

        sq_stmt = ',\n'.join(result)
        sq_stmt += ';'

        query_tpl = \
            'SELECT table_name, {gene_label_field} \n' \
            'FROM \n' \
            '{subquery_stmt}'

        query = query_tpl.format(gene_label_field=gene_label_field,
                                 subquery_stmt=sq_stmt)

        return query

    def build_table_mapping(self, config):
        result = {}
        for table_item in config.data_table_list:
            result[table_item.table_name] = table_item
        return result

    def build_query(self, config):
        query_strings = self.build_subqueries_for_tables(config)
        query = self.merge_queries(config.gene_label_field, query_strings)
        return query

    def unpack_query_response(self, row_item_array):
        table_config_mapping = self.build_table_mapping(self.config)

        feature_type = get_feature_type()
        result = []

        for row in row_item_array:
            table_name = row['f'][0]['v']
            gene = row['f'][1]['v']
            if gene is None:
                continue

            table_config = table_config_mapping[table_name]

            result.append({
                'gene_name': gene,
                'generating_center': table_config.generating_center,
                'platform': table_config.platform,
                'value_label': table_config.value_label,
                'internal_feature_id': build_internal_feature_id(feature_type, gene, table_config.internal_table_id)
            })

        return result


def run_query(project_id, config):
    provider = GEXPFeatureDefProvider(config)
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


def validate_config(config):
    pass


def load_config_from_path(config_json):
    config = load_config_json(config_json, GEXPFeatureDefConfig)
    return config


def get_csv_object(data_rows, include_header=False):
    fieldnames = [x['name'] for x in MYSQL_SCHEMA]
    file_obj = StringIO()
    writer = DictWriter(file_obj, fieldnames=fieldnames)
    if include_header:
        writer.writeheader()
    writer.writerows(data_rows)
    return file_obj


def save_csv(data_rows, csv_path, include_header=False):
    file_obj = get_csv_object(data_rows, include_header=include_header)
    with open(csv_path, 'w') as file_handle:
        file_handle.write(file_obj.getvalue())


@click.command()
@click.argument('config_json', type=click.Path(exists=True))
def print_query(config_json):
    config = load_config_from_path(config_json)
    provider = GEXPFeatureDefProvider(config)
    query = provider.build_query(config)
    print(query)


@click.command()
@click.argument('project_id', type=click.INT)
@click.argument('config_json', type=click.Path(exists=True))
def csv(project_id, config_json):
    config_file_path = config_json
    config = load_config_from_path(config_file_path)
    csv_path = config.output_csv_path

    result = run_query(project_id, config)
    save_csv(result, csv_path, include_header=True)


@click.group()
def main():
    pass

main.add_command(print_query)
main.add_command(csv)

if __name__ == '__main__':
    main()
