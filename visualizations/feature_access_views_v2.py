"""

Copyright 2017, Institute for Systems Biology

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
import sys
import traceback

from django.contrib.auth.decorators import login_required
from django.http import JsonResponse

from bq_data_access.v2.clinical_data import CLINICAL_FEATURE_TYPE
from bq_data_access.v2.copynumber_data import CNVR_FEATURE_TYPE
from bq_data_access.v2.feature_search.clinical_searcher import ClinicalSearcher
from bq_data_access.v2.feature_search.common import InvalidDataTypeException
from bq_data_access.v2.feature_search.copynumber_search import CNVRSearcher
from bq_data_access.v2.feature_search.gexp_searcher import GEXPSearcher
from bq_data_access.v2.feature_search.gnab_searcher import GNABSearcher
from bq_data_access.v2.feature_search.methylation_searcher import METHSearcher
from bq_data_access.v2.feature_search.microrna_searcher import MIRNSearcher
from bq_data_access.v2.feature_search.protein_searcher import RPPASearcher
from bq_data_access.v2.gexp_data import GEXP_FEATURE_TYPE
from bq_data_access.v2.gnab_data import GNAB_FEATURE_TYPE
from bq_data_access.v2.methylation_data import METH_FEATURE_TYPE
from bq_data_access.v2.mirna_data import MIRN_FEATURE_TYPE
from bq_data_access.v2.protein_data import RPPA_FEATURE_TYPE

from bq_data_access.v2.feature_search.clinical_schema_utils import ClinicalColumnFeatureSupport, ClinicalColumnNameMappingStatus

logger = logging.getLogger('main_logger')


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
        raise InvalidDataTypeException("Invalid datatype '{datatype}'".format(datatype=datatype))


@login_required
def feature_search(request):
    """ Used by the web application."""
    try:
        datatype = request.GET.get('datatype')
        searcher = FeatureDefinitionSearcherFactory.build_from_datatype(datatype)
        parameters = {}
        for param in request.GET:
            if param != 'datatype':
                value = request.GET.get(param)
                if value is not None:
                    parameters[param] = value
        items = []

        if parameters.keys():
            result = searcher.search(parameters)

            fields = ['label', 'internal_feature_id', 'feature_type']
            for row in result:
                obj = {key: row[key] for key in fields}
                if obj['feature_type'] == 'CLIN':
                    obj['type'] = row['type']
                    obj['column_name'] = row['column_name']
                items.append(obj)

        return JsonResponse({'items': items}, status=200)

    # TODO: This should be integrated into the code
    # except InvalidDataTypeException as e:
    #     logger.error(str(e))
    #     return JsonResponse({'error': str(e)})
    # except EmptyQueryException as e:
    #     logger.error("Empty query: %s", str(e))
    #     raise BadRequestException()
    # except InvalidFieldException as e:
    #     logger.error("Invalid field: %s", str(e))
    #     raise BadRequestException(str(e))
    # except BackendException:
    #     logger.exception("feature_search BackendException")
    #     raise InternalServerErrorException()

    except Exception as e:
        logger.error("[ERROR] In feature search: ")
        logger.exception(e)
        return JsonResponse({'error': e}, status=500)


@login_required
def feature_field_search(request):
    """ Used by the web application."""
    try:
        datatype, keyword, field = request.GET.get('datatype', None), request.GET.get('keyword', None), request.GET.get('field', None)
        if datatype and keyword and field:
            searcher = FeatureDefinitionSearcherFactory.build_from_datatype(datatype)
            result = searcher.field_value_search(keyword, field)
        else:
            return JsonResponse({'error': 'Missing parameter'}, status=500)

        return JsonResponse({'values': result}, status=200)

    # TODO: Integrate into view
    # except InvalidDataTypeException as e:
    #     logger.error(str(e))
    #     raise BadRequestException()
    # except InvalidFieldException as e:
    #     logger.error(str(e))
    #     raise BadRequestException()
    # except BackendException:
    #     logger.exception("feature_field_search BackendException")
    #     raise InternalServerErrorException()

    except Exception as e:
        logger.error("[ERROR] In feature field search: ")
        logger.exception(e)
        raise JsonResponse({'error': e}, status=500)


@login_required
def clinical_feature_get(request):
    try:
        column_name_list = request.GET.getlist('column_name', None)
        result = ClinicalColumnFeatureSupport.get_features_ids_for_column_names(column_name_list)

        if result['status'] == ClinicalColumnNameMappingStatus.SUCCESS:
            return JsonResponse({
                'status': 'ok',
                'clinical_feature_ids': result['clinical_feature_ids']
            })
        else:
            return JsonResponse({
                'status': 'error'
            }, status=400)

    except Exception as e:
        logger.error("[ERROR] In clinical feature get: ")
        logger.exception(e)
        raise JsonResponse({'error': e}, status=500)
