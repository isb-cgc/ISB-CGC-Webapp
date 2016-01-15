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

from api.api_helpers import sql_connection, MySQLdb

from bq_data_access.errors import FeatureNotFoundException
from bq_data_access.gexp_data import GEXPFeatureProvider, GEXP_FEATURE_TYPE
from bq_data_access.methylation_data import METHFeatureProvider, METH_FEATURE_TYPE
from bq_data_access.copynumber_data import CNVRFeatureProvider, CNVR_FEATURE_TYPE
from bq_data_access.protein_data import RPPAFeatureProvider, RPPA_FEATURE_TYPE
from bq_data_access.mirna_data import MIRNFeatureProvider, MIRN_FEATURE_TYPE
from bq_data_access.clinical_data import ClinicalFeatureProvider, CLINICAL_FEATURE_TYPE
from bq_data_access.gnab_data import GNABFeatureProvider, GNAB_FEATURE_TYPE
from bq_data_access.user_data import UserFeatureProvider, USER_FEATURE_TYPE

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
    def from_feature_id(cls, feature_id):
        feature_type = cls.get_feature_type_string(feature_id)
        if feature_type is None:
            logging.debug("FeatureProviderFactory.from_feature_id: invalid feature ID: " + str(feature_id))
            raise FeatureNotFoundException(feature_id)

        if feature_type == CLINICAL_FEATURE_TYPE:
            return ClinicalFeatureProvider(feature_id)
        elif feature_type == GEXP_FEATURE_TYPE:
            return GEXPFeatureProvider(feature_id)
        elif feature_type == METH_FEATURE_TYPE:
            return METHFeatureProvider(feature_id)
        elif feature_type == CNVR_FEATURE_TYPE:
            return CNVRFeatureProvider(feature_id)
        elif feature_type == RPPA_FEATURE_TYPE:
            return RPPAFeatureProvider(feature_id)
        elif feature_type == MIRN_FEATURE_TYPE:
            return MIRNFeatureProvider(feature_id)
        elif feature_type == GNAB_FEATURE_TYPE:
            return GNABFeatureProvider(feature_id)
        elif feature_type == USER_FEATURE_TYPE:
            return UserFeatureProvider(feature_id)


def get_feature_vector(feature_id, cohort_id_array):

    include_tcga = False
    user_studies = ()
    for cohort_id in cohort_id_array:
        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)

            cursor.execute("SELECT study_id FROM cohorts_samples WHERE cohort_id = %s GROUP BY study_id", (cohort_id,))
            for row in cursor.fetchall():
                if row['study_id'] is None:
                    include_tcga = True
                else:
                    user_studies += (row['study_id'],)

        except Exception as e:
            if db: db.close()
            if cursor: cursor.close()
            raise e

    #  ex: feature_id 'CLIN:Disease_Code'
    user_feature_id = None
    if feature_id.startswith('USER:'):
        # Try and convert it with a shared ID to a TCGA queryable id
        user_feature_id = feature_id
        feature_id = UserFeatureProvider.convert_user_feature_id(feature_id)
        if feature_id is None:
            # Querying user specific data, don't include TCGA
            include_tcga = False

    items = []
    type = None
    result = []
    cohort_settings = settings.GET_BQ_COHORT_SETTINGS()
    if include_tcga:
        provider = FeatureProviderFactory.from_feature_id(feature_id)
        result = provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)

        # ex: result[0]
        # {'aliquot_id': None, 'patient_id': u'TCGA-BH-A0B1', 'sample_id': u'TCGA-BH-A0B1-10A', 'value': u'BRCA'}
        for data_point in result:
            data_item = {key: data_point[key] for key in ['patient_id', 'sample_id', 'aliquot_id']}
            value = provider.process_data_point(data_point)
            # TODO refactor missing value logic
            if value is None:
                value = 'NA'
            data_item['value'] = value
            items.append(data_item)

        type = provider.get_value_type()

    if len(user_studies) > 0:
        # Query User Data
        user_provider = UserFeatureProvider(feature_id, user_feature_id=user_feature_id)
        user_result = user_provider.get_data(cohort_id_array, cohort_settings.dataset_id, cohort_settings.table_id)
        result.extend(user_result)

        for data_point in user_result:
            data_item = {key: data_point[key] for key in ['patient_id', 'sample_id', 'aliquot_id']}
            value = provider.process_data_point(data_point)
            # TODO refactor missing value logic
            if value is None:
                value = 'NA'
            data_item['value'] = value
            items.append(data_item)

        if not type:
            type = user_provider.get_value_type()

    return type, items
