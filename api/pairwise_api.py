import logging

import endpoints
from protorpc import messages, remote, message_types
from django.conf import settings

from api.api_helpers import authorize_credentials_with_Google
from api.pairwise import Pairwise

package = 'pairwise'


class PairwiseJobRequest(messages.Message):
    cohort_id = messages.StringField(1, required=True)
    feature = messages.StringField(2, repeated=True)


class PairwiseResultVector(messages.Message):
    feature_1 = messages.StringField(1, required=True)
    feature_2 = messages.StringField(2, required=True)
    comparison_type = messages.StringField(3, required=True)
    correlation_coefficient = messages.StringField(4, required=True)
    n = messages.IntegerField(5, required=True)
    _logp = messages.FloatField(6, required=True)
    n_A = messages.IntegerField(7, required=True)
    p_A = messages.FloatField(8, required=True)
    n_B = messages.IntegerField(9, required=True)
    p_B = messages.FloatField(10, required=True)
    exclusion_rules = messages.StringField(11, required=True)


class PairwiseFilterMessage(messages.Message):
    filter_message = messages.StringField(1, required=True)


class PairwiseResults(messages.Message):
    result_vectors = messages.MessageField(PairwiseResultVector, 1, repeated=True)
    filter_messages = messages.MessageField(PairwiseFilterMessage, 2, repeated=True)


class Feature(messages.Message):
    annotated_type = messages.StringField(1)
    chr = messages.StringField(2)
    start = messages.IntegerField(3)
    end = messages.IntegerField(4)
    label = messages.StringField(5)
    mutation_count = messages.IntegerField(6)
    source = messages.StringField(7)


class Association(messages.Message):
    node1 = messages.MessageField(Feature, 1)
    node2 = messages.MessageField(Feature, 2)
    logged_pvalue = messages.FloatField(3)


class CircvizOutput(messages.Message):
    items = messages.MessageField(Association, 1, repeated=True)


Pairwise_Endpoints = endpoints.api(name='pairwise', version='v1')


@Pairwise_Endpoints.api_class(resource_name='pairwise_api')
class PairwiseApi(remote.Service):
    """Pairwise API v1"""

    @endpoints.method(PairwiseJobRequest, PairwiseResults, name="run", http_method="POST")
    def run_job(self, request):
        features = []
        count = len(request.feature) - 1
        while count >= 0:
            features.append(str(request.feature[count]))
            count -= 1

        prepped_features = Pairwise.prepare_features(request.cohort_id, features)
        outputs = Pairwise.run_pairwise(prepped_features)

        results = PairwiseResults(result_vectors=[], filter_messages=[])
        logging.info(results)

        for row_label, row in outputs.items():
            if type(row) is dict:
                results.result_vectors.append(PairwiseResultVector(feature_1=row['feature_A'],
                                                                   feature_2=row['feature_B'],
                                                                   comparison_type=row['comparison_type'],
                                                                   correlation_coefficient=row['correlation_coefficient'],
                                                                   n=int(row['n']),
                                                                   _logp=float(row['_logp']),
                                                                   n_A=int(row['n_A']),
                                                                   p_A=float(row['p_A']),
                                                                   n_B=int(row['n_B']),
                                                                   p_B=float(row['p_B']),
                                                                   exclusion_rules=row['exclusion_rules']))
            elif type(row) is unicode:
                results.filter_messages.append(PairwiseFilterMessage(filter_message=row[0]))

        return results

    @endpoints.method(message_types.VoidMessage, CircvizOutput,
                      path='precomp', http_method='GET', name='precomputed')
    def precomputed_results(self, request):
        bq_table = 'brca_pwpv'
        query = 'SELECT A_valueType, A_chr, A_startPos, A_endPos, A_featureName, A_N, A_dataType,' \
                'B_valueType, B_chr, B_startPos, B_endPos, B_featureName, B_N, B_dataType,' \
                'logP  FROM [isb-cgc:test.brca_pwpv] ' \
                'where B_chr != "null" ' \
                'and A_chr != "null"' \
                'and A_startPos != "null" and A_endPos != "null"' \
                'and B_startPos != "null" and B_endPos != "null"' \
                'LIMIT 50;'
        query_body = {
            'query': query
        }
        bigquery_service = authorize_credentials_with_Google()
        table_data = bigquery_service.jobs()
        query_response = table_data.query(projectId=settings.BQ_PROJECT_ID, body=query_body).execute()
        association_list = []
        feature_list = []
        for row in query_response['rows']:
            node1 = Feature(
                annotated_type=row['f'][0]['v'].encode('utf-8') if row['f'][0]['v'] else None,
                chr=row['f'][1]['v'].encode('utf-8').replace('chr','') if row['f'][1]['v'] else None,
                start=int(row['f'][2]['v']) if row['f'][2]['v'] else None,
                end=int(row['f'][3]['v']) if row['f'][3]['v'] else None,
                label=row['f'][4]['v'].encode('utf-8') if row['f'][4]['v'] else '',
                mutation_count=int(row['f'][5]['v']) if row['f'][5]['v'] else None,
                source=row['f'][6]['v'].encode('utf-8') if row['f'][6]['v'] else None
            )
            node2 = Feature(
                annotated_type=row['f'][7]['v'].encode('utf-8') if row['f'][7]['v'] else None,
                chr=row['f'][8]['v'].encode('utf-8').replace('chr','') if row['f'][8]['v'] else None,
                start=int(row['f'][9]['v']) if row['f'][9]['v'] else None,
                end=int(row['f'][10]['v']) if row['f'][10]['v'] else None,
                label=row['f'][11]['v'].encode('utf-8') if row['f'][11]['v'] else '',
                mutation_count=int(row['f'][12]['v']) if row['f'][12]['v'] else None,
                source=row['f'][13]['v'].encode('utf-8') if row['f'][13]['v'] else None
            )
            logP = float(row['f'][14]['v'])
            association_list.append(Association(node1=node1, node2=node2, logged_pvalue=logP))
            feature_list.append(node1)
            feature_list.append(node2)
        return CircvizOutput(items=association_list)


APPLICATION = endpoints.api_server([PairwiseApi])
