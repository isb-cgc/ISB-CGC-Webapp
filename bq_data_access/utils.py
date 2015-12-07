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
    def __init__(self, missing_value, sample_id_key, row_ids=[]):
        self.missing_value = missing_value
        self.sample_id_key = sample_id_key  # ex 'sample_id'

        # Sparse data goes here
        self.data = OrderedDict()
        self.sample_ids = OrderedDict()
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

        # ex: self.data['x'].append(_get_index_for_sample_id('TCGA-BH-A0B1-10A'), '66')
        # so self.data['x'] is a list of tuples with (index, value) instead of (barcode, value)
        self.data[row_id].append((self._get_index_for_sample_id(sample_id), value))

    def add_dict_array(self, vector, vector_id, value_key):
        # ex vector:
        # {'aliquot_id': None,
        #  'patient_id': u        # {'aliquot_id': None,
        #  'patient_id': u'TCGA-BH-A0B1',
        #  'sample_id': u'TCGA-BH-A0B1-10A',
        #  'value': u'66'},
        #  'sample_id': u'TCGA-BH-A0B1-10A',
        #  'value': u'66'}
        # ex: vector_id: 'x'
        # ex: value_key: 'value'

        for item in vector:
            sample_id = item[self.sample_id_key]
            value = item[value_key]
            # ex: _add_data_point('x', 'TCGA-BH-A0B1-10A', '66')
            self._add_data_point(vector_id, sample_id, value)

    def get_merged_dict(self):
        num_samples = self.current_sample_index
        # print num_samples #== this equals the number of patients in cohort. It should be the number of samples.
        result = [{} for x in xrange(num_samples)]

        for row_id, row_samples in self.data.items():
            row_values = [self.missing_value] * len(self.sample_ids)

            for sample_index, value in row_samples:
                row_values[sample_index] = value

            for index, value in enumerate(row_values):
                d = result[index]
                d[self.sample_id_key] = self.sample_ids.keys()[index]
                d[row_id] = value

        return result
