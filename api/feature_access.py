from endpoints import api as endpoints_api, method as endpoints_method, NotFoundException
from protorpc import remote
from protorpc.messages import Message, MessageField, StringField
from MySQLdb.cursors import DictCursor

from bq_data_access import clinical_data
from api_helpers import sql_connection


FOUND_FEATURE_LIMIT = 20

class ClinicalFeatureType(Message):
    feature_type = StringField(1)
    gene = StringField(2)
    label = StringField(3)
    internal_id = StringField(4)


class FeatureTypeList(Message):
    items = MessageField(ClinicalFeatureType, 1, repeated=True)


class FeatureTypesRequest(Message):
    keyword = StringField(1, required=True)


class FeatureDataRequest(Message):
    feature_id = StringField(1, required=True)
    cohort_id = StringField(2, required=True)



FeatureAccessEndpointsAPI = endpoints_api(name='feature_type_api', version='v1')

@FeatureAccessEndpointsAPI.api_class(resource_name='feature_type_endpoints')
class FeatureAccessEndpoints(remote.Service):
    @endpoints_method(FeatureTypesRequest, FeatureTypeList,
                      path='feature_search', http_method='GET', name='feature_access.getFeatureType')
    def feature_search(self, request):
        try:
            keyword = request.keyword
            search_result = clinical_data.feature_search(keyword)
            items = []
            for feature_item in search_result:
                items.append(ClinicalFeatureType(**feature_item))

            return FeatureTypeList(items=items)

        except Exception as e:
            raise NotFoundException('feature_search API error')

    @endpoints_method(FeatureTypesRequest, FeatureTypeList,
                      path='feature_search_all', http_method='GET', name='feature_access.getFeatureTypeAll')
    def feature_search_all(self, request):
        keyword = request.keyword
        query = 'SELECT feature_type, gene, label, internal_id FROM feature_defs WHERE label LIKE %s LIMIT %s'
        query_args = ['%' + keyword + '%', FOUND_FEATURE_LIMIT]

        try:
            db = sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(query_args))
            items = []

            for row in cursor.fetchall():
                items.append(ClinicalFeatureType(**row))

            return FeatureTypeList(items=items)

        except Exception as e:
            raise NotFoundException('feature_search_all API error')
