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

from json import loads as json_loads
import logging
from api.api_helpers import authorize_credentials_with_Google

from django.conf import settings


class SeqPeekMAFWithCohorts(object):
    def __init__(self, maf_vector, cohort_info):
        self.maf_vector = maf_vector
        self.cohort_info = cohort_info


class InterProDataProvider(object):
    def __init__(self):
        logging.debug(__name__ + ".__init__")

    def build_query(self, project_name, uniprot_id):
        query_template = "SELECT * FROM [{project_name}:test.interpro_filtered] WHERE uniprot_id=\'{uniprot_id}\'"

        query = query_template.format(project_name=project_name, uniprot_id=uniprot_id)
        logging.debug("INTERPRO SQL: " + query)
        return query

    def do_query(self, project_id, project_name, uniprot_id):
        bigquery_service = authorize_credentials_with_Google()

        query = self.build_query(project_name, uniprot_id)
        query_body = {
            'query': query
        }

        table_data = bigquery_service.jobs()
        query_response = table_data.query(projectId=project_id, body=query_body).execute()

        num_result_rows = int(query_response['totalRows'])
        if num_result_rows == 0:
            return None

        row = query_response['rows'][0]
        interpro_literal = row['f'][1]['v']
        interpro_literal = interpro_literal.replace('\'', '"')
        interpro_literal = json_loads(interpro_literal)

        return interpro_literal

    def get_data_from_bigquery(self, uniprot_id):
        project_id = settings.BQ_PROJECT_ID
        project_name = settings.BIGQUERY_PROJECT_NAME
        result = self.do_query(project_id, project_name, uniprot_id)
        return result

    def get_data(self, uniprot_id):
        return self.get_data_from_bigquery(uniprot_id)
