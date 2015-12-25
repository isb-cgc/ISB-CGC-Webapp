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
from re import compile as re_compile

from django.conf import settings

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.gexp_data import GEXPFeatureProvider, GEXP_FEATURE_TYPE
from bq_data_access.methylation_data import METHFeatureProvider, METH_FEATURE_TYPE
from bq_data_access.copynumber_data import CNVRFeatureProvider, CNVR_FEATURE_TYPE
from bq_data_access.protein_data import RPPAFeatureProvider, RPPA_FEATURE_TYPE
from bq_data_access.mirna_data import MIRNFeatureProvider, MIRN_FEATURE_TYPE
from bq_data_access.clinical_data import ClinicalFeatureProvider, CLINICAL_FEATURE_TYPE
from bq_data_access.gnab_data import GNABFeatureProvider, GNAB_FEATURE_TYPE


class FeatureProviderFactory(object):
    @classmethod
    def get_feature_type_string(cls, feature_id):
        regex = re_compile("^(CLIN|GEXP|METH|CNVR|RPPA|MIRN|GNAB):")

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
            logging.debug("FeatureProviderFactory.from_feature_id: invalid feature ID: " + str(feature_id))
            raise FeatureNotFoundException(feature_id)

        if feature_type == CLINICAL_FEATURE_TYPE:
            return ClinicalFeatureProvider
        elif feature_type == GEXP_FEATURE_TYPE:
            return GEXPFeatureProvider
        elif feature_type == METH_FEATURE_TYPE:
            return METHFeatureProvider
        elif feature_type == CNVR_FEATURE_TYPE:
            return CNVRFeatureProvider
        elif feature_type == RPPA_FEATURE_TYPE:
            return RPPAFeatureProvider
        elif feature_type == MIRN_FEATURE_TYPE:
            return MIRNFeatureProvider
        elif feature_type == GNAB_FEATURE_TYPE:
            return GNABFeatureProvider

    @classmethod
    def from_feature_id(cls, feature_id):
        provider_class = cls.get_provider_class_from_feature_id(feature_id)
        return provider_class(feature_id)


def is_valid_feature_identifier(feature_id):
    """
    Answers if given internal feature identifier is valid.

    Args:
        feature_id: Internal feature identifier

    Returns:
        True if feature id is valid, otherwise False.
    """
    is_valid = False
    try:
        provider_class = FeatureProviderFactory.get_provider_class_from_feature_id(feature_id)
        is_valid = provider_class.is_valid_feature_id(feature_id)
    except FeatureNotFoundException:
        # FeatureProviderFactory.get_provider_class_from_feature_id raises FeatureNotFoundException
        # if the feature identifier does not look valid. Nothing needs to be done here,
        # since is_valid is already False.
        pass
    finally:
        return is_valid


def get_feature_vector(feature_id, cohort_id_array):
    """
    Fetches the data from BigQuery tables for a given feature identifier and
    one or more stored cohorts. Returns the intersection of the samples defined
    by the feature identifier and the stored cohort.

    Each returned data point is represented as a dict containing patient, sample and
    aliquot barcodes, and the value as defined by the feature identifier.

    Args:
        feature_id: Feature identifier
        cohort_id_array: Array of cohort identifiers (integers)

    Returns:
        Data as an array of dicts.
    """
    provider = FeatureProviderFactory.from_feature_id(feature_id)
    cohort_settings = settings.GET_BQ_COHORT_SETTINGS()

    result = provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)

    items = []
    for data_point in result:
        data_item = {key: data_point[key] for key in ['patient_id', 'sample_id', 'aliquot_id']}
        value = provider.process_data_point(data_point)
        # TODO refactor missing value logic
        if value is None:
            value = 'NA'
        data_item['value'] = value
        items.append(data_item)

    return provider.get_value_type(), items
