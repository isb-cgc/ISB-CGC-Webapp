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

VALUE_FIELD_NUM_MUTATIONS = 'num_mutations'
VALUES = frozenset(['variant_classification', 'variant_type', 'sequence_source', VALUE_FIELD_NUM_MUTATIONS])
FIELDNAMES = ['gene_name', 'protein_name', 'num_search_hits', 'value_field', 'internal_feature_id']


class RPPAFeatureDefConfig(object):
    def __init__(self, project_id, target_config, rppa_table_name, out_path):
        self.project_id = project_id
        self.target_config = target_config
        self.rppa_table_name = rppa_table_name
        self.output_csv_path = out_path

    @classmethod
    def from_dict(cls, param):
        project_id = param['project_id']
        target_config = DataSetConfig.from_dict(param['target_config'])
        table_name = param['rppa_table_name']
        output_csv_path = param['output_csv_path']

        return cls(project_id, target_config, table_name, output_csv_path)


def build_feature_query(config):
    query_template = ("SELECT gene_name, protein_name \
                       FROM [{main_project_name}:{main_dataset_name}.{table_name}] \
                       WHERE gene_name IS NOT NULL \
                       GROUP BY gene_name, protein_name")

    query_str = query_template.format(
        main_project_name=config.target_config.project_name,
        main_dataset_name=config.target_config.dataset_name,
        table_name=config.rppa_table_name
    )

    feature_type = get_feature_type()
    logger.debug(str(feature_type) + " SQL: " + query_str)

    return query_str


# TODO remove duplicate code
def get_feature_type():
    return 'RPPA'


def build_internal_feature_id(feature_type, gene, protein):
    return '{feature_type}:{gene}:{protein}'.format(
        feature_type=feature_type,
        gene=gene,
        protein=protein
    )


def unpack_rows(row_item_array):
    feature_type = get_feature_type()
    result = []
    for row in row_item_array:
        gene_name = row['f'][0]['v']
        protein_name = row['f'][1]['v']

        for value_field in VALUES:
            result.append({
                'num_search_hits': 0,
                'gene_name': gene_name,
                'protein_name': protein_name,
                'value_field': value_field,
                'internal_feature_id': build_internal_feature_id(feature_type, gene_name, protein_name)
            })

    return result


def main():
    config_file_path = cmdline_argv[1]
    config = load_config_json(config_file_path, RPPAFeatureDefConfig)

    logger.info("Building BigQuery service...")
    bigquery_service = build_bigquery_service()

    result = []
    query = build_feature_query(config)

    # Insert BigQuery job
    query_job = submit_query_async(bigquery_service, config.project_id, query)

    # Poll for completion of query
    job_id = query_job['jobReference']['jobId']
    logger.info('job_id = "' + str(job_id) + '\"')

    poll_async_job(bigquery_service, config, job_id)

    query_result = download_query_result(bigquery_service, query_job)
    rows = unpack_rows(query_result)
    result.extend(rows)

    write_tsv(config.output_csv_path, result, FIELDNAMES)

if __name__ == '__main__':
    main()

