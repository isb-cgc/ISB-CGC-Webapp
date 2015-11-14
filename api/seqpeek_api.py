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

from api.data_access import PlotDataCohortInfo

from endpoints import api as endpoints_api, method as endpoints_method
from endpoints import InternalServerErrorException
from protorpc import remote
from protorpc.messages import IntegerField, Message, MessageField, StringField, Variant
from bq_data_access.seqpeek.seqpeek_maf import SeqPeekMAFDataAccess


class DataRequest(Message):
    feature_id = StringField(1, required=True)
    cohort_id = IntegerField(2, repeated=True)


class DataPoint(Message):
    sample_id = StringField(1)
    value = StringField(2)
    cohort = IntegerField(3, repeated=True)


class MAFRecord(Message):
    sample_id = StringField(1)
    patient_id = StringField(2)
    aliquot_id = StringField(3)
    hugo_symbol = StringField(4)
    uniprot_aapos = IntegerField(5, variant=Variant.INT32)
    uniprot_id = StringField(6)
    variant_classification = StringField(7)
    cohort = IntegerField(8, repeated=True)


class MAFRecordList(Message):
    items = MessageField(MAFRecord, 1, repeated=True)
    cohort_set = MessageField(PlotDataCohortInfo, 2, repeated=True)

SeqPeekDataEndpointsAPI = endpoints_api(name='seqpeek_data_api', version='v1')


def maf_array_to_record(maf_array):
    data_points = []
    for item in maf_array:
        data_points.append(MAFRecord(**item))

    return data_points


@SeqPeekDataEndpointsAPI.api_class(resource_name='data_endpoints')
class SeqPeekDataAccessAPI(remote.Service):

    def create_response(self, maf_with_cohorts):
        """
        Converts a SeqPeekMAFWithCohorts instance to a protorpc Message.

        :param maf_with_cohorts: SeqPeekMAFWithCohorts instance
        :return: MAFRecordList response.
        """
        data_points = maf_array_to_record(maf_with_cohorts.maf_vector)

        cohort_info_obj_array = []
        for item in maf_with_cohorts.cohort_info:
            cohort_info_obj_array.append(PlotDataCohortInfo(**item))

        return MAFRecordList(items=data_points, cohort_set=cohort_info_obj_array)

    @endpoints_method(DataRequest, MAFRecordList,
                      path='by_gnab_feature', http_method='GET', name='seqpeek.getMAFDataWithCohorts')
    def data_access_by_gnab_feature(self, request):
        try:
            feature_id = request.feature_id
            cohort_id_array = request.cohort_id

            maf_with_cohorts = SeqPeekMAFDataAccess().get_data(feature_id, cohort_id_array)
            response = self.create_response(maf_with_cohorts)
            return response
        except Exception as e:
            logging.exception(e)
            raise InternalServerErrorException()
