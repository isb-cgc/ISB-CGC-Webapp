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

# Import all supported data types
# ===============================
from bq_data_access.data_types.definitions import PlottableDataType, FEATURE_ID_TO_TYPE_MAP
# GEXP
from bq_data_access.v2.gexp_data import GEXPFeatureProvider
from bq_data_access.data_types.gexp import BIGQUERY_CONFIG as GEXP_BIGQUERY_CONFIG
from scripts.feature_def_gen.gexp_data.gexp_feature_def_provider import GEXPFeatureDefProvider
from scripts.feature_def_gen.gexp_features import GEXPFeatureDefConfig
# GNAB
from bq_data_access.v2.gnab_data import GNABFeatureProvider
from bq_data_access.data_types.gnab import BIGQUERY_CONFIG as GNAB_BIGQUERY_CONFIG
from scripts.feature_def_gen.gnab_data.gnab_feature_def_provider import GNABFeatureDefProvider
from scripts.feature_def_gen.gnab_features import GNABFeatureDefConfig

FEATURE_TYPE_TO_PROVIDER_MAP = {
    PlottableDataType.GEXP: GEXPFeatureProvider,
    PlottableDataType.GNAB: GNABFeatureProvider
}

# noinspection PyPackageRequirements
FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP = {
    PlottableDataType.GEXP: (GEXPFeatureDefConfig, GEXPFeatureDefProvider, GEXP_BIGQUERY_CONFIG),
    PlottableDataType.GNAB: (GNABFeatureDefConfig, GNABFeatureDefProvider, GNAB_BIGQUERY_CONFIG)
}


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
        # Build a regexp set of supported feature types, for example:
        # "CLIN|GEXP|METH".
        supported_feature_types = []
        for data_type_key in FEATURE_ID_TO_TYPE_MAP.keys():
            supported_feature_types.append(data_type_key.upper())

        types_regexp = "|".join(supported_feature_types)
        regex = re_compile("^v2:({}):".format(types_regexp))

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
        feature_type_prefix = cls.get_feature_type_string(feature_id)
        if feature_type_prefix is None:
            logger.error("FeatureProviderFactory.from_feature_id: invalid feature ID: " + str(feature_id))
            raise FeatureNotFoundException(feature_id)

        if feature_type_prefix not in FEATURE_ID_TO_TYPE_MAP:
            logger.error("FeatureProviderFactory.from_feature_id: invalid feature ID: " + str(feature_id))
            raise FeatureNotFoundException(feature_id)

        feature_type = FEATURE_ID_TO_TYPE_MAP[feature_type_prefix]
        return FEATURE_TYPE_TO_PROVIDER_MAP[feature_type]

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


class FeatureDataTypeHelper(object):
    @classmethod
    def get_type(cls, param):
        return FEATURE_ID_TO_TYPE_MAP[param.lower()]

    @classmethod
    def get_feature_def_config_from_data_type(cls, data_type):
        config_class, _, _ = FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP[data_type]
        return config_class

    @classmethod
    def get_feature_def_provider_from_data_type(cls, data_type):
        _, provider_class, _ = FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP[data_type]
        return provider_class

    @classmethod
    def get_feature_def_default_config_dict_from_data_type(cls, data_type):
        _, _, config_dict = FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP[data_type]
        return config_dict

