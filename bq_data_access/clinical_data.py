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

import logging
from re import compile as re_compile

from api.api_helpers import authorize_credentials_with_Google
from api.schema.tcga_clinical import schema as clinical_schema

from django.conf import settings

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import DataTypes, BigQuerySchemaToValueTypeConverter
import sys

CLINICAL_FEATURE_TYPE = 'CLIN'


class InvalidClinicalFeatureIDException(Exception):
    def __init__(self, feature_id, reason):
        self.feature_id = feature_id
        self.reason = reason

    def __str__(self):
        return "Invalid internal clinical feature ID '{feature_id}', reason '{reason}'".format(
            feature_id=self.feature_id,
            reason=self.reason
        )


class ClinicalFeatureDef(object):
    def __init__(self, table_field, value_type):
        self.table_field = table_field
        self.value_type = value_type

    @classmethod
    def get_table_field_and_value_type(cls, column_id):
        table_field = None
        value_type = None
        for clinical_field in clinical_schema:
            name, schema_field_type = clinical_field['name'], clinical_field['type']
            if name == column_id:
                table_field= name
                value_type = BigQuerySchemaToValueTypeConverter.get_value_type(schema_field_type)

        return table_field, value_type

    @classmethod
    def from_feature_id(cls, feature_id):
        # Example ID: CLIN:vital_status
        regex = re_compile("^CLIN:"
                           # column name
                           "([a-zA-Z0-9_\-]+)$")

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            raise FeatureNotFoundException(feature_id)
        column_name = feature_fields[0]

        table_field, value_type = cls.get_table_field_and_value_type(column_name)
        if table_field is None:
            raise FeatureNotFoundException(feature_id)

        return cls(table_field, value_type)


class ClinicalFeatureProvider(object):
    TABLES = [
        {
            'name': 'Clinical',
            'info': 'Clinical',
            'id': 'tcga_clinical'
        }
    ]

    def __init__(self, feature_id):
        self.table_name = ''
        self.parse_internal_feature_id(feature_id)

    def get_value_type(self):
        return self.feature_def.value_type

    def get_feature_type(self):
        return DataTypes.CLIN

    @classmethod
    def process_data_point(cls, data_point):
        return data_point['value']

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])

        query_template = \
            ("SELECT clin.ParticipantBarcode, biospec.sample_id, clin.{column_name} "
             "FROM ( "
             " SELECT ParticipantBarcode, {column_name} "
             " FROM [{project_name}:{dataset_name}.{table_name}] "
             " ) AS clin "
             " JOIN ( "
             " SELECT ParticipantBarcode, SampleBarcode as sample_id "
             " FROM [{project_name}:tcga_data_open.Biospecimen] "
             " ) AS biospec "
             " ON clin.ParticipantBarcode = biospec.ParticipantBarcode "
             "WHERE biospec.sample_id IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list}) AND study_id IS NULL"
             ")"
             "GROUP BY clin.ParticipantBarcode, biospec.sample_id, clin.{column_name}")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      column_name=feature_def.table_field,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt)

        logging.debug("BQ_QUERY_CLIN: " + query)
        return query

    def do_query(self, project_id, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array):
        bigquery_service = authorize_credentials_with_Google()
        query = self.build_query(project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array)

        query_body = {
            'query': query
        }

        print >> sys.stderr, "RUNNING QUERY: " + str(query)
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
                'aliquot_id': None,
                'value': row['f'][2]['v']
            })

        return result

    def get_data_from_bigquery(self, cohort_id_array, cohort_dataset, cohort_table):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        dataset_name = settings.BIGQUERY_DATASET2
        result = self.do_query(project_id, project_name, dataset_name, self.table_name, self.feature_def, cohort_dataset, cohort_table, cohort_id_array)
        return result

    def get_data(self, cohort_id_array, cohort_dataset, cohort_table):
        result = self.get_data_from_bigquery(cohort_id_array, cohort_dataset, cohort_table)
        return result

    def get_table_name(self):
        return self.TABLES[0]['name']

    def parse_internal_feature_id(self, feature_id):
        self.feature_def = ClinicalFeatureDef.from_feature_id(feature_id)
        self.table_name = self.get_table_name()
