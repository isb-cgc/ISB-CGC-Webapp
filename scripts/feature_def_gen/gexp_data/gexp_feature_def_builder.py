from scripts.feature_def_gen.feature_def_bq_provider import FeatureDefBigqueryProvider

MYSQL_SCHEMA = [
    {
        'name': 'gene_name',
        'type': 'string'
    },
    {
        'name': 'internal_feature_id',
        'type': 'string'
    },
    {
        'name': 'genomic_build',
        'type': 'string'
    },
]


# TODO remove duplicate code
def get_feature_type():
    return 'GEXP'


class GEXPFeatureDefBuilder(FeatureDefBigqueryProvider):
    def get_mysql_schema(self):
        return MYSQL_SCHEMA

    def build_query(self, config):
        outer_template = \
            'SELECT build_id, gene_label \n' \
            'FROM \n' \
            '{subquery_stmt}'

        build_queries = []
        for build in self.config.supported_genomic_builds:
            build_template = \
                '(' \
                'SELECT \'{build_id}\' AS build_id, gene_label \n' \
                'FROM (' \
                '   SELECT gene_label \n' \
                '   FROM \n' \
                '   {build_tables_stmt} \n' \
                '   GROUP BY gene_label \n' \
                '))'

            # Find tables that match the platform
            build_tables = [t for t in config.data_table_list if t.genomic_build == build]

            table_queries = []
            for table_config in build_tables:
                table_query_template = \
                    '(' \
                    'SELECT {gene_label_field} AS gene_label ' \
                    'FROM [{table_name}] ' \
                    'WHERE {gene_label_field} IS NOT NULL ' \
                    ')'

                table_query_str = table_query_template.format(
                    gene_label_field=table_config.gene_label_field,
                    table_name=table_config.table_id
                )

                table_queries.append(table_query_str)

            build_stmt = ',\n'.join(table_queries)
            build_query = build_template.format(build_id=build,
                                                build_tables_stmt=build_stmt)
            build_queries.append(build_query)

        sq_stmt = ',\n'.join(build_queries)
        sq_stmt += ';'

        outer_query = outer_template.format(subquery_stmt=sq_stmt)
        return outer_query

    def build_internal_feature_id(self, feature_type, gene, genomic_build):
        return 'v2:{feature_type}:{gene}:mrna_{genomic_build}'.format(
            feature_type=feature_type,
            gene=gene,
            genomic_build=genomic_build
        )

    def unpack_query_response(self, row_item_array):
        feature_type = get_feature_type()
        result = []

        for row in row_item_array:
            genomic_build = row['f'][0]['v']
            gene = row['f'][1]['v']
            if gene is None:
                continue

            result.append({
                'gene_name': gene,
                'genomic_build': genomic_build,
                'internal_feature_id': self.build_internal_feature_id(feature_type, gene, genomic_build)
            })

        return result