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

from endpoints import api as endpoints_api, method as endpoints_method
from endpoints import NotFoundException, InternalServerErrorException
from protorpc import remote
from protorpc.messages import BooleanField, EnumField, IntegerField, Message, MessageField, StringField

from bq_data_access.feature_value_types import ValueType
from bq_data_access.data_access import is_valid_feature_identifier, get_feature_vectors_tcga_only, get_feature_vectors_with_user_data
from bq_data_access.utils import VectorMergeSupport
from bq_data_access.cohort_cloudsql import CloudSQLCohortAccess
from bq_data_access.utils import DurationLogged
from bq_data_access.data_access import FeatureIdQueryDescription

from api.pairwise import PairwiseInputVector, Pairwise
from api.pairwise_api import PairwiseResults, PairwiseResultVector, PairwiseFilterMessage
import sys

class DataRequest(Message):
    feature_id = StringField(1, required=True)
    cohort_id = IntegerField(2, required=True)


class DataPoint(Message):
    patient_id = StringField(1)
    sample_id = StringField(2)
    aliquot_id = StringField(3)
    value = StringField(4)


class DataPointList(Message):
    type = EnumField(ValueType, 1)
    items = MessageField(DataPoint, 2, repeated=True)


class PlotDataRequest(Message):
    x_id = StringField(1, required=True)
    y_id = StringField(2, required=False)
    c_id = StringField(3, required=False)
    cohort_id = IntegerField(4, repeated=True)
    pairwise = BooleanField(5, required=False)


class PlotDataPointCohortMemberships(Message):
    ids = IntegerField(1, repeated=True)


class PlotDataCohortInfo(Message):
    id = IntegerField(1, required=True)
    name = StringField(2, required=True)

DATAPOINT_COHORT_THRESHOLD = 1


class PlotDataPoint(Message):
    sample_id = StringField(1)
    x = StringField(2)
    y = StringField(3)
    c = StringField(4)
    cohort = IntegerField(5, repeated=True)


class PlotDataTypes(Message):
    x = EnumField(ValueType, 1)
    y = EnumField(ValueType, 2)
    c = EnumField(ValueType, 3)


class PlotDataFeatureLabels(Message):
    x = StringField(1)
    y = StringField(2)
    c = StringField(3)


class PlotDatapointCohortSet(Message):
    datapoint_id = StringField(1, required=True)


class PlotDatapointCount(Message):
    total_num_patients = IntegerField(1, required=True)
    total_num_samples = IntegerField(2, required=True)
    num_patients_w_xy = IntegerField(3, required=True)
    num_samples_w_xy = IntegerField(4, required=True)
    num_patients_wo_x = IntegerField(5, required=True)
    num_samples_wo_x = IntegerField(6, required=True)
    num_patients_wo_y = IntegerField(7, required=True)
    num_samples_wo_y = IntegerField(8, required=True)


class PlotDataResponse(Message):
    types = MessageField(PlotDataTypes, 1, required=True)
    labels = MessageField(PlotDataFeatureLabels, 2, required=True)
    items = MessageField(PlotDataPoint, 3, repeated=True)
    cohort_set = MessageField(PlotDataCohortInfo, 4, repeated=True)
    counts = MessageField(PlotDatapointCount, 5)
    pairwise_result = MessageField(PairwiseResults, 6, required=False)


FeatureDataEndpointsAPI = endpoints_api(name='feature_data_api', version='v1',
                                        description='Endpoints for feature data used by the web application.')


@FeatureDataEndpointsAPI.api_class(resource_name='feature_data_endpoints')
class FeatureDataEndpoints(remote.Service):
    def get_counts(self, data):
        total_num_patients = []
        total_num_samples = []
        num_samples_w_xy = []
        num_patients_w_xy = []
        num_samples_wo_x = []
        num_samples_wo_y = []
        num_patients_wo_x = []
        num_patients_wo_y = []

        result = {}

        for item in data:
            total_num_samples.append(item['sample_id'])
            total_num_patients.append(item['sample_id'][:12])

            if item['x'] != 'NA' and item['y'] != 'NA':
                num_samples_w_xy.append(item['sample_id'])
                num_patients_w_xy.append(item['sample_id'][:12])
            else:
                if item['x'] == 'NA':
                    num_samples_wo_x.append(item['sample_id'])
                    if item['sample_id'][:12] not in num_patients_w_xy:
                        num_patients_wo_x.append(item['sample_id'][:12])
                elif item['y'] == 'NA':
                    num_samples_wo_y.append(item['sample_id'])
                    if item['sample_id'][:12] not in num_patients_w_xy:
                        num_patients_wo_y.append(item['sample_id'][:12])

        result['total_num_patients'] = len(set(total_num_patients))
        result['total_num_samples'] = len(set(total_num_samples))
        result['num_patients_w_xy'] = len(set(num_patients_w_xy))
        result['num_samples_w_xy'] = len(set(num_samples_w_xy))
        result['num_patients_wo_x'] = len(set(num_patients_wo_x))
        result['num_samples_wo_x'] = len(set(num_samples_wo_x))
        result['num_patients_wo_y'] = len(set(num_patients_wo_y))
        result['num_samples_wo_y'] = len(set(num_samples_wo_y))

        return result

    # TODO refactor to separate module
    @DurationLogged('PAIRWISE', 'GET')
    def get_pairwise_result(self, feature_array):
        # Format the feature vectors for pairwise
        input_vectors = Pairwise.prepare_feature_vector(feature_array)
        outputs = Pairwise.run_pairwise(input_vectors)

        results = PairwiseResults(result_vectors=[], filter_messages=[])
        if outputs is not None:
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

    @DurationLogged('FEATURE', 'VECTOR_MERGE')
    def get_merged_dict_timed(self, vms):
        return vms.get_merged_dict()

    # TODO refactor missing value logic out of this module
    @DurationLogged('FEATURE', 'GET_VECTORS')
    def get_merged_feature_vectors(self, x_id, y_id, c_id, cohort_id_array):
        """
        Fetches and merges data for two or three feature vectors (see parameter documentation below).
        The vectors have to be an array of dictionaries, with each dictionary containing a 'value' field
        (other fields are ignored):
        [
            {
                'value': 0.5
            },
            {
                'value': 1.0
            }
        ]
        The merged result:
        [
            {
                'patient_id': <patient ID #0>
                'x': <value for x for patient ID #0>
                'y': <value for y for patient ID #0>
                'c': <value for c for patient ID #0>
            },
            {
                'patient_id': <patient ID #1>
                'x': <value for x for patient ID #1>
                'y': <value for y for patient ID #1>
                'c': <value for c for patient ID #1>
            }
            ...
        ]

        :param x_id: Feature identifier for x-axis e.g. 'CLIN:age_at_initial_pathologic_diagnosis'
        :param y_id: Feature identifier for y-axis. If None, values for 'y' in the response will be marked as missing.
        :param c_id: Feature identifier for color-by. If None, values for 'c' in the response will be marked as missing.
        :param cohort_id_array: Cohort identifier array.

        :return: PlotDataResponse
        """

        async_params = [FeatureIdQueryDescription(x_id, cohort_id_array)]

        c_type, c_vec = ValueType.STRING, []
        y_type, y_vec = ValueType.STRING, []

        if c_id is not None:
            async_params.append(FeatureIdQueryDescription(c_id, cohort_id_array))
        if y_id is not None:
            async_params.append(FeatureIdQueryDescription(y_id, cohort_id_array))

        async_result = get_feature_vectors_tcga_only(async_params)

        if c_id is not None:
            c_type, c_vec = async_result[c_id]['type'], async_result[c_id]['data']
        if y_id is not None:
            y_type, y_vec = async_result[y_id]['type'], async_result[y_id]['data']

        x_type, x_vec = async_result[x_id]['type'], async_result[x_id]['data']

        vms = VectorMergeSupport('NA', 'sample_id', ['x', 'y', 'c']) # changed so that it plots per sample not patient
        vms.add_dict_array(x_vec, 'x', 'value')
        vms.add_dict_array(y_vec, 'y', 'value')
        vms.add_dict_array(c_vec, 'c', 'value')
        merged = self.get_merged_dict_timed(vms)

        # Resolve which (requested) cohorts each datapoint belongs to.
        cohort_set_dict = CloudSQLCohortAccess.get_cohorts_for_datapoints(cohort_id_array)

        # Get the name and ID for every requested cohort.
        cohort_info_array = CloudSQLCohortAccess.get_cohort_info(cohort_id_array)
        cohort_info_obj_array = []
        for item in cohort_info_array:
            cohort_info_obj_array.append(PlotDataCohortInfo(id=item['id'], name=item['name']))

        items = []
        for value_bundle in merged:
            sample_id = value_bundle['sample_id']

            # Add an array of cohort
            # only if the number of containing cohort exceeds the configured threshold.
            cohort_set = []
            # TODO FIX - this check shouldn't be needed
            if sample_id in cohort_set_dict:
                cohort_set = cohort_set_dict[sample_id]
            if len(cohort_set) >= DATAPOINT_COHORT_THRESHOLD:
                value_bundle['cohort'] = cohort_set
            items.append(PlotDataPoint(**value_bundle))

        counts = self.get_counts(merged)
        count_message = PlotDatapointCount(**counts)

        type_message = PlotDataTypes(x=x_type, y=y_type, c=c_type)

        # TODO assign label for y if y_id is None, as in that case the y-field will be missing from the response
        label_message = PlotDataFeatureLabels(x=x_id, y=y_id, c=c_id)

        # TODO Refactor pairwise call to separate function
        # Include pairwise results
        input_vectors = [PairwiseInputVector(x_id, x_type, x_vec)]
        if c_id is not None:
            input_vectors.append(PairwiseInputVector(c_id, c_type, c_vec))
        if y_id is not None:
            input_vectors.append(PairwiseInputVector(y_id, y_type, y_vec))

        pairwise_result = None
        try:
            if len(input_vectors) > 1:
                pairwise_result = self.get_pairwise_result(input_vectors)
            else:
                pairwise_result = None
        except Exception as e:
            logging.warn("Pairwise results not included in returned object")
            logging.exception(e)

        return PlotDataResponse(types=type_message, labels=label_message, items=items,
                                cohort_set=cohort_info_obj_array,
                                counts=count_message, pairwise_result=pairwise_result)

    def get_feature_id_validity_for_array(self, feature_id_array):
        """
        For each feature identifier in an array, check whether or not the identifier is
        valid.

        Args:
            feature_id_array:

        Returns:
            Array of tuples - (feature identifier, <is valid>)
        """
        result = []
        for feature_id in feature_id_array:
            result.append((feature_id, is_valid_feature_identifier(feature_id)))

        return result

    @endpoints_method(PlotDataRequest, PlotDataResponse,
                      path='feature_data_plot', http_method='GET', name='feature_access.getFeatureDataForPlot')
    def data_access_for_plot(self, request):
        """ Used by the web application."""
        try:
            x_id = request.x_id
            y_id = request.y_id
            c_id = request.c_id
            cohort_id_array = request.cohort_id

            # Check that all requested feature identifiers are valid. Do not check for y_id if it is not
            # supplied in the request.
            feature_ids_to_check = [x_id]
            if c_id is not None:
                feature_ids_to_check.append(c_id)
            if y_id is not None:
                feature_ids_to_check.append(y_id)

            valid_features = self.get_feature_id_validity_for_array(feature_ids_to_check)

            for feature_id, is_valid in valid_features:
                logging.info((feature_id, is_valid))
                if not is_valid:
                    logging.error("Invalid internal feature ID '{}'".format(feature_id))
                    raise NotFoundException()

            return self.get_merged_feature_vectors(x_id, y_id, c_id, cohort_id_array)
        except NotFoundException as nfe:
            # Pass through NotFoundException so that it is not handled as Exception below.
            raise nfe
        except Exception as e:
            logging.exception(e)
            raise InternalServerErrorException()

