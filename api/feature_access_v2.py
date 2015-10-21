import logging

from endpoints import api as endpoints_api, method as endpoints_method
from endpoints import BadRequestException, InternalServerErrorException
from protorpc import remote
from protorpc.messages import Message, MessageField, StringField

from bq_data_access.feature_search.common import BackendException, EmptyQueryException, InvalidFieldException, InvalidDataTypeException
from bq_data_access.mrna_data import GEXP_FEATURE_TYPE
from bq_data_access.clinical_data import CLINICAL_FEATURE_TYPE
from bq_data_access.methylation_data import METH_FEATURE_TYPE
from bq_data_access.copynumber_data import CNVR_FEATURE_TYPE
from bq_data_access.protein_data import RPPA_FEATURE_TYPE
from bq_data_access.mirna_data import MIRN_FEATURE_TYPE
from bq_data_access.maf_data import GNAB_FEATURE_TYPE
from bq_data_access.feature_search.gexp import GEXPSearcher
from bq_data_access.feature_search.clinical import ClinicalSearcher
from bq_data_access.feature_search.methylation import METHSearcher
from bq_data_access.feature_search.copynumber import CNVRSearcher
from bq_data_access.feature_search.protein import RPPASearcher
from bq_data_access.feature_search.microrna import MIRNSearcher
from bq_data_access.feature_search.mutation import GNABSearcher


class ClinicalFeatureType(Message):
    feature_type = StringField(1)
    gene = StringField(2)
    label = StringField(3)
    internal_id = StringField(4)

class FeatureTypesRequest(Message):
    keyword = StringField(1, required=True)

class FeatureDataRequest(Message):
    feature_id = StringField(1, required=True)
    cohort_id = StringField(2, required=True)

class FeatureTypeSearchRequest(Message):
    datatype = StringField(1, required=True)
    keyword = StringField(2, required=False)
    gene_name = StringField(3, required=False)
    platform = StringField(4, required=False)
    center = StringField(5, required=False)
    protein_name = StringField(6, required=False)
    value_field = StringField(7, required=False)
    probe_name = StringField(8, required=False)
    relation_to_gene = StringField(9, required=False)
    relation_to_island = StringField(10, required=False)
    mirna_name = StringField(11, required=False)

class FeatureSearchResult(Message):
    feature_type = StringField(1)
    internal_feature_id = StringField(2)
    label = StringField(3)

class FeatureTypeList(Message):
    items = MessageField(FeatureSearchResult, 1, repeated=True)

class FeatureTypeFieldSearchRequest(Message):
    datatype = StringField(1, required=True)
    keyword = StringField(2, required=True)
    field = StringField(3, required=True)

class FeatureFieldSearchResult(Message):
    values = StringField(1, repeated=True)

class FeatureDefinitionSearcherFactory(object):
    @classmethod
    def build_from_datatype(cls, datatype):
        if datatype == CLINICAL_FEATURE_TYPE:
            return ClinicalSearcher()
        elif datatype == GEXP_FEATURE_TYPE:
            return GEXPSearcher()
        elif datatype == METH_FEATURE_TYPE:
            return METHSearcher()
        elif datatype == CNVR_FEATURE_TYPE:
            return CNVRSearcher()
        elif datatype == RPPA_FEATURE_TYPE:
            return RPPASearcher()
        elif datatype == MIRN_FEATURE_TYPE:
            return MIRNSearcher()
        elif datatype == GNAB_FEATURE_TYPE:
            return GNABSearcher()
        raise InvalidDataTypeException("datatype '" + datatype)

FeatureAccessEndpointsAPI = endpoints_api(name='feature_type_api', version='v1')
@FeatureAccessEndpointsAPI.api_class(resource_name='feature_type_endpoints')
class FeatureAccessEndpoints(remote.Service):
    @endpoints_method(FeatureTypeSearchRequest, FeatureTypeList,
                      path='feature_search', http_method='GET', name='feature_access.FeatureSearch')
    def feature_search(self, request):
        try:
            datatype = request.datatype
            searcher = FeatureDefinitionSearcherFactory.build_from_datatype(datatype)
            parameters = {}
            for message in request.all_fields():
                field_name = message.name
                if field_name != 'datatype':
                    value = request.get_assigned_value(field_name)
                    if value is not None:
                        parameters[field_name] = value

            result = searcher.search(parameters)
            items = []
            fields = ['label', 'internal_feature_id']
            for row in result:
                items.append({key: row[key] for key in fields})

            return FeatureTypeList(items=items)

        except InvalidDataTypeException as e:
            logging.error(str(e))
            raise BadRequestException()
        except EmptyQueryException as e:
            logging.error("Empty query: %s", str(e))
            raise BadRequestException()
        except InvalidFieldException as e:
            logging.error("Invalid field: %s", str(e))
            raise BadRequestException(str(e))
        except BackendException:
            logging.exception("feature_search BackendException")
            raise InternalServerErrorException()
        except Exception as e:
            logging.exception(e)
            raise InternalServerErrorException()

    @endpoints_method(FeatureTypeFieldSearchRequest, FeatureFieldSearchResult,
                      path='feature_field_search', http_method='GET', name='feature_access.getFeatureFieldSearch')
    def feature_field_search(self, request):
        try:
            datatype, keyword, field = request.datatype, request.keyword, request.field
            searcher = FeatureDefinitionSearcherFactory.build_from_datatype(datatype)
            result = searcher.field_value_search(keyword, field)
            return FeatureFieldSearchResult(values=result)

        except InvalidDataTypeException as e:
            logging.error(str(e))
            raise BadRequestException()
        except InvalidFieldException as e:
            logging.error(str(e))
            raise BadRequestException()
        except BackendException:
            logging.exception("feature_field_search BackendException")
            raise InternalServerErrorException()
        except Exception as e:
            logging.exception(e)
            raise InternalServerErrorException()
