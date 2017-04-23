from scripts.feature_def_gen.feature_def_bq_provider import FeatureDefBigqueryProvider

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
    {
        'name': 'program_name',
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

    def build_feature_query(self, gene_label_field, table_name):
        query_template = \
            'SELECT \'{table_name}\' AS table_name, {gene_label_field} AS gene_label ' \
            'FROM [{table_name}] ' \
            'WHERE {gene_label_field} IS NOT NULL ' \
            'GROUP BY gene_label'

        query = query_template.format(
            gene_label_field=gene_label_field,
            table_name=table_name
        )

        return query

    def build_subqueries_for_tables(self, config):
        query_strings = []
        for table_item in config.data_table_list:
            query = self.build_feature_query(table_item.gene_label_field, table_item.table_id)
            query_strings.append(query)

        return query_strings

    def merge_queries(self, query_strings):
        # Union of the subqueries
        result = []

        for subquery in query_strings:
            result.append("   ({query})".format(query=subquery))

        sq_stmt = ',\n'.join(result)
        sq_stmt += ';'

        query_tpl = \
            'SELECT table_name, gene_label \n' \
            'FROM \n' \
            '{subquery_stmt}'

        query = query_tpl.format(subquery_stmt=sq_stmt)

        return query

    def build_table_mapping(self, config):
        result = {}
        for table_item in config.data_table_list:
            result[table_item.table_id] = table_item
        return result

    def build_query(self, config):
        query_strings = self.build_subqueries_for_tables(config)
        query = self.merge_queries(query_strings)
        return query

    def build_internal_feature_id(self, feature_type, gene, table_id):
        return '{feature_type}:{gene}:{table}'.format(
            feature_type=feature_type,
            gene=gene,
            table=table_id
        )

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
                'genomic_build': table_config.genomic_build,
                'value_label': table_config.value_label,
                'program_name': table_config.program,
                'internal_feature_id': self.build_internal_feature_id(feature_type, gene, table_config.internal_table_id)
            })

        return result