from sys import argv as cmdline_argv
import httplib2
from csv import DictWriter

from apiclient.discovery import build
from oauth2client.client import GoogleCredentials

from bq_data_access.mrna_data import get_feature_type, build_internal_feature_id, TABLES

from GenespotRE.settings import BIGQUERY_DATASET2 as DATASET

def do_query(project_id, table_name, plaform, generating_center, value_label, feature_id_table):
    SCOPES = ['https://www.googleapis.com/auth/bigquery']

    credentials = GoogleCredentials.get_application_default().create_scoped(SCOPES)
    http = httplib2.Http()
    http = credentials.authorize(http)

    bigquery_service = build('bigquery', 'v2', http=http)

    query_template = 'SELECT original_gene_symbol FROM [isb-cgc:{dataset_name}.{table_name}] GROUP BY original_gene_symbol'

    query_body = {
        'query': query_template.format(dataset_name=DATASET, table_name=table_name)
    }

    table_data = bigquery_service.jobs()
    query_response = table_data.query(projectId=project_id, body=query_body).execute()

    result = []
    for row in query_response['rows']:
        gene = row['f'][0]['v']
        if gene is None:
            continue

        result.append({
            'feature_type': get_feature_type(),
            'gene_name': gene,
            'center': generating_center,
            'platform': plaform,
            'value_label': value_label,
            'internal_feature_id': build_internal_feature_id(gene, feature_id_table)
        })

    return result

def main():
    fieldnames = ['feature_type', 'gene_name', 'center', 'platform', 'value_label', 'internal_feature_id']
    project_id = cmdline_argv[1]
    out_file_path = cmdline_argv[2]
    result = []
    for table_info in TABLES:
        table_result = do_query(project_id, table_info['table_id'], table_info['platform'],
                                table_info['center'], table_info['value_label'], table_info['id'])
        result.extend(table_result)

    writer = DictWriter(open(out_file_path, 'wb'), delimiter='\t', fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(result)


if __name__ == '__main__':
    main()
