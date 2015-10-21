__author__ = 'llim'


import logging
from api.api_helpers import authorize_credentials_with_Google

from django.conf import settings

from bq_data_access.feature_value_types import ValueType, DataTypes, DataPointIdentifierTools
from bq_data_access.cohort_utils import CohortQueryBuilder

CNVR_FEATURE_TYPE = 'CNVR'
IDENTIFIER_COLUMN_NAME = 'sample_id'

TABLES = [
    {
        'name': 'CNV',
        'info': 'CNV',
        'id': 'cnv'
    }
]

VALUES = ['avg_segment_mean', 'std_dev_segment_mean', 'min_segment_mean', 'max_segment_mean', 'num_segments']

def get_feature_type():
    return CNVR_FEATURE_TYPE

def get_table_name():
    return TABLES[0]['name']

def build_feature_label(row):
    # Example: 'Copy Number | Gene:EGFR, Value:avg_segment_mean'
    label = "Copy Number | Gene:" + row['gene_name'] + ", Value:" + row['value_field']
    return label

def build_internal_feature_id(value, chr, start, end):
    return '{feature_type}:{value}:{chr}:{start}:{end}'.format(
        feature_type=get_feature_type(),
        value=value,
        chr=chr,
        start=start,
        end=end
    )

def validate_input(query_table_id):
    valid_tables = set([x['id'] for x in TABLES])
    if query_table_id not in valid_tables:
        raise Exception("Invalid table ID for copy number")

def build_query(project_name, dataset_name, table_name, chr, start, end, cohort_dataset, cohort_table, cohort_id_array):
    # Generate the 'IN' statement string: (%s, %s, ..., %s)
    cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

    query_template = \
        ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, AVG(Segment_Mean) avg, STDDEV(Segment_Mean) sigma, MIN(Segment_Mean) min, MAX(Segment_Mean) max, COUNT(*) cnt "
         "FROM [{project_name}:{dataset_name}.{table_name}] "
         "WHERE ( Chromosome='{chr}' AND ( "
         "        ( Start<{start} AND End>{start} ) OR "
         "        ( Start>{start}-1 AND Start<{end}+1 ) ) ) "
         "AND SampleBarcode IN ( "
         "    SELECT sample_barcode "
         "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
         "    WHERE cohort_id IN ({cohort_id_list}) "
         ") "
         "GROUP BY ParticipantBarcode, SampleBarcode, AliquotBarcode")

    query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                  chr=chr, start=start, end=end,
                                  cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                  cohort_id_list=cohort_id_stmt)

    logging.debug("BQ_QUERY_CNVR: " + query)
    return query

def do_query(project_id, project_name, dataset_name, table_name, chr, start, end, cohort_dataset, cohort_table, cohort_id_array):
    bigquery_service = authorize_credentials_with_Google()

    query = build_query(project_name, dataset_name, table_name, chr, start, end, cohort_dataset, cohort_table, cohort_id_array)
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
            'mean': row['f'][3]['v'],
            'sd': row['f'][4]['v'],
            'min': row['f'][5]['v'],
            'max': row['f'][6]['v'],
            'count': row['f'][7]['v']
        })
    # print result
    return result

def build_feature_query():
    query_template = ("SELECT gene_name, seqname, start, end \
                       FROM [{project_name}:{dataset_name}.{table_name}] \
                       WHERE feature=\'gene\'")

    query_str = query_template.format(dataset_name='genomic_reference', project_name=settings.BIGQUERY_PROJECT_NAME, table_name='GENCODE')

    return [query_str]

def build_feature_table_stmt():
    stmt = ("CREATE TABLE IF NOT EXISTS {table_name} ( "
            "id int(11) unsigned NOT NULL AUTO_INCREMENT, "
            "gene_name tinytext, "
            "num_search_hits tinytext, "
            "value_field tinytext, "
            "internal_feature_id tinytext, "
            "PRIMARY KEY (id))").format(table_name='feature_defs_cnvr')

    fieldnames = ['gene_name', 'num_search_hits', 'value_field', 'internal_feature_id']

    return fieldnames, stmt

def insert_features_stmt():
    stmt = ("INSERT INTO {table_name} "
            "(gene_name, num_search_hits, value_field, internal_feature_id) "
            "VALUES (%s, %s, %s, %s)").format(table_name='feature_defs_cnvr')

    return stmt

def parse_response(row):
    result = []

    gene = row[0]['v']
    chr = row[1]['v'][3:]
    start = row[2]['v']
    end = row[3]['v']

    for value in VALUES:
        result.append({
            'gene_name': gene,
            'num_search_hits': 0,
            'value_field': value,
            'internal_feature_id': build_internal_feature_id(value, chr, start, end)
        })

    return len(VALUES), result

class CNVRFeatureProvider(object):
    def __init__(self, feature_id):
        self.feature_type = ''
        self.gene_label = ''
        self.chr_label = ''
        self.start = ''
        self.end = ''
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.CNVR

    @classmethod
    # TODO: fix hardcoded data point
    def process_data_point(cls, data_point):
        return str(data_point['mean'])

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = do_query(project_id, project_name, dataset_name,
                          self.table_name, self.chr_label[3:], self.start, self.end,
                          cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def parse_internal_feature_id(self, feature_id):
        try:
            feature_type, gene_label, chr_label, start, end = feature_id.split(':')
            self.feature_type = feature_type
            self.gene_label = gene_label
            self.chr_label = chr_label
            self.start = start
            self.end = end
            self.table_name = get_table_name()
        except:
            raise Exception("Invalid internal CNVR feature ID '{feature_id}'".format(feature_id=feature_id))