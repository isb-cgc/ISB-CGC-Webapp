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

from builtins import str
from builtins import object
from re import compile as re_compile
import logging as logger

from bq_data_access.v2.errors import FeatureNotFoundException

# Import all supported data types
# ===============================
from bq_data_access.data_types.definitions import PlottableDataType, FEATURE_ID_TO_TYPE_MAP
# GEXP
from bq_data_access.v2.gexp_data import GEXPDataQueryHandler
from bq_data_access.data_types.gexp import BIGQUERY_CONFIG as GEXP_BIGQUERY_CONFIG
from scripts.feature_def_gen.gexp_data.gexp_feature_def_builder import GEXPFeatureDefBuilder
from scripts.feature_def_gen.gexp_features import GEXPDataSourceConfig
# GNAB
from bq_data_access.v2.gnab_data import GNABDataQueryHandler
from bq_data_access.data_types.gnab import BIGQUERY_CONFIG as GNAB_BIGQUERY_CONFIG
from scripts.feature_def_gen.gnab_data.gnab_feature_def_builder import GNABFeatureDefBuilder
from scripts.feature_def_gen.gnab_features import GNABDataSourceConfig
# METH
from bq_data_access.v2.methylation_data import METHDataQueryHandler
from bq_data_access.data_types.methylation import BIGQUERY_CONFIG as METH_BIGQUERY_CONFIG
from scripts.feature_def_gen.methylation_data.methylation_feature_def_builder import METHFeatureDefBuilder
from scripts.feature_def_gen.methylation_features import METHDataSourceConfig
# RPPA
from bq_data_access.v2.protein_data import RPPADataQueryHandler
from bq_data_access.data_types.rppa import BIGQUERY_CONFIG as RPPA_BIGQUERY_CONFIG
from scripts.feature_def_gen.protein_data.protein_feature_def_builder import RPPAFeatureDefBuilder
from scripts.feature_def_gen.protein_features import RPPADataSourceConfig
# CNVR
from bq_data_access.v2.copynumber_data import CNVRDataQueryHandler
from bq_data_access.data_types.cnvr import BIGQUERY_CONFIG as CNVR_BIGQUERY_CONFIG
from scripts.feature_def_gen.copynumber_data.copynumber_feature_def_builder import CNVRFeatureDefBuilder
from scripts.feature_def_gen.copynumber_features import CNVRDataSourceConfig

# MIRN
from bq_data_access.v2.mirna_data import MIRNDataQueryHandler
from bq_data_access.data_types.mirna import BIGQUERY_CONFIG as MIRN_BIGQUERY_CONFIG
from scripts.feature_def_gen.mirna_data.mirna_feature_def_builder import MIRNFeatureDefBuilder
from scripts.feature_def_gen.mirna_features import MIRNDataSourceConfig

# CLIN
from bq_data_access.v2.clinical_data import ClinicalDataQueryHandler
from bq_data_access.data_types.clinical import BIGQUERY_CONFIG as CLIN_BIGQUERY_CONFIG
from scripts.feature_def_gen.clinical_features import CLINDataSourceConfig

# USER
from bq_data_access.v2.user_data import UserDataQueryHandler

FEATURE_TYPE_TO_PROPER_NAME = {
    PlottableDataType.GEXP: "Gene Expression",
    PlottableDataType.GNAB: "Gene Mutations",
    PlottableDataType.METH: "DNA Methylation",
    PlottableDataType.RPPA: "Protein Expression",
    PlottableDataType.CNVR: "Copy Number Variation",
    PlottableDataType.MIRN: "miRNA Expression",
    PlottableDataType.CLIN: "Clinical Data",
    PlottableDataType.USER: "User Data"
}

FEATURE_TYPE_TO_PROVIDER_MAP = {
    PlottableDataType.GEXP: GEXPDataQueryHandler,
    PlottableDataType.GNAB: GNABDataQueryHandler,
    PlottableDataType.METH: METHDataQueryHandler,
    PlottableDataType.RPPA: RPPADataQueryHandler,
    PlottableDataType.CNVR: CNVRDataQueryHandler,
    PlottableDataType.MIRN: MIRNDataQueryHandler,
    PlottableDataType.CLIN: ClinicalDataQueryHandler,
    PlottableDataType.USER: UserDataQueryHandler
}

# noinspection PyPackageRequirements
FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP = {
    PlottableDataType.GEXP: (GEXPDataSourceConfig, GEXPFeatureDefBuilder, GEXPDataQueryHandler, GEXP_BIGQUERY_CONFIG),
    PlottableDataType.GNAB: (GNABDataSourceConfig, GNABFeatureDefBuilder, GNABDataQueryHandler, GNAB_BIGQUERY_CONFIG),
    PlottableDataType.METH: (METHDataSourceConfig, METHFeatureDefBuilder, METHDataQueryHandler, METH_BIGQUERY_CONFIG),
    PlottableDataType.RPPA: (RPPADataSourceConfig, RPPAFeatureDefBuilder, RPPADataQueryHandler, RPPA_BIGQUERY_CONFIG),
    PlottableDataType.CNVR: (CNVRDataSourceConfig, CNVRFeatureDefBuilder, CNVRDataQueryHandler, CNVR_BIGQUERY_CONFIG),
    PlottableDataType.MIRN: (MIRNDataSourceConfig, MIRNFeatureDefBuilder, MIRNDataQueryHandler, MIRN_BIGQUERY_CONFIG),
    PlottableDataType.CLIN: (CLINDataSourceConfig, None, ClinicalDataQueryHandler, CLIN_BIGQUERY_CONFIG),
    PlottableDataType.USER: (None, None, UserDataQueryHandler, None)

}


class FeatureIdQueryDescription(object):
    def __init__(self, feature_id, cohort_id_array, project_id_array, program_set):
        self.feature_id = feature_id
        self.cohort_id_array = cohort_id_array
        self.project_id_array = project_id_array
        self.program_set = program_set


class ProviderClassQueryDescription(object):
    def __init__(self, feature_data_provider_class, feature_id, cohort_id_array, project_id_array, program_set,
                 extra_params={}):
        self.feature_data_provider_class = feature_data_provider_class
        self.feature_id = feature_id
        self.cohort_id_array = cohort_id_array
        self.project_id_array = project_id_array
        self.program_set = program_set
        self.extra_params = extra_params


class FeatureProviderFactory(object):
    @classmethod
    def get_feature_type_string(cls, feature_id):
        # Build a regexp set of supported feature types, for example:
        # "CLIN|GEXP|METH".
        supported_feature_types = []
        for data_type_key in list(FEATURE_ID_TO_TYPE_MAP.keys()):
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
            logger.error("FeatureProviderFactory.from_feature_id: Unknown type: " + str(feature_id))
            raise FeatureNotFoundException(feature_id)

        if feature_type_prefix.lower() not in FEATURE_ID_TO_TYPE_MAP:
            logger.error("FeatureProviderFactory.from_feature_id: invalid feature ID: " + str(feature_id))
            raise FeatureNotFoundException(feature_id)

        feature_type = FEATURE_ID_TO_TYPE_MAP[feature_type_prefix.lower()]
        return FeatureDataTypeHelper.get_feature_data_provider_from_data_type(feature_type)

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
        config_class, _, _, _ = FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP[data_type]
        return config_class

    @classmethod
    def get_feature_def_provider_from_data_type(cls, data_type):
        _, provider_class, _, _ = FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP[data_type]
        return provider_class

    @classmethod
    def get_feature_def_default_config_dict_from_data_type(cls, data_type):
        _, _, _, config_dict = FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP[data_type]
        return config_dict

    @classmethod
    def get_feature_data_provider_from_data_type(cls, data_type):
        _, _, data_provider_class, _ = FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP[data_type]
        return data_provider_class

    @classmethod
    def get_supported_programs_from_data_type(cls, data_type):
        _, _, _, config_dict = FEATURE_TYPE_TO_FEATURE_DEF_PROVIDER_MAP[data_type]
        programs = []
        layout_type = 'tables' if 'tables' in config_dict else 'table_structure'
        for table in config_dict[layout_type]:
            if table['program'] not in programs:
                programs.append(table['program'])

        return programs

    @classmethod
    def get_proper_feature_type_name(cls, data_type):
        return FEATURE_TYPE_TO_PROPER_NAME[data_type]


