import json
import base64
import logging
import urllib
import urllib2

import endpoints
from protorpc import messages, remote, message_types
from google.appengine.api import urlfetch

from api.api_helpers import authorize_credentials_with_Google
from bq_data_access.data_access import get_feature_vector
from bq_data_access.feature_value_types import ValueType
from bq_data_access.utils import VectorMergeSupport
from django.conf import settings

package = 'pairwise'

class PairwiseJobRequest(messages.Message):
    cohort_id = messages.StringField(1, required=True)
    feature_1 = messages.StringField(2, required=True)
    feature_2 = messages.StringField(3, required=True)

class PairwiseOutputs(messages.Message):
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
# Above values based on table "pairwise_output_42" in "test" dataset
# May need to revise later

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

    @endpoints.method(PairwiseJobRequest, PairwiseOutputs, name="run", http_method="GET")
    def run_job(self, request):
	url = "http://104.197.42.216:8080/pairwise"
        headers = {
        'content-type': 'application/json'
        }
        # Get the feature data
        value_type_1, vector_1 = get_feature_vector(request.feature_1, [request.cohort_id])
        value_type_2, vector_2 = get_feature_vector(request.feature_2, [request.cohort_id])

	# Create merged feature vectors
	vms = VectorMergeSupport('NA', 'sample_id', [request.feature_1, request.feature_2])
	vms.add_dict_array(vector_1, request.feature_1, 'value')
        vms.add_dict_array(vector_2, request.feature_2, 'value')
	merged = vms.get_merged_dict()

	# Construct "old-style" feature matrix rows
	if value_type_1 == ValueType.INTEGER or value_type_1 == ValueType.FLOAT:
		value_type_1 = "N"
	elif value_type_1 == ValueType.STRING:
		value_type_1 = "C"
	else:
		value_type_1 = "B"

	if value_type_2 == ValueType.INTEGER or value_type_2 == ValueType.FLOAT:
		value_type_2 = "N"
	elif value_type_2 == ValueType.STRING:
		value_type_2 = "C"
	else:
		value_type_2 = "B"

        row_1 = [value_type_1 + ":" + request.feature_1]
	row_2 = [value_type_2 + ":" + request.feature_2]

	for item in merged:
		row_1.append(item[request.feature_1])
		row_2.append(item[request.feature_2])

	
        # Encode the data to be sent to the service
        query_string = urllib.urlencode({ 'row_1': "\t".join(row_1), 'row_2': "\t".join(row_2) })

        try:
            pairwise_response = urlfetch.fetch(url=url + "?" + query_string, headers=headers, method=urlfetch.GET)
        except urllib2.HTTPError as e:
            # TODO: Log error details
            logging.info(e.code)

        # Return the response
        decoded_response = json.loads(base64.b64decode(pairwise_response.content))

        return PairwiseOutputs(feature_1=decoded_response['feature_A'],
                               feature_2=decoded_response['feature_B'],
                               comparison_type=decoded_response['comparison_type'],
                               correlation_coefficient=decoded_response['correlation_coefficient'],
                               n=int(decoded_response['n']),
                               _logp=float(decoded_response['_logp']),
                               n_A=int(decoded_response['n_A']),
                               p_A=float(decoded_response['p_A']),
                               n_B=int(decoded_response['n_B']),
                               p_B=float(decoded_response['p_B']),
                               exclusion_rules=decoded_response['exclusion_rules']
        )

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
