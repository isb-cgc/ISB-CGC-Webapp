from endpoints import api as endpoints_api, method as endpoints_method
from endpoints import NotFoundException, InternalServerErrorException

from protorpc import remote
from protorpc.messages import EnumField, IntegerField, Message, MessageField, StringField

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.feature_value_types import ValueType
from bq_data_access.data_access import get_feature_vector
from bq_data_access.utils import VectorMergeSupport

from bq_data_access.cohort_cloudsql import CloudSQLCohortAccess

import logging
import time

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
    c_id = StringField(3, required=True)
    cohort_id = IntegerField(4, repeated=True)

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

FeatureDataEndpointsAPI = endpoints_api(name='feature_data_api', version='v1')

@FeatureDataEndpointsAPI.api_class(resource_name='feature_data_endpoints')
class FeatureDataEndpoints(remote.Service):
    def getCounts(self, data):

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

        # TODO refactor missing value logic out of this module
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
        :param c_id: Feature identifier for color-by
        :param cohort_id_array: Cohort identifier array.

        :return: PlotDataResponse
        """

        start = time.time()

        x_type, x_vec = get_feature_vector(x_id, cohort_id_array)
        # ex: x_type 'INTEGER'
        # ex: x_vec[0]:
        # {'aliquot_id': None,
        #  'patient_id': u'TCGA-BH-A0B1',
        #  'sample_id': u'TCGA-BH-A0B1-10A',
        #  'value': u'66'}
        # print 'here\n'

        y_type, y_vec = ValueType.STRING, []
        if y_id is not None:
            y_type, y_vec = get_feature_vector(y_id, cohort_id_array)
        c_type, c_vec = get_feature_vector(c_id, cohort_id_array)

        # ex: c_vec[0]
        # {'aliquot_id': None,
        #  'patient_id': u'TCGA-BH-A0B1',
        #  'sample_id': u'TCGA-BH-A0B1-10A',
        #  'value': u'BRCA'}
        # print 'here\n'
        # TODO fix hardcoded usage of 'patient_id'
        vms = VectorMergeSupport('NA', 'sample_id', ['x', 'y', 'c']) # changed so that it plots per sample not patient
        vms.add_dict_array(x_vec, 'x', 'value')
        vms.add_dict_array(y_vec, 'y', 'value')
        vms.add_dict_array(c_vec, 'c', 'value')

        merged = vms.get_merged_dict()
        # ex: meregd[0] {'c': u'BRCA', 'sample_id': u'TCGA-BH-A0B1-10A', 'x': u'66', 'y': 'NA'}

        # Resolve which (requested) cohorts each datapoint belongs to.
        cohort_set_dict = CloudSQLCohortAccess.get_cohorts_for_datapoints(cohort_id_array)
        # ex:
        # { "TCGA-24-1111-02B": [2, 4, 5],
        #   "TCGA-24-2222-03A": [2] }

        # Get the name and ID for every requested cohort.
        cohort_info_array = CloudSQLCohortAccess.get_cohort_info(cohort_id_array)
        # ex: cohort_info_obj
        #  {
        #    'id': 1, 'name': 'Name of cohort',
        #    'id': 2, 'name': 'Name of another cohort'
        #  }
        cohort_info_obj_array = []
        for item in cohort_info_array:
            cohort_info_obj_array.append(PlotDataCohortInfo(**item))

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
        # ex: items[0] <PlotDataPoint sample_id: u'TCGA-BH-A0B1-10A' x: u'66' y: 'NA' c: u'BRCA'>

        counts = self.getCounts(merged)
        count_message = PlotDatapointCount(**counts)

        type_message = PlotDataTypes(x=x_type, y=y_type, c=c_type)
        # ex: type_message
        # <PlotDataTypes
        #  x: ValueType(INTEGER, 2)
        #  y: ValueType(STRING, 1)
        #  c: ValueType(STRING, 1)>

        # TODO assign label for y if y_id is None, as in that case the y-field will be missing from the response
        label_message = PlotDataFeatureLabels(x=x_id, y=y_id, c=c_id)

        # ex: label_message
        # <PlotDataFeatureLabels
        #  x: u'CLIN:age_at_initial_pathologic_diagnosis'
        #  c: u'CLIN:disease_code'>

        end = time.time()
        time_elapsed = end-start
        logging.info('Time elapsed: ' + str(time_elapsed))

        return PlotDataResponse(types=type_message, labels=label_message, items=items,
                                cohort_set=cohort_info_obj_array,
                                counts=count_message)

    @endpoints_method(DataRequest, DataPointList,
                      path='feature_data', http_method='GET', name='feature_access.getFeatureData')
    def data_access_by_feature(self, request):
        try:
            feature_id = request.feature_id
            cohort_id_array = [request.cohort_id]
            vector_type, vector = get_feature_vector(feature_id, cohort_id_array)
            return DataPointList(type=vector_type, items=vector)
        except Exception as e:
            logging.exception(e)
            raise NotFoundException()

    @endpoints_method(PlotDataRequest, PlotDataResponse,
                      path='feature_data_plot', http_method='GET', name='feature_access.getFeatureDataForPlot')
    def data_access_for_plot(self, request):
        try:
            x_id = request.x_id
            y_id = request.y_id
            c_id = request.c_id
            cohort_id_array = request.cohort_id
            return self.get_merged_feature_vectors(x_id, y_id, c_id, cohort_id_array)
        except FeatureNotFoundException as fnf:
            logging.error("Invalid internal feature ID '{}'".format(str(fnf)))
            raise NotFoundException()
        except Exception as e:
            logging.exception(e)
            raise InternalServerErrorException()
