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
from __future__ import print_function

# Python example modified from https://cloud.google.com/bigquery/loading-data-into-bigquery
from future import standard_library
standard_library.install_aliases()
from urllib.error import HTTPError
import pprint
from googleapiclient.discovery import build
import httplib2
import time
import os
from oauth2client.client import flow_from_clientsecrets
from oauth2client.file import Storage
from oauth2client import tools

schema_fm = [
    {
        'name': 'sample',
        'type': 'STRING'
    },
    {
        'name': 'percent_lymphocyte_infiltration',
        'type': 'STRING'
    },
    {
        'name': 'percent_monocyte_infiltration',
        'type': 'STRING'
    },
    {
        'name': 'percent_necrosis',
        'type': 'STRING'
    },
    {
        'name': 'percent_neutrophil_infiltration',
        'type': 'STRING'
    },
    {
        'name': 'percent_normal_cells',
        'type': 'STRING'
    },
    {
        'name': 'percent_stromal_cells',
        'type': 'STRING'
    },
    {
        'name': 'percent_tumor_cells',
        'type': 'STRING'
    },
    {
        'name': 'percent_tumor_nuclei',
        'type': 'STRING'
    },
    {
        'name': 'gender',
        'type': 'STRING'
    },
    {
        'name': 'history_of_neoadjuvant_treatment',
        'type': 'STRING'
    },
    {
        'name': 'icd_o_3_histology',
        'type': 'STRING'
    },
    {
        'name': 'other_dx',
        'type': 'STRING'
    },
    {
        'name': 'vital_status',
        'type': 'STRING'
    },
    {
        'name': 'country',
        'type': 'STRING'
    },
    {
        'name': 'disease_code',
        'type': 'STRING'
    },
    {
        'name': 'histological_type',
        'type': 'STRING'
    },
    {
        'name': 'icd_10',
        'type': 'STRING'
    },
    {
        'name': 'icd_o_3_site',
        'type': 'STRING'
    },
    {
        'name': 'tumor_tissue_site',
        'type': 'STRING'
    },
    {
        'name': 'tumor_type',
        'type': 'STRING'
    },
    {
        'name': 'age_at_initial_pathologic_diagnosis',
        'type': 'STRING'
    },
    {
        'name': 'days_to_birth',
        'type': 'STRING'
    },
    {
        'name': 'days_to_initial_pathologic_diagnosis',
        'type': 'STRING'
    },
    {
        'name': 'year_of_initial_pathologic_diagnosis',
        'type': 'STRING'
    },
    {
        'name': 'days_to_last_known_alive',
        'type': 'STRING'
    },
    {
        'name': 'tumor_necrosis_percent',
        'type': 'STRING'
    },
    {
        'name': 'tumor_nuclei_percent',
        'type': 'STRING'
    },
    {
        'name': 'tumor_weight',
        'type': 'STRING'
    },
    {
        'name': 'person_neoplasm_cancer_status',
        'type': 'STRING'
    },
    {
        'name': 'pathologic_N',
        'type': 'STRING'
    },
    {
        'name': 'radiation_therapy',
        'type': 'STRING'
    },
    {
        'name': 'pathologic_T',
        'type': 'STRING'
    },
    {
        'name': 'race',
        'type': 'STRING'
    },
    {
        'name': 'days_to_last_followup',
        'type': 'STRING'
    },
    {
        'name': 'ethnicity',
        'type': 'STRING'
    },
    {
        'name': 'TP53',
        'type': 'STRING'
    },
    {
        'name': 'RB1',
        'type': 'STRING'
    },
    {
        'name': 'NF1',
        'type': 'STRING'
    },
    {
        'name': 'APC',
        'type': 'STRING'
    },
    {
        'name': 'CTNNB1',
        'type': 'STRING'
    },
    {
        'name': 'PIK3CA',
        'type': 'STRING'
    },
    {
        'name': 'PTEN',
        'type': 'STRING'
    },
    {
        'name': 'FBXW7',
        'type': 'STRING'
    },
    {
        'name': 'NRAS',
        'type': 'STRING'
    },
    {
        'name': 'ARID1A',
        'type': 'STRING'
    },
    {
        'name': 'CDKN2A',
        'type': 'STRING'
    },
    {
        'name': 'SMAD4',
        'type': 'STRING'
    },
    {
        'name': 'BRAF',
        'type': 'STRING'
    },
    {
        'name': 'NFE2L2',
        'type': 'STRING'
    },
    {
        'name': 'IDH1',
        'type': 'STRING'
    },
    {
        'name': 'PIK3R1',
        'type': 'STRING'
    },
    {
        'name': 'HRAS',
        'type': 'STRING'
    },
    {
        'name': 'EGFR',
        'type': 'STRING'
    },
    {
        'name': 'BAP1',
        'type': 'STRING'
    },
    {
        'name': 'KRAS',
        'type': 'STRING'
    },
    {
        'name': 'sampleType',
        'type': 'STRING'
    },
    {
        'name': 'DNAseq_data',
        'type': 'STRING'
    },
    {
        'name': 'mirnPlatform',
        'type': 'STRING'
    },
    {
        'name': 'cnvrPlatform',
        'type': 'STRING'
    },
    {
        'name': 'methPlatform',
        'type': 'STRING'
    },
    {
        'name': 'gexpPlatform',
        'type': 'STRING'
    },
    {
        'name': 'rppaPlatform',
        'type': 'STRING'
    }
]

schema_fl = [
  {"name": "PARTICIPANT",       "type": "string",   "mode": "nullable"},
  {"name": "SAMPLE",            "type": "string",   "mode": "nullable"},
  {"name": "SAMPLE_FM",         "type": "string",   "mode": "nullable"},
  {"name": "DATA_TYPE",         "type": "string",   "mode": "nullable"},
  {"name": "PLATFORM",          "type": "string",   "mode": "nullable"},
  {"name": "DATA_LEVEL",        "type": "integer",  "mode": "nullable"},
  {"name": "BATCH",             "type": "integer",  "mode": "nullable"},
  {"name": "ARCHIVE_NAME",      "type": "string",   "mode": "nullable"},
  {"name": "URL",               "type": "string",   "mode": "nullable"},
  {"name": "DATE_ADDED",        "type": "string",   "mode": "nullable"},
  {"name": "ANNOTATION_TYPES",  "type": "string",   "mode": "nullable"}
]

# Loads the table from Google Cloud Storage and prints the table.
def loadTable(service, projectId, datasetId, targetTableId, sourceCSV, schema):
    try:
        jobCollection = service.jobs()
        jobData = {
            'projectId': projectId,  # why isn't this in jobReference nested object?
            'configuration': {
                'load': {
                    'sourceUris': sourceCSV,
                    'schema': {
                        'fields': schema
                    },
                    'destinationTable': {
                        'projectId': projectId,
                        'datasetId': datasetId,
                        'tableId': targetTableId
                    },
                    'skipLeadingRows': 1,
                    'maxBadRecords': 1000000000,
                    'allowQuotedNewlines': True,
                    'allowJaggedRows': True,
                    'ignoreUnknownValues': True
                },
                # 'copy': {},
                # 'dryRun': <boolean>,
                # 'extract': {},
                # 'link': {},
                # 'query': {
                #     'allowLargeResults': True,
                #     'destinationTable': {
                #         'datasetId': datasetId,
                #         'projectId': projectId,
                #         'tableId': 'query_table01',
                #     },
                #     'query': 'SELECT sample, gender, disease_code from [] limit 10'
                # },


            }  # end configuration
            # 'selfLink': <url used to access teh resource again -- can use in GET requests for the resource
            # 'statistics': {}
            # 'status': {}
        }
        insertResponse = jobCollection.insert(projectId=projectId,
                                              body=jobData).execute()

        # Ping for status until it is done, with a short pause between calls.
        while True:
            job = jobCollection.get(projectId=projectId,
                                     jobId=insertResponse['jobReference']['jobId']).execute()
            if 'DONE' == job['status']['state']:
                print('Done Loading!')
                return

            if 'errorResult' in job['status']:
                print('Error loading table: ', pprint.pprint(job))
                return

            print('Waiting for loading to complete...')
            time.sleep(10)

    except HTTPError as err:
        print('Error in loadTable: ', pprint.pprint(err.resp))  # or err.reason?


def main():

    client_secrets_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'client_secrets.json')

    flow = flow_from_clientsecrets(client_secrets_path,
                                   scope='https://www.googleapis.com/auth/bigquery')

    storage = Storage('bigquery_credentials.dat')
    credentials = storage.get()

    if credentials is None or credentials.invalid:
        # Run oauth2 flow with default arguments.
        credentials = tools.run_flow(flow, storage, tools.argparser.parse_args([]))

    http = httplib2.Http()
    http = credentials.authorize(http)


    # todo: make a dataset and table?
    service = build('bigquery', 'v2', http=http)
    projectId = '907668440978'
    datasetId = 'isb_cgc'
    targetTableId = 'fmdata'
    sourceCSV = ['gs://fmdata/clinMut.csv']
    loadTable(service, projectId, datasetId, targetTableId, sourceCSV, schema_fm)


if __name__ == '__main__':
    main()




# columns in clinMut_62_v2
# 'sample'
# 'percent_lymphocyte_infiltration'
# 'percent_monocyte_infiltration'
# 'percent_necrosis'
# 'percent_neutrophil_infiltration'
# 'percent_normal_cells'
# 'percent_stromal_cells'
# 'percent_tumor_cells'
# 'percent_tumor_nuclei'
# 'gender'
# 'history_of_neoadjuvant_treatment'
# 'icd_o_3_histology'
# 'prior_dx'
# 'vital_status'
# 'country'
# 'disease_code'
# 'histological_type'
# 'icd_10'
# 'icd_o_3_site'
# 'tumor_tissue_site'
# 'tumor_type'
# 'age_at_initial_pathologic_diagnosis'
# 'days_to_birth'
# 'days_to_initial_pathologic_diagnosis'
# 'year_of_initial_pathologic_diagnosis'
# 'days_to_last_known_alive'
# 'tumor_necrosis_percent'
# 'tumor_nuclei_percent'
# 'tumor_weight'
# 'person_neoplasm_cancer_status'
# 'pathologic_N'
# 'radiation_therapy'
# 'pathologic_T'
# 'race'
# 'days_to_last_followup'
# 'ethnicity'
# 'TP53'
# 'RB1'
# 'NF1'
# 'APC'
# 'CTNNB1'
# 'PIK3CA'
# 'PTEN'
# 'FBXW7'
# 'NRAS'
# 'ARID1A'
# 'CDKN2A'
# 'SMAD4'
# 'BRAF'
# 'NFE2L2'
# 'IDH1'
# 'PIK3R1'
# 'HRAS'
# 'EGFR'
# 'BAP1'
# 'KRAS'
# 'sampleType'
# 'DNAseq_data'
# 'mirnPlatform'
# 'cnvrPlatform'
# 'methPlatform'
# 'gexpPlatform'
# 'rppaPlatform'