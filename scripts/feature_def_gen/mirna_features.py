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

from sys import argv as cmdline_argv, stdout
import logging

from scripts.feature_def_gen.feature_def_utils import DataSetConfig, build_bigquery_service, \
    submit_query_async, poll_async_job, download_query_result, write_tsv, \
    load_config_json

logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
_ch = logging.StreamHandler(stream=stdout)
logger.addHandler(_ch)


FIELDNAMES = ['num_search_hits', 'mirna_name', 'platform', 'value_field', 'internal_feature_id']


class MIRNTableConfig(object):
    def __init__(self, table_name, platform, info, value_label, value_field, internal_table_id, expr_table):
        self.table_name = table_name
        self.platform = platform
        self.info = info
        self.value_label = value_label
        self.value_field = value_field
        self.internal_table_id = internal_table_id
        self.is_expression_table = expr_table

    @classmethod
    def from_dict(cls, param):
        logger.info(cls.__name__ + ".from_dict - table: \'" + param['name'] + "\'")
        table_name = param['name']
        platform = param['platform']
        info = param['info']
        value_label = param['value_label']
        value_field = param['value_field']
        internal_table_id = param['feature_id']
        expression_table = param['expression_table']

        return cls(table_name, platform, info, value_label, value_field, internal_table_id, expression_table)


class MIRNFeatureDefConfig(object):
    def __init__(self, project_id, reference, target_config, tables_array, out_path):
        self.project_id = project_id
        self.reference_config = reference
        self.target_config = target_config
        self.data_table_list = tables_array
        self.output_csv_path = out_path

    @classmethod
    def from_dict(cls, param):
        project_id = param['project_id']
        reference_config = DataSetConfig.from_dict(param['reference_config'])
        target_config = DataSetConfig.from_dict(param['target_config'])
        output_csv_path = param['output_csv_path']
        data_table_list = [MIRNTableConfig.from_dict(item) for item in param['tables']]

        return cls(project_id, reference_config, target_config, data_table_list, output_csv_path)


def build_internal_feature_id(feature_type, mirna_name, feature_table_id):
    return '{feature_type}:{mirna_name}:{feature_table_id}'.format(
        feature_type=feature_type,
        mirna_name=mirna_name,
        feature_table_id=feature_table_id
    )


# TODO remove duplicate code
def get_feature_type():
    return 'MIRN'


def build_feature_query(config, table_config):
    mir_name = None

    if table_config.is_expression_table:
        mir_name = 'mirna_id'
        query_template = ("SELECT {mir_name}, Platform \
                           FROM [{main_project_name}:{main_dataset_name}.{table_name}] \
                           GROUP BY {mir_name}, Platform")
    else:
        mir_name = 'miRNA_ID'
        query_template = ("SELECT {mir_name} \
                           FROM [{main_project_name}:{main_dataset_name}.{table_name}] \
                           GROUP BY {mir_name}")

    query = query_template.format(
        mir_name=mir_name,
        main_project_name=config.target_config.project_name,
        main_dataset_name=config.target_config.dataset_name,
        table_name=table_config.table_name
    )

    logger.debug("MIRN SQL:\n" + query)

    return query


def unpack_rows(row_item_array, table_config):
    feature_type = get_feature_type()
    platform = table_config.platform
    value_label = table_config.value_label
    result = []
    for row in row_item_array:
        mirna_name = row['f'][0]['v']

        result.append({
            'num_search_hits': 0,
            'mirna_name': mirna_name,
            'platform': platform,
            'value_field': value_label,
            'internal_feature_id': build_internal_feature_id(feature_type, mirna_name, table_config.internal_table_id)
        })

    return result


def main():
    config_file_path = cmdline_argv[1]
    config = load_config_json(config_file_path, MIRNFeatureDefConfig)

    logger.info("Building BigQuery service...")
    bigquery_service = build_bigquery_service()

    result = []
    for table_item in config.data_table_list:
        logger.info('MIRN table: \'' + table_item.table_name + '\'')
        query = build_feature_query(config, table_item)

        # Insert BigQuery job
        query_job = submit_query_async(bigquery_service, config.project_id, query)

        # Poll for completion of query
        job_id = query_job['jobReference']['jobId']
        logger.info('job_id = "' + str(job_id) + '\"')

        poll_async_job(bigquery_service, config, job_id)

        query_result = download_query_result(bigquery_service, query_job)
        rows = unpack_rows(query_result, table_item)
        result.extend(rows)

    write_tsv(config.output_csv_path, result, FIELDNAMES)

if __name__ == '__main__':
    main()
