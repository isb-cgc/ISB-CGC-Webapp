###
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

import logging

from scripts.feature_def_gen.feature_def_bq_provider import FeatureDefBigqueryProvider

logger = logging


# TODO remove duplicate code
def get_feature_type():
    return 'METH'


def build_internal_feature_id(feature_type, probe, platform, chromosome, table_config):
    # Example ID: v2:METH:cg08246323:HumanMethylation450:hg19_chr16
    return 'v2:{feature_type}:{probe}:{platform}:{table_id}'.format(
        feature_type=feature_type,
        genomic_build=table_config.genomic_build,
        probe=probe,
        platform=platform,
        table_id=table_config.genomic_build + '_chr' + chromosome.lower()
    )


class METHFeatureDefBuilder(FeatureDefBigqueryProvider):
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
        {
            'name': 'program_name',
            'type': 'string'
        },
        {
            'name': 'genomic_build',
            'type': 'string'
        },
    ]

    def __init__(self, config, chromosome_array=[]):
        super(METHFeatureDefBuilder, self).__init__(config)
        self.chromosome_array = chromosome_array

    def get_mysql_schema(self):
        return self.MYSQL_SCHEMA

    def build_query(self, config):
        outer_template = \
            'SELECT table_id, GENEcpg.UCSC.RefGene_Name, GENEcpg.UCSC.RefGene_Group, \n ' \
            '       GENEcpg.Relation_to_UCSC_CpG_Island, GENEcpg.Name, data.Platform, GENEcpg.CHR \n' \
            'FROM \n' \
            '{subquery_stmt}'

        matching_tables = []
        for chromosome in self.chromosome_array:
            for table_config in config.data_table_list:
                if table_config.chromosome == chromosome:
                    logger.info("Found matching table for chromosome {c}: {table_id}".format(
                        c=chromosome, table_id=table_config.table_id
                    ))
                    matching_tables.append(table_config)

        table_queries = []
        for table_config in matching_tables:
            query_template = (
                "( \
                 SELECT '{methylation_table_id}' AS table_id, GENEcpg.UCSC.RefGene_Name, GENEcpg.UCSC.RefGene_Group, \
                        GENEcpg.Relation_to_UCSC_CpG_Island, GENEcpg.Name, data.Platform, GENEcpg.CHR \
                   FROM ( \
                      SELECT UCSC.RefGene_Name, UCSC.RefGene_Group, Name, Relation_to_UCSC_CpG_Island, CHR \
                      FROM [{methylation_annotation_table_id}] \
                      WHERE REGEXP_MATCH(Name,\'^cg\') \
                      GROUP BY UCSC.RefGene_Name, UCSC.RefGene_Group, Name, Relation_to_UCSC_CpG_Island, CHR \
                      ) AS GENEcpg \
                   JOIN EACH ( \
                      SELECT Probe_Id, Platform \
                      FROM [{methylation_table_id}] \
                      WHERE REGEXP_MATCH(Probe_Id,\'^cg\') \
                      GROUP BY Probe_Id, Platform \
                      ) AS data \
                   ON GENEcpg.Name = data.Probe_Id \
                )")

            query_str = query_template.format(
                methylation_annotation_table_id=config.methylation_annotation_table_id,
                methylation_table_id=table_config.table_id
            )

            table_queries.append(query_str)

        sq_stmt = ',\n'.join(table_queries)
        sq_stmt += ';'

        outer_query = outer_template.format(subquery_stmt=sq_stmt)
        return outer_query

    def build_table_mapping(self, config):
        result = {}
        for table_item in config.data_table_list:
            result[table_item.table_id] = table_item
        return result

    def unpack_query_response(self, row_item_array):
        table_config_mapping = self.build_table_mapping(self.config)
        feature_type = get_feature_type()
        result = []

        for row_item in row_item_array:
            row = row_item['f']
            table_id = row[0]['v']

            gene = row[1]['v']
            relation_to_gene = row[2]['v']
            relation_to_island = row[3]['v']
            probe = row[4]['v']
            platform = row[5]['v']
            chromosome = row[6]['v']

            table_config = table_config_mapping[table_id]

            if gene is None:
                gene = ''
                relation_to_gene = ''
            if relation_to_island is None:
                relation_to_island = ''

            for value in self.VALUES:
                result.append({
                    'genomic_build': table_config.genomic_build,
                    'program_name': table_config.program,
                    'gene_name': gene,
                    'probe_name': probe,
                    'platform': platform,
                    'relation_to_gene': relation_to_gene,
                    'relation_to_island': relation_to_island,
                    'value_field': value,
                    'internal_feature_id': build_internal_feature_id(feature_type, probe, platform, chromosome, table_config)
                })

        return result


