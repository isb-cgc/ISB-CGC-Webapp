__author__ = 'llim'

import logging

from api.api_helpers import authorize_credentials_with_Google
from django.conf import settings
from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType, DataTypes

TABLES = [
    {
        'name': 'miRNA_BCGSC_GA_mirna',
        'info': 'miRNA (GA, BCGSC RPM)',
        'platform': 'IlluminaGA',
        'id': 'mirna_illumina_ga_rpm',
        'value_field': 'reads_per_million_miRNA_mapped'
    },
    {
        'name': 'miRNA_BCGSC_HiSeq_mirna',
        'info': 'miRNA (HiSeq, BCGSC RPM)',
        'platform': 'IlluminaHiSeq',
        'id': 'mirna_illumina_hiseq_rpm',
        'value_field': 'reads_per_million_miRNA_mapped'
    },
    {
        'name': 'miRNA_Expression_Values',
        'platform': 'both',
        'info': 'miRNA',
        'id': 'mirna',
        'value_field': 'normalized_count'
    }
]

TABLE_IDX_MIRNA_EXPRESSION = 2

VALUE_READS_PER_MILLION = 'RPM'
VALUE_NORMALIZED_COUNT = 'normalized_count'

MIRN_FEATURE_TYPE = 'MIRN'
COHORT_FIELD_NAME = 'sample_id'

def get_feature_type():
    return MIRN_FEATURE_TYPE

def build_feature_label(row):
    # Example: 'MicroRNA | miRNA Name:hsa-mir-126, Platform:IlluminaGA, Value:RPM'
    label = "MicroRNA | miRNA Name:" + row['mirna_name'] + ", Platform:" + row['platform'] + ", Value:" + row['value_field']
    return label

def build_internal_feature_id(name, platform, value):
    return '{feature_type}:{name}:{platform}:{value}'.format(
        feature_type=get_feature_type(),
        name=name,
        platform=platform,
        value=value
    )

def get_mirna_expression_table_info():
    return TABLES[TABLE_IDX_MIRNA_EXPRESSION]

def get_table_info(platform, value):
    table_info = None
    if value == VALUE_NORMALIZED_COUNT:
        table_info = get_mirna_expression_table_info()
    else:
        for table_entry in TABLES:
            if platform == table_entry['platform']:
                table_info = table_entry
    return table_info

def build_query(project_name, dataset_name, table_name, name, platform, value_field, cohort_dataset, cohort_table, cohort_id_array):
    # Generate the 'IN' statement string: (%s, %s, ..., %s)
    cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

    query_template =\
        ("SELECT ParticipantBarcode, SampleBarcode, AliquotBarcode, {value_field} AS value, {field} "
         "FROM [{project_name}:{dataset_name}.{table_name}] "
         "WHERE {field}='{name}' ")

    if table_name == get_mirna_expression_table_info()['name']:
            mir_name = 'mirna_id'
            query_template += " AND Platform='{platform}' "
    else:
            mir_name = 'miRNA_ID'

    query_template += \
        ("AND SampleBarcode IN ( "
        "    SELECT sample_barcode "
        "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
        "    WHERE cohort_id IN ({cohort_id_list}) "
        ") ")
    query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                  name=name, platform=platform, field=mir_name, value_field=value_field,
                                  cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                  cohort_id_list=cohort_id_stmt)

    logging.debug("BQ_QUERY_MIRN: " + query)
    return query

def do_query(project_id, project_name, dataset_name, table_name, name, platform, value_field, cohort_dataset, cohort_table, cohort_id_array):
    bigquery_service = authorize_credentials_with_Google()

    query = build_query(project_name, dataset_name, table_name, name, platform, value_field, cohort_dataset, cohort_table, cohort_id_array)
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
            'result': float(row['f'][3]['v'])
        })

    return result

def build_feature_query():
    queries = []
    platforms = []

    for table in TABLES:
        table_name = table['name']
        platforms.append(table['platform'])
        if table_name == get_mirna_expression_table_info()['name']:
            mir_name = 'mirna_id'
            query_template = ("SELECT {mir_name}, Platform \
                               FROM [{project_name}:{dataset_name}.{table_name}] \
                               GROUP BY {mir_name}, Platform")
        else:
            mir_name = 'miRNA_ID'
            query_template = ("SELECT {mir_name} \
                               FROM [{project_name}:{dataset_name}.{table_name}] \
                               GROUP BY {mir_name}")

        query_str = query_template.format(dataset_name=settings.BIGQUERY_DATASET2, mir_name=mir_name,
                                          project_name=settings.BIGQUERY_PROJECT_NAME, table_name=table_name)
        queries.append(query_str)

    return platforms, queries

def build_feature_table_stmt():
    stmt = ("CREATE TABLE IF NOT EXISTS {table_name} ( "
            "id int(11) unsigned NOT NULL AUTO_INCREMENT, "
            "mirna_name tinytext, "
            "platform tinytext, "
            "num_search_hits tinytext, "
            "value_field tinytext, "
            "internal_feature_id tinytext, "
            "PRIMARY KEY (id))").format(table_name='feature_defs_mirn')

    fieldnames = ['mirna_name', 'platform', 'num_search_hits', 'value_field', 'internal_feature_id']

    return fieldnames, stmt

def insert_features_stmt():
    stmt = ("INSERT INTO {table_name} "
            "(mirna_name, platform, num_search_hits, value_field, internal_feature_id) "
            "VALUES (%s, %s, %s, %s, %s)").format(table_name='feature_defs_mirn')

    return stmt

def parse_response(row, platform):
    result = []
    mir_name = row[0]['v']
    if platform == TABLES[2]['platform']:
        platform = row[1]['v']
        value = VALUE_NORMALIZED_COUNT
    else:
        value = VALUE_READS_PER_MILLION

    result.append({
        'mirna_name': mir_name,
        'platform': platform,
        'num_search_hits': 0,
        'value_field': value,
        'internal_feature_id': build_internal_feature_id(mir_name, platform, value)
    })

    return 1, result

class MIRNFeatureProvider(object):
    def __init__(self, feature_id):
        self.feature_type = ''
        self.name_label = ''
        self.platform = ''
        self.table_info = None
        self.value_field = ''
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return ValueType.FLOAT

    def get_feature_type(self):
        return DataTypes.MIRN

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['result'])

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = do_query(project_id, project_name, dataset_name, self.table_name, self.name_label,
                          self.platform, self.value_field,
                          cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def validate_internal_feature_id(self, feature_id):
        pass

    def parse_internal_feature_id(self, feature_id):
        feature_type, name_label, platform, value = feature_id.split(':')
        self.feature_type = feature_type
        self.name_label = name_label
        self.platform = platform
        self.table_info = get_table_info(platform, value)

        if self.table_info is None:
            raise FeatureNotFoundException(feature_id)

        self.table_name = self.table_info['name']
        self.value_field = self.table_info['value_field']
