__author__ = 'llim'

import logging
from api.api_helpers import authorize_credentials_with_Google

from django.conf import settings

from bq_data_access.feature_value_types import ValueType, DataTypes

METH_FEATURE_TYPE = 'METH'
IDENTIFIER_COLUMN_NAME = 'sample_id'

TABLES = [
    {
        'name': 'Methylation_chr1',
        'info': 'Methylation chr1',
        'id': 'methylation_chr1'
    },
    {
        'name': 'Methylation_chr2',
        'info': 'Methylation chr2',
        'id': 'methylation_chr2'
    },
    {
        'name': 'Methylation_chr3',
        'info': 'Methylation chr3',
        'id': 'methylation_chr3'
    },
    {
        'name': 'Methylation_chr4',
        'info': 'Methylation chr4',
        'id': 'methylation_chr4'
    },
    {
        'name': 'Methylation_chr5',
        'info': 'Methylation chr5',
        'id': 'methylation_chr5'
    },
    {
        'name': 'Methylation_chr6',
        'info': 'Methylation chr6',
        'id': 'methylation_chr6'
    },
    {
        'name': 'Methylation_chr7',
        'info': 'Methylation chr7',
        'id': 'methylation_chr7'
    },
    {
        'name': 'Methylation_chr8',
        'info': 'Methylation chr8',
        'id': 'methylation_chr8'
    },
    {
        'name': 'Methylation_chr9',
        'info': 'Methylation chr9',
        'id': 'methylation_chr9'
    },
    {
        'name': 'Methylation_chr10',
        'info': 'Methylation chr10',
        'id': 'methylation_chr10'
    },
    {
        'name': 'Methylation_chr11',
        'info': 'Methylation chr11',
        'id': 'methylation_chr11'
    },
    {
        'name': 'Methylation_chr12',
        'info': 'Methylation chr12',
        'id': 'methylation_chr12'
    },
    {
        'name': 'Methylation_chr13',
        'info': 'Methylation chr13',
        'id': 'methylation_chr13'
    },
    {
        'name': 'Methylation_chr14',
        'info': 'Methylation chr14',
        'id': 'methylation_chr14'
    },
    {
        'name': 'Methylation_chr15',
        'info': 'Methylation chr15',
        'id': 'methylation_chr15'
    },
    {
        'name': 'Methylation_chr16',
        'info': 'Methylation chr16',
        'id': 'methylation_chr16'
    },
    {
        'name': 'Methylation_chr17',
        'info': 'Methylation chr17',
        'id': 'methylation_chr17'
    },
    {
        'name': 'Methylation_chr18',
        'info': 'Methylation chr18',
        'id': 'methylation_chr18'
    },
    {
        'name': 'Methylation_chr19',
        'info': 'Methylation chr19',
        'id': 'methylation_chr19'
    },
    {
        'name': 'Methylation_chr20',
        'info': 'Methylation chr20',
        'id': 'methylation_chr20'
    },
    {
        'name': 'Methylation_chr21',
        'info': 'Methylation chr21',
        'id': 'methylation_chr21'
    },
    {
        'name': 'Methylation_chr22',
        'info': 'Methylation chr22',
        'id': 'methylation_chr22'
    },
    {
        'name': 'Methylation_chrX',
        'info': 'Methylation chrX',
        'id': 'methylation_chrX'
    },
    {
        'name': 'Methylation_chrY',
        'info': 'Methylation chrY',
        'id': 'methylation_chrY'
    }
]

VALUES = ['beta_value']

def get_feature_type():
    return METH_FEATURE_TYPE

def get_real_table_name(table_id):
    table_name = None
    for table_info in TABLES:
        if table_id == table_info['id']:
            table_name = table_info['name']

    return table_name

def get_table_id(chr):
    table_id = None
    for table_info in TABLES:
        if chr in table_info['id']:
            table_id = table_info['id']

    return table_id

def build_feature_label(row):
    # Example: 'Methylation | Probe:cg07311521, Gene:EGFR, Gene Region:TSS1500, Relation to CpG Island:Island, Platform:HumanMethylation450, Value:beta_value'
    # If value is not present, display '-'
    if row['gene_name'] is '':
        row['gene_name'] = "-"
        row['relation_to_gene'] = "-"
    if row['relation_to_island'] is '':
        row['relation_to_island'] = "-"

    label = "Methylation | Probe:" + row['probe_name'] + ", Gene:" + row['gene_name'] + \
            ", Gene Region:" + row['relation_to_gene'] + ", CpG Island Region:" + row['relation_to_island'] + \
            ", Platform:" + row['platform'] + ", Value:" + row['value_field']
    return label

def build_internal_feature_id(probe, platform, chr):
    return '{feature_type}:{probe}:{platform}:{table_id}'.format(
        feature_type=get_feature_type(),
        probe=probe,
        platform=platform,
        table_id=get_table_id(chr)
    )

def validate_input(query_table_id):
    valid_tables = set([x['id'] for x in TABLES])
    if query_table_id not in valid_tables:
        raise Exception("Invalid table ID for methylation")

def build_query(project_name, dataset_name, table_name, probe, platform, cohort_dataset, cohort_table, cohort_id_array):
    # Generate the 'IN' statement string: (%s, %s, ..., %s)
    cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

    query_template = \
        ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, beta_value "
         "FROM [{project_name}:{dataset_name}.{table_name}] "
         "WHERE ( Probe_Id='{probe_id}' AND Platform='{platform}') "
         "AND SampleBarcode IN ( "
         "    SELECT sample_barcode "
         "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
         "    WHERE cohort_id IN ({cohort_id_list}) "
         ") ")

    query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                  probe_id=probe, platform=platform,
                                  cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                  cohort_id_list=cohort_id_stmt)

    logging.debug("BQ_QUERY_METH: " + query)
    return query

def do_query(project_id, project_name, dataset_name, table_name, probe_label, platform_label, cohort_dataset, cohort_table, cohort_id_array):
    bigquery_service = authorize_credentials_with_Google()

    query = build_query(project_name, dataset_name, table_name, probe_label, platform_label, cohort_dataset, cohort_table, cohort_id_array)
    query_body = {
        'query': query
    }

    table_data = bigquery_service.jobs()
    query_response = table_data.query(projectId=project_id, body=query_body).execute()

    result = []
    num_result_rows = int(query_response['totalRows'])
    if num_result_rows == 0:
        return result

    for row in query_response['rows']:
        result.append({
            'patient_id': row['f'][0]['v'],
            'sample_id': row['f'][1]['v'],
            'aliquot_id': row['f'][2]['v'],
            'beta_value': float(row['f'][3]['v'])
        })

    return result

def build_feature_query():
    query_template = ("SELECT GENEcpg.UCSC.RefGene_Name, GENEcpg.UCSC.RefGene_Group, \
                              GENEcpg.Relation_to_UCSC_CpG_Island, GENEcpg.Name, data.Platform, GENEcpg.CHR \
                       FROM ( \
                          SELECT UCSC.RefGene_Name, UCSC.RefGene_Group, Name, Relation_to_UCSC_CpG_Island, CHR \
                          FROM [{project_name}:platform_reference.methylation_annotation] \
                          WHERE REGEXP_MATCH(Name,\'^cg\') \
                          GROUP BY UCSC.RefGene_Name, UCSC.RefGene_Group, Name, Relation_to_UCSC_CpG_Island, CHR \
                          ) AS GENEcpg \
                       JOIN EACH ( \
                          SELECT Probe_Id, Platform \
                          FROM [{project_name}:tcga_data_open.Methylation] \
                          WHERE REGEXP_MATCH(Probe_Id,\'^cg\') \
                          GROUP BY Probe_Id, Platform \
                          ) AS data \
                       ON GENEcpg.Name = data.Probe_Id ")

    query_str = query_template.format(project_name=settings.BIGQUERY_PROJECT_NAME)

    return [query_str]

def build_feature_table_stmt():
    stmt = ("CREATE TABLE IF NOT EXISTS {table_name} ( "
            "id int(11) unsigned NOT NULL AUTO_INCREMENT, "
            "gene_name tinytext, "
            "probe_name tinytext, "
            "platform tinytext, "
            "relation_to_gene tinytext, "
            "relation_to_island tinytext, "
            "num_search_hits tinytext, "
            "value_field tinytext, "
            "internal_feature_id tinytext, "
            "PRIMARY KEY (id))").format(table_name='feature_defs_meth')

    fieldnames = ['gene_name', 'probe_name', 'platform', 'relation_to_gene', 'relation_to_island', 'num_search_hits', 'value_field', 'internal_feature_id']

    return fieldnames, stmt

def insert_features_stmt():
    stmt = ("INSERT INTO {table_name} "
            "(gene_name, probe_name, platform, relation_to_gene, relation_to_island, num_search_hits, value_field, internal_feature_id) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s)").format(table_name='feature_defs_meth')

    return stmt

def parse_response(row):
    result = []

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

    for value in VALUES:
        result.append({
            'gene_name': gene,
            'probe_name': probe,
            'platform': platform,
            'relation_to_gene': relation_to_gene,
            'relation_to_island': relation_to_island,
            'num_search_hits': 0,
            'value_field': value,
            'internal_feature_id': build_internal_feature_id(probe, platform, chr)
        })

    return len(VALUES), result

class METHFeatureProvider(object):
    def __init__(self, feature_id):
        self.feature_type = ''
        self.cpg_probe = ''
        self.table_name = ''
        self.platform = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.METH

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['beta_value'])

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = do_query(project_id, project_name, dataset_name,
                          self.table_name, self.cpg_probe, self.platform,
                          cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def parse_internal_feature_id(self, feature_id):
        try:
            feature_type, probe_label, platform_label, table_id = feature_id.split(':')
            self.feature_type = feature_type
            self.cpg_probe = probe_label
            self.table_name = get_real_table_name(table_id)
            self.platform = platform_label
        except:
            raise Exception("Invalid internal METH feature ID '{feature_id}'".format(feature_id=feature_id))

