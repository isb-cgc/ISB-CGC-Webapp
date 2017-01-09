"""

Copyright 2016, Institute for Systems Biology

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

from bq_data_access.gnab_data import GNABFeatureProvider
from bq_data_access.utils import DurationLogged

SEQPEEK_FEATURE_TYPE = 'SEQPEEK'


class SeqPeekDataProvider(GNABFeatureProvider):
    def __init__(self, feature_id, **kwargs):
        super(SeqPeekDataProvider, self).__init__(feature_id, **kwargs)

    @classmethod
    def process_data_point(cls, data_point):
        return str(data_point['value'])

    def build_query(self, project_name, dataset_name, table_name, feature_def, cohort_dataset, cohort_table, cohort_id_array, project_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join([str(cohort_id) for cohort_id in cohort_id_array])
        project_id_stmt = ''
        if project_id_array is not None:
            project_id_stmt = ', '.join([str(project_id) for project_id in project_id_array])

        query_template = \
            ("SELECT ParticipantBarcode, Tumor_SampleBarcode, Tumor_AliquotBarcode, "
             "    Hugo_symbol, "
             "    UniProt_AApos, "
             "    variant_classification, "
             "    HGNC_UniProt_ID_Supplied_By_UniProt as uniprot_id "
             "FROM [{project_name}:{dataset_name}.{table_name}] "
             "WHERE Hugo_Symbol='{gene}' "
             "AND Tumor_SampleBarcode IN ( "
             "    SELECT sample_barcode "
             "    FROM [{project_name}:{cohort_dataset}.{cohort_table}] "
             "    WHERE cohort_id IN ({cohort_id_list})"
             "         AND (project_id IS NULL")

        query_template += (" OR project_id IN ({project_id_list})))" if project_id_array is not None else "))")

        query = query_template.format(dataset_name=dataset_name, project_name=project_name, table_name=table_name,
                                      gene=feature_def.gene,
                                      cohort_dataset=cohort_dataset, cohort_table=cohort_table,
                                      cohort_id_list=cohort_id_stmt, project_id_list=project_id_stmt)

        logging.debug("BQ_QUERY_SEQPEEK: " + query)
        return query

    @DurationLogged('SEQPEEK_GNAB', 'UNPACK')
    def unpack_query_response(self, query_result_array):
        result = []

        skip_count = 0
        for row in query_result_array:
            result.append({
                'patient_id': row['f'][0]['v'],
                'sample_id': row['f'][1]['v'],
                'aliquot_id': row['f'][2]['v'],
                'hugo_symbol': row['f'][3]['v'],
                'uniprot_aapos': row['f'][4]['v'],
                'variant_classification': row['f'][5]['v'],
                'uniprot_id': row['f'][6]['v'],
            })

        logging.debug("Query result is {qrows} rows, skipped {skipped} rows".format(qrows=len(query_result_array),
                                                                                    skipped=skip_count))
        return result

