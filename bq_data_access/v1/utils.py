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

from collections import OrderedDict
import logging
from time import time


def vector_to_dict(vector, id_key, value_key):
    result = {}
    for item in vector:
        item_id = item[id_key]
        value = item[value_key]
        result[item_id] = value

    return result


def find_all_id_keys(*vectors, **kwargs):
    value_key = kwargs['value_key']
    id_key = kwargs['id_key']
    identifiers = set()
    for index, vector in enumerate(vectors):
        for item in vector:
            item_id = item[id_key]

            identifiers.add(item_id)

    return identifiers


class VectorMergeSupport(object):
    def __init__(self, missing_value, sample_id_key, case_id_key, row_ids=[]):
        self.missing_value = missing_value
        self.sample_id_key = sample_id_key
        self.case_id_key = case_id_key

        # Sparse data goes here
        self.data = OrderedDict()
        self.sample_ids = OrderedDict()
        self.case_ids = {}
        self.current_sample_index = 0

        for row_id in row_ids:
            self.data[row_id] = []

    def _get_index_for_sample_id(self, sample_id):
        if sample_id not in self.sample_ids:
            self.sample_ids[sample_id] = self.current_sample_index
            self.current_sample_index += 1

        return self.sample_ids[sample_id]

    def _add_data_point(self, row_id, sample_id, value):
        if row_id not in self.data:
            self.data[row_id] = []

        self.data[row_id].append((self._get_index_for_sample_id(sample_id), value))

    def add_dict_array(self, vector, vector_id, value_key):
        for item in vector:
            sample_id = item[self.sample_id_key]
            if item[self.sample_id_key] not in self.case_ids:
                self.case_ids[sample_id] = item[self.case_id_key]
            value = item[value_key]
            self._add_data_point(vector_id, sample_id, value)

    def get_merged_dict(self):
        num_samples = self.current_sample_index
        result = [{} for _ in xrange(num_samples)]
        sample_id_keys = self.sample_ids.keys()

        for row_id, row_samples in self.data.items():
            row_values = [self.missing_value] * len(self.sample_ids)

            for sample_index, value in row_samples:
                row_values[sample_index] = value

            counter = 0
            for index, value in enumerate(row_values):
                counter += 1
                d = result[index]
                d[self.sample_id_key] = sample_id_keys[index]
                d[row_id] = value
                d[self.case_id_key] = self.case_ids[sample_id_keys[index]]

        return result


class DurationLogged(object):
    """
    Decorator for logging duration of a function. By default, the messages are logged by calling
    "logging.info". The messages have the following format:
    "<datatype> <operation> TIME <duration>"

    For example, if datatype is CLIN and operation is BQ_QUERY and duration was 1.5 seconds, the message would be
    "CLIN BQ_QUERY TIME 1.5".
    """
    def __init__(self, datatype, operation):
        """
        Constructor.

        Args:
            datatype: "Datatype" field for the logged message
            operation: "Operation" field for the logged message
        """
        self.datatype = datatype
        self.operation = operation

    def log(self, msg):
        logging.info(msg)

    def __call__(self, f):
        def wrapped_function(*args, **kwargs):
            time_start = time()
            result = f(*args, **kwargs)
            time_end = time()
            time_elapsed = time_end - time_start

            self.log("{dt} {op} TIME {t}".format(dt=self.datatype,
                                                 op=self.operation,
                                                 t=str(time_elapsed)))
            return result

        return wrapped_function

