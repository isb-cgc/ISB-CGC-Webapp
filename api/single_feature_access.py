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

import logging
import time

from api.data_access import FeatureDataEndpointsAPI, PlotDataCohortInfo

from endpoints import method as endpoints_method
from endpoints import NotFoundException, InternalServerErrorException
from protorpc import remote
from protorpc.messages import EnumField, IntegerField, Message, MessageField, StringField

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType
from bq_data_access.data_access import is_valid_feature_identifier, get_feature_vectors_with_user_data
from bq_data_access.utils import VectorMergeSupport
from bq_data_access.cohort_cloudsql import CloudSQLCohortAccess


class DataRequest(Message):
    feature_id = StringField(1, required=True)
    cohort_id = IntegerField(2, repeated=True)


class DataPoint(Message):
    sample_id = StringField(1)
    value = StringField(2)
    cohort = IntegerField(3, repeated=True)


class DataPointList(Message):
    type = EnumField(ValueType, 1, required=True)
    items = MessageField(DataPoint, 2, repeated=True)
    label = StringField(3, required=True)
    cohort_set = MessageField(PlotDataCohortInfo, 4, repeated=True)


@FeatureDataEndpointsAPI.api_class(resource_name='feature_data_endpoints')
class SingleFeatureDataAccess(remote.Service):
    def get_feature_vector(self, feature_id, cohort_id_array):
        start = time.time()

        async_params = [(feature_id, cohort_id_array)]
        async_result = get_feature_vectors_with_user_data(async_params)

        feature_type, feature_vec = async_result[feature_id]['type'], async_result[feature_id]['data']

        end = time.time()
        time_elapsed = end-start
        logging.info('Time elapsed: ' + str(time_elapsed))

        vms = VectorMergeSupport('NA', 'sample_id', [feature_id])
        vms.add_dict_array(feature_vec, feature_id, 'value')

        merged = vms.get_merged_dict()

        return feature_type, merged

    def annotate_vector_with_cohorts(self, cohort_id_array, merged):
        # Resolve which (requested) cohorts each datapoint belongs to.
        cohort_set_dict = CloudSQLCohortAccess.get_cohorts_for_datapoints(cohort_id_array)

        for value_bundle in merged:
            sample_id = value_bundle['sample_id']

            # Add an array of cohort
            # only if the number of containing cohort exceeds the configured threshold.
            cohort_set = []
            # TODO FIX - this check shouldn't be needed
            if sample_id in cohort_set_dict:
                cohort_set = cohort_set_dict[sample_id]
            value_bundle['cohort'] = cohort_set

    def get_cohort_information(self, cohort_id_array):
        # Get the name and ID for every requested cohort.
        cohort_info_array = CloudSQLCohortAccess.get_cohort_info(cohort_id_array)

        return cohort_info_array

    def create_response(self, feature_id, vector_type, vector, cohort_info_array):
        data_points = []
        for item in vector:
            data_points.append(DataPoint(
                sample_id=item['sample_id'],
                value=item[feature_id],
                cohort=item['cohort']
            ))

        cohort_info_obj_array = []
        for item in cohort_info_array:
            cohort_info_obj_array.append(PlotDataCohortInfo(**item))

        return DataPointList(type=vector_type, items=data_points, label=feature_id,
                             cohort_set=cohort_info_obj_array)

    @endpoints_method(DataRequest, DataPointList,
                      path='feature_data', http_method='GET', name='feature_access.getFeatureData')
    def data_access_by_feature(self, request):
        """ Used by the web application."""
        try:
            feature_id = request.feature_id
            cohort_id_array = request.cohort_id
            vector_type, vector = self.get_feature_vector(feature_id, cohort_id_array)

            self.annotate_vector_with_cohorts(cohort_id_array, vector)

            cohort_info = self.get_cohort_information(cohort_id_array)
            response = self.create_response(feature_id, vector_type, vector, cohort_info)
            return response
        except FeatureNotFoundException as fnf:
            logging.error("Invalid internal feature ID '{}'".format(str(fnf)))
            raise NotFoundException()
        except Exception as e:
            logging.exception(e)
            raise InternalServerErrorException()
