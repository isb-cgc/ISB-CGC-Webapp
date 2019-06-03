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
        'name': 'barcode',
        'type': 'STRING'
    },
    {
        'name': 'sample',
        'type': 'STRING'
    },
    {
        'name': 'mirnPlatform',
        'type': 'STRING'
    },
    {
        'name': 'hsa_miR_146a_5p',
        'type': 'FLOAT'
    },
    {
        'name': 'hsa_miR_7_7p',
        'type': 'FLOAT'
    },
    {
        'name': 'gexpPlatform',
        'type': 'STRING'
    },
    {
        'name': 'methPlatform',
        'type': 'STRING'
    },
    {
        'name': 'EGFR_chr7_55086714_55324313',
        'type': 'FLOAT'
    },
    {
        'name': 'rppaPlatform',
        'type': 'STRING'
    },
    {
        'name': 'EGFR_chr7_55086714_55324313_EGFR',
        'type': 'FLOAT'
    },
    {
        'name': 'EGFR_chr7_55086714_55324313_EGFR_pY1068',
        'type': 'FLOAT'
    },
    {
        'name': 'EGFR_chr7_55086714_55324313_EGFR_pY1173',
        'type': 'FLOAT'
    },
    {
        'name': 'EGFR_chr7_55086288_cg03860890_TSS1500_Island',
        'type': 'FLOAT'
    },
    {
        'name': 'EGFR_chr7_55086890_cg14094960_5pUTR_Island',
        'type': 'FLOAT'
    },
    {
        'name': 'cnvrPlatform',
        'type': 'STRING'
    },
    {
        'name': 'batch_number',
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
        'name': 'gender',
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
        'name': 'icd_o_3_histology',
        'type': 'STRING'
    },
    {
        'name': 'pathologic_N',
        'type': 'STRING'
    },
    {
        'name': 'pathologic_stage',
        'type': 'STRING'
    },
    {
        'name': 'pathologic_T',
        'type': 'STRING'
    },
    {
        'name': 'tumor_tissue_site',
        'type': 'STRING'
    },
    {
        'name': 'vital_status',
        'type': 'STRING'
    },
    {
        'name': 'age_at_initial_pathologic_diagnosis',
        'type': 'FLOAT'
    },
    {
        'name': 'year_of_initial_pathologic_diagnosis',
        'type': 'INTEGER'
    },
    {
        'name': 'CNVR_EGFR',
        'type': 'FLOAT'
    },
    {
        'name': 'EGFR_chr7_55089770_cg10002850_Body_SShore',
        'type': 'FLOAT'
    },
    {
        'name': 'EGFR_chr7_55177623_cg18809076_Body',
        'type': 'FLOAT'
    },
    {
        'name': 'EGFR_chr7_55086714_55324313_code_potential_somatic',
        'type': 'INTEGER'
    },
    {
        'name': 'pathologic_M',
        'type': 'STRING'
    },
    {
        'name': 'tobacco_smoking_history',
        'type': 'STRING'
    },
    {
        'name': 'EGFR_chr7_55086714_55324313_EGFR_pY992',
        'type': 'FLOAT'
    },
    {
        'name': 'sampleType',
        'type': 'STRING'
    },
    {
        'name': 'TNtype',
        'type': 'STRING'
    }
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
    targetTableId = 'fmdata_egfr'
    sourceCSV = ['gs://fmdata/allDataMerge.EGFR.blankNA.csv']
    loadTable(service, projectId, datasetId, targetTableId, sourceCSV, schema_fm)


if __name__ == '__main__':
    main()