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

from re import compile as re_compile
import logging as logger

from bq_data_access.v2.errors import FeatureNotFoundException
from bq_data_access.v2.gexp_data import GEXPFeatureProvider, GEXP_FEATURE_TYPE


class FeatureIdQueryDescription(object):
    def __init__(self, feature_id, cohort_id_array, project_id_array):
        self.feature_id = feature_id
        self.cohort_id_array = cohort_id_array
        self.project_id_array = project_id_array


class ProviderClassQueryDescription(object):
    def __init__(self, feature_data_provider_class, feature_id, cohort_id_array, project_id_array):
        self.feature_data_provider_class = feature_data_provider_class
        self.feature_id = feature_id
        self.cohort_id_array = cohort_id_array
        self.project_id_array = project_id_array


class FeatureProviderFactory(object):
    @classmethod
    def get_feature_type_string(cls, feature_id):
        regex = re_compile("^(CLIN|GEXP|METH|CNVR|RPPA|MIRN|GNAB|USER):")

        feature_fields = regex.findall(feature_id)
        if len(feature_fields) == 0:
            return None

        feature_type = feature_fields[0]
        return feature_type

    @classmethod
    def get_provider_class_from_feature_id(cls, feature_id):
        """
        Args:
            feature_id: Feature identifier

        Returns:
            Feature data provider class for the datatype defined in the
            feature identifier.

        Raises:
            FeatureNotFoundException: If the datatype part of the feature
            identifier is unknown.

        """
        feature_type = cls.get_feature_type_string(feature_id)
        if feature_type is None:
            logger.debug("FeatureProviderFactory.from_feature_id: invalid feature ID: " + str(feature_id))
            raise FeatureNotFoundException(feature_id)

        if feature_type == GEXP_FEATURE_TYPE:
            return GEXPFeatureProvider

    @classmethod
    def from_feature_id(cls, feature_id, **kwargs):
        provider_class = cls.get_provider_class_from_feature_id(feature_id)
        return provider_class(feature_id, **kwargs)

    @classmethod
    def from_parameters(cls, parameters_obj, **kwargs):
        if isinstance(parameters_obj, FeatureIdQueryDescription):
            return cls.from_feature_id(parameters_obj.feature_id, **kwargs)
        elif isinstance(parameters_obj, ProviderClassQueryDescription):
            class_type = parameters_obj.feature_data_provider_class
            feature_id = parameters_obj.feature_id
            return class_type(feature_id, **kwargs)