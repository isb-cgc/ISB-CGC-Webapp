#
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
#

from builtins import object
import logging
from json import loads as json_loads

from django.conf import settings
from google_helpers.bigquery.service import get_bigquery_service
from bq_data_access.v2.seqpeek_maf_data import SeqPeekDataSourceConfig
from bq_data_access.data_types.seqpeek import BIGQUERY_CONFIG as SEQPEEK_BIGQUERY_CONFIG


class SeqPeekMAFWithCohorts(object):
    def __init__(self, maf_vector, cohort_info):
        self.maf_vector = maf_vector
        self.cohort_info = cohort_info


class InterProDataProvider(object):
    def __init__(self):
        self.data_source_config = SeqPeekDataSourceConfig.from_dict(SEQPEEK_BIGQUERY_CONFIG)

    def build_query(self, ensg_id):
        query_template = "SELECT jsonString FROM [{table_id}] WHERE Gene=\'{ensg_id}\'"

        query = query_template.format(
            table_id=self.data_source_config.interpro_reference_table_id,
            ensg_id=ensg_id
        )
        logger.debug("INTERPRO SQL: " + query)
        return query

    def do_query(self, project_id, ensg_id):
        bigquery_service = get_bigquery_service()

        query = self.build_query(ensg_id)
        query_body = {
            'query': query
        }

        table_data = bigquery_service.jobs()
        query_response = table_data.query(projectId=project_id, body=query_body).execute()

        num_result_rows = int(query_response['totalRows'])
        if num_result_rows == 0:
            return None

        row = query_response['rows'][0]
        interpro_literal = row['f'][0]['v']
        interpro_literal = interpro_literal.replace('\'', '"')
        interpro_literal = json_loads(interpro_literal)

        return interpro_literal

    def get_data_from_bigquery(self, ensg_id):
        project_id = settings.BIGQUERY_PROJECT_ID
        result = self.do_query(project_id, ensg_id)
        return result

    def get_data(self, uniprot_id):
        return self.get_data_from_bigquery(uniprot_id)
