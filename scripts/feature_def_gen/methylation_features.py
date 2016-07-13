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

import logging

from feature_def_bq_provider import FeatureDefBigqueryProvider

from scripts.feature_def_gen.feature_def_utils import DataSetConfig

logger = logging




class METHFeatureDefConfig(object):
    def __init__(self, project_id, reference, target_config, data_table, feature_id_prefix, annotation_table, out_path):
        self.project_id = project_id
        self.reference_config = reference
        self.target_config = target_config
        self.data_table_name = data_table
        self.feature_id_prefix = feature_id_prefix
        self.annotation_table_name = annotation_table
        self.output_csv_path = out_path

    @classmethod
    def from_dict(cls, param):
        project_id = param['project_id']
        reference_config = DataSetConfig.from_dict(param['reference_config'])
        target_config = DataSetConfig.from_dict(param['target_config'])
        data_table = param['methylation_table_name']
        feature_id_prefix = param['methylation_feature_id_prefix']
        annotation_table = param['methylation_annotation_table_name']
        output_csv_path = param['output_csv_path']

        return cls(project_id, reference_config, target_config, data_table, feature_id_prefix, annotation_table, output_csv_path)


# TODO remove duplicate code
def get_feature_type():
    return 'METH'


def build_internal_feature_id(feature_type, probe, platform, chromosome, table_id_prefix):
    return '{feature_type}:{probe}:{platform}:{table_id}'.format(
        feature_type=feature_type,
        probe=probe,
        platform=platform,
        table_id=table_id_prefix + chromosome
    )


class METHFeatureDefProvider(FeatureDefBigqueryProvider):
    VALUES = ['beta_value']
    MYSQL_SCHEMA = [
        {
            'name': 'gene_name',
            'type': 'string'
        },
        {
            'name': 'probe_name',
            'type': 'string'
        },
        {
            'name': 'platform',
            'type': 'string'
        },
        {
            'name': 'relation_to_gene',
            'type': 'string'
        },
        {
            'name': 'relation_to_island',
            'type': 'string'
        },
        {
            'name': 'value_field',
            'type': 'string'
        },
        {
            'name': 'internal_feature_id',
            'type': 'string'
        },
    ]

    def get_mysql_schema(self):
        return self.MYSQL_SCHEMA

    def build_create_table_stmt(self, table_name):
        return ("CREATE TABLE IF NOT EXISTS {table_name} ( "
                "id int(11) unsigned NOT NULL AUTO_INCREMENT, "
                "gene_name tinytext, "
                "probe_name tinytext, "
                "platform tinytext, "
                "relation_to_gene tinytext, "
                "relation_to_island tinytext, "
                "num_search_hits tinytext, "
                "value_field tinytext, "
                "internal_feature_id tinytext, "
                "PRIMARY KEY (id))").format(table_name=table_name)

    def insert_features_stmt(self, table_name):
        stmt = ("INSERT INTO {table_name} "
                "(gene_name, probe_name, platform, relation_to_gene, relation_to_island, value_field, internal_feature_id) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)").format(table_name=table_name)

        return stmt

    def build_query(self, config):
        query_template = (
            "SELECT GENEcpg.UCSC.RefGene_Name, GENEcpg.UCSC.RefGene_Group, \
                    GENEcpg.Relation_to_UCSC_CpG_Island, GENEcpg.Name, data.Platform, GENEcpg.CHR \
               FROM ( \
                  SELECT UCSC.RefGene_Name, UCSC.RefGene_Group, Name, Relation_to_UCSC_CpG_Island, CHR \
                  FROM [{reference_project_name}:{reference_dataset}.{methylation_annotation_table_name}] \
                  WHERE REGEXP_MATCH(Name,\'^cg\') \
                  GROUP BY UCSC.RefGene_Name, UCSC.RefGene_Group, Name, Relation_to_UCSC_CpG_Island, CHR \
                  ) AS GENEcpg \
               JOIN EACH ( \
                  SELECT Probe_Id, Platform \
                  FROM [{main_project_name}:{open_access_dataset}.{methylation_table_name}] \
                  WHERE REGEXP_MATCH(Probe_Id,\'^cg\') \
                  GROUP BY Probe_Id, Platform \
                  ) AS data \
               ON GENEcpg.Name = data.Probe_Id ")

        query = query_template.format(
            reference_project_name=config.reference_config.project_name,
            reference_dataset=config.reference_config.dataset_name,
            main_project_name=config.target_config.project_name,
            open_access_dataset=config.target_config.dataset_name,
            methylation_annotation_table_name=config.annotation_table_name,
            methylation_table_name=config.data_table_name
        )

        return query

    def unpack_query_response(self, row_item_array):
        feature_type = get_feature_type()
        result = []

        for row_item in row_item_array:
            row = row_item['f']

            gene = row[0]['v']
            relation_to_gene = row[1]['v']
            relation_to_island = row[2]['v']
            probe = row[3]['v']
            platform = row[4]['v']
            chr = row[5]['v']

            if gene is None:
                gene = ''
                relation_to_gene = ''
            if relation_to_island is None:
                relation_to_island = ''

            for value in self.VALUES:
                result.append({
                    'gene_name': gene,
                    'probe_name': probe,
                    'platform': platform,
                    'relation_to_gene': relation_to_gene,
                    'relation_to_island': relation_to_island,
                    'value_field': value,
                    'internal_feature_id': build_internal_feature_id(feature_type, probe, platform, chr, self.config.feature_id_prefix)
                })

        return result


