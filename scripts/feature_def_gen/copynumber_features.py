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


FIELDNAMES = ['num_search_hits', 'gene_name', 'value_field', 'internal_feature_id']


class CNVFeatureDefConfig(object):
    def __init__(self, project_id, genomic_reference, gencode_table, target_config, out_path):
        self.project_id = project_id
        self.genomic_reference_config = genomic_reference
        self.gencode_table = gencode_table
        self.target_config = target_config
        self.output_csv_path = out_path

    @classmethod
    def from_dict(cls, param):
        project_id = param['project_id']
        genomic_reference_config = DataSetConfig.from_dict(param['genomic_reference_config'])
        gencode_table = param['gencode_table']
        target_config = DataSetConfig.from_dict(param['target_config'])
        output_csv_path = param['output_csv_path']

        return cls(project_id, genomic_reference_config, gencode_table, target_config,  output_csv_path)


def build_feature_query(config):
    query_template = ("SELECT gene_name, seqname, start, end \
                       FROM [{genomic_reference_project_name}:{genomic_reference_dataset_name}.{gencode_table}] \
                       WHERE feature=\'gene\'")

    query_str = query_template.format(
        genomic_reference_project_name=config.genomic_reference_config.project_name,
        genomic_reference_dataset_name=config.genomic_reference_config.dataset_name,
        gencode_table=config.gencode_table
    )

    logger.debug("CNVR SQL: " + query_str)

    return query_str


# TODO remove duplicate code
def get_feature_type():
    return 'CNVR'


def build_internal_feature_id(feature_type, value_field, chromosome, start, end):
    return '{feature_type}:{value}:{chr}:{start}:{end}'.format(
        feature_type=feature_type,
        value=value_field,
        chr=chromosome,
        start=start,
        end=end
    )


def unpack_rows(row_item_array):
    feature_type = get_feature_type()
    VALUES = ['avg_segment_mean', 'std_dev_segment_mean', 'min_segment_mean', 'max_segment_mean', 'num_segments']

    result = []
    for row in row_item_array:
        gene_name = row['f'][0]['v']
        seqname = row['f'][1]['v']
        # TODO validation
        chromosome = seqname[3:]
        start = row['f'][2]['v']
        end = row['f'][3]['v']

        for value_field in VALUES:
            result.append({
                'num_search_hits': 0,
                'gene_name': gene_name,
                'value_field': value_field,
                'internal_feature_id': build_internal_feature_id(feature_type, value_field, chromosome, start, end)
            })

    return result


def main():
    config_file_path = cmdline_argv[1]
    config = load_config_json(config_file_path, CNVFeatureDefConfig)

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
