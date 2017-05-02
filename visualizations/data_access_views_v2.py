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

import json
import logging
import traceback
import sys

from cohorts.metadata_helpers import get_sql_connection
from bq_data_access.v2.plot_data_support import get_feature_id_validity_for_array
from cohorts.metadata_helpers import fetch_isbcgc_project_set

from bq_data_access.v2.data_access import FeatureVectorBigQueryBuilder
from bq_data_access.v2.plot_data_support import get_merged_feature_vectors
from google_helpers.bigquery_service_v2 import BigQueryServiceSupport

from django.http import JsonResponse
from projects.models import Project

logger = logging.getLogger(__name__)


def data_access_for_plot(request):
    """ Used by the web application."""
    try:
        ver = request.GET.get('ver', '1')
        x_id = request.GET.get('x_id', None)
        y_id = request.GET.get('y_id', None)
        c_id = request.GET.get('c_id', None)
        logTransform = json.loads(request.GET.get('log_transform', None))
        cohort_id_array = request.GET.getlist('cohort_id', None)

        # Check that all requested feature identifiers are valid. Do not check for y_id if it is not
        # supplied in the request.
        feature_ids_to_check = [x_id]
        if c_id is not None:
            feature_ids_to_check.append(c_id)
        if y_id is not None:
            feature_ids_to_check.append(y_id)

        valid_features = get_feature_id_validity_for_array(feature_ids_to_check)

        for feature_id, is_valid in valid_features:
            logging.info((feature_id, is_valid))
            if not is_valid:
                logging.error("Invalid internal feature ID '{}'".format(feature_id))
                raise Exception('Feature Not Found')

        # Get the project IDs these cohorts' samples come from
        cohort_vals = ()
        cohort_params = ""

        for cohort in cohort_id_array:
            cohort_params += "%s,"
            cohort_vals += (cohort,)

        cohort_params = cohort_params[:-1]

        db = get_sql_connection()
        cursor = db.cursor()

        tcga_studies = fetch_isbcgc_project_set()

        cursor.execute("SELECT DISTINCT project_id FROM cohorts_samples WHERE cohort_id IN ("+cohort_params+");",cohort_vals)

        # Only samples whose source studies are TCGA studies, or extended from them, should be used
        confirmed_study_ids = []
        unconfirmed_study_ids = []

        for row in cursor.fetchall():
            if row[0] in tcga_studies:
                if row[0] not in confirmed_study_ids:
                    confirmed_study_ids.append(row[0])
            elif row[0] not in unconfirmed_study_ids:
                unconfirmed_study_ids.append(row[0])

        if len(unconfirmed_study_ids) > 0:
            projects = Project.objects.filter(id__in=unconfirmed_study_ids)

            for project in projects:
                if project.get_my_root_and_depth()['root'] in tcga_studies:
                    confirmed_study_ids.append(project.id)

        bqss = BigQueryServiceSupport.build_from_django_settings()
        fvb = FeatureVectorBigQueryBuilder.build_from_django_settings(bqss)
        program_set = set(['tcga'])

        data = get_merged_feature_vectors(fvb, x_id, y_id, None, cohort_id_array, logTransform, confirmed_study_ids, program_set=program_set)
        return data

    except Exception as e:
        print >> sys.stdout, traceback.format_exc()
        logger.exception(e)
        return JsonResponse({'error': str(e)}, status=500)

