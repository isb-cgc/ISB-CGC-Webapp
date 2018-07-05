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

from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User

from cohorts.metadata_helpers import get_sql_connection
from bq_data_access.v2.plot_data_support import get_feature_id_validity_for_array
from cohorts.metadata_helpers import fetch_isbcgc_project_set

from google_helpers.bigquery.service_v2 import BigQueryServiceSupport
from bq_data_access.v2.data_access import FeatureVectorBigQueryBuilder
from bq_data_access.v2.plot_data_support import get_merged_feature_vectors
from bq_data_access.v2.cohort_cloudsql import add_cohort_info_to_merged_vectors
from bq_data_access.v2.feature_id_utils import FeatureDataTypeHelper
from bq_data_access.data_types.definitions import FEATURE_ID_TO_TYPE_MAP

from django.http import JsonResponse
from django.conf import settings as django_settings
from cohorts.models import Cohort, Program
from projects.models import Project
from cohorts.metadata_helpers import fetch_metadata_value_set

from bq_data_access.v2.feature_id_utils import FeatureProviderFactory

logger = logging.getLogger('main_logger')


def get_extended_public_program_name_set_for_user_extended_projects(user_extended_projects):
    """
    When working with user data where the user program is an extension of a public project,
    we need to follow the extension chain back up to the public project. This allows us to plot
    data contained in the public project against user data. Since public projects are identified
    by unique *names*, we resolve to the *names* of these projects

    Returns:
        Set of program names in lower case.
    """
    program_set = set()
    projects = Project.objects.filter(id__in=user_extended_projects)

    root_projects = [];
    tcga_projects = fetch_isbcgc_project_set()

    for project in projects:
        rad = project.get_my_root_and_depth()['root']
        if rad in tcga_projects:
            root_projects.append(rad)

    extended_projects = Project.objects.filter(id__in=root_projects)

    for ext_proj in extended_projects:
        pub_program = ext_proj.program
        p = Program.objects.get(id = pub_program.id)
        program_set.update([p.name.lower()])

    return program_set


def get_user_program_id_set_for_user_only_projects(user_only_project_ids):
    """
    Get User Programs for projects.

    Returns:
        user program ids
    """
    program_set = set()
    projects = Project.objects.filter(id__in=user_only_project_ids)

    for user_proj in projects:
        p = Program.objects.get(id = user_proj.program_id)
        program_set.update([p.id])

    return program_set


def get_public_program_name_set_for_cohorts(cohort_id_array):
    """
    Returns the set of names of superuser-owner public programs that
    are referred to by the samples in a list of cohorts.
    
    Returns:
        Set of program names in lower case.
    """
    superuser_username = django_settings.SITE_SUPERUSER_USERNAME
    superuser = User.objects.get(username=superuser_username, is_staff=True, is_superuser=True)
    program_set = set()
    result = Cohort.objects.filter(id__in=cohort_id_array)

    for cohort in result:
        cohort_programs = cohort.get_programs()

        # Filter down to public programs
        public_progams_in_cohort = Program.objects.filter(
            id__in=cohort_programs,
            is_public=True,
            owner=superuser)

        program_set.update([p.name.lower() for p in public_progams_in_cohort])

    return program_set


def get_confirmed_project_ids_for_cohorts(cohort_id_array):
    """
    Returns the project ID numbers that are referred to by the samples
    in a list of cohorts.
    
    Returns:
        List of project ID numbers.
    """
    cohort_vals = ()
    cohort_params = ""

    for cohort in cohort_id_array:
        cohort_params += "%s,"
        cohort_vals += (cohort,)

    cohort_params = cohort_params[:-1]
    db = get_sql_connection()
    cursor = db.cursor()

    tcga_studies = fetch_isbcgc_project_set()

    query_str = "SELECT DISTINCT project_id FROM cohorts_samples WHERE cohort_id IN (" + cohort_params + ");"
    cursor.execute(query_str, cohort_vals)

    # Only samples whose source studies are TCGA studies, or extended from them, should be used
    confirmed_study_ids = []
    unconfirmed_study_ids = []
    user_only_study_ids = []

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
            else:
                user_only_study_ids.append(project.id)

    logger.info("In get_confirmed_project_ids_for_cohorts, confirmed study IDs: {}".format(str(confirmed_study_ids)))

    return confirmed_study_ids, user_only_study_ids


def _feature_converter(feature_id):
    """
    User data feature requests can be mapped onto parent program feature IDs (this is the purpose of
    the shared_map_id column in the projects_user_feature_definitions table). Currently only used for
    case_barcodes, (which cannot be plotted?) but this capability was in the V1 code. Thus, we port it over.
    """
    if feature_id is None:
        return None
    provider_class = FeatureProviderFactory.get_provider_class_from_feature_id(feature_id)
    if provider_class.can_convert_feature_id():
        converted_user_feature = provider_class.convert_feature_id(feature_id)
        if converted_user_feature:
            if feature_id.startswith('v2') and not converted_user_feature.startswith('v2'):
                converted_user_feature = 'v2:{0}'.format(converted_user_feature)
            return converted_user_feature
    return feature_id


@login_required
def data_access_for_plot(request):
    """
    Used by the web application.
    """
    try:
        logTransform = None
        ver = request.GET.get('ver', '1')
        x_id = request.GET.get('x_id', None)
        y_id = request.GET.get('y_id', None)
        c_id = request.GET.get('c_id', None)
        try:
            # TODO Use jsonschema to validate logTransform object
            logTransform = json.loads(request.GET.get('log_transform', None))
        except Exception as e:
            logger.warn("[WARNING] Log transform parameter not supplied")
            logTransform = None

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
            if not is_valid:
                logging.error("Invalid internal feature ID '{}'".format(feature_id))
                raise Exception('Feature Not Found')

        # Gives the user data handler a chance to map e.g. "v2:USER:343:58901" to "v2:CLIN:case_barcode"
        x_id = _feature_converter(x_id)
        y_id = _feature_converter(y_id)
        c_id = _feature_converter(c_id)

        # Get the project IDs these cohorts' samples come from
        confirmed_study_ids, user_only_study_ids = get_confirmed_project_ids_for_cohorts(cohort_id_array)

        bqss = BigQueryServiceSupport.build_from_django_settings()
        fvb = FeatureVectorBigQueryBuilder.build_from_django_settings(bqss)

        # By extracting info from the cohort, we get the NAMES of the public projects
        # we need to access (public projects have unique name tags, e.g. tcga).
        program_set = get_public_program_name_set_for_cohorts(cohort_id_array)

        # We need to do this for cohorts that contain samples found in user data projects,
        # where those projects are extension of public data. This is because the cohorts
        # only reference the user project, but if we are plotting against pubic data, we
        # have to know which public programs we need to look at.

        prog_set_extended = get_extended_public_program_name_set_for_user_extended_projects(confirmed_study_ids)
        program_set.update(prog_set_extended)

        # Check to see if these programs have data for the requested vectors; if not, there's no reason to plot
        features_without_program_data = []
        for id in [x_id, y_id, c_id]:
            if id:
                type = id.split(':')[1].lower()
                plot_type = FEATURE_ID_TO_TYPE_MAP[type] if type in FEATURE_ID_TO_TYPE_MAP else None
                if plot_type:
                    programs = FeatureDataTypeHelper.get_supported_programs_from_data_type(plot_type)
                    valid_programs = set(programs).intersection(program_set)

                    if not len(valid_programs):
                        features_without_program_data.append(FeatureDataTypeHelper.get_proper_feature_type_name(plot_type))

        if len(features_without_program_data):
            return JsonResponse({'message': "The chosen cohorts do not contain programs with data for these features: {}.".format(", ".join(features_without_program_data))})

        user_programs = get_user_program_id_set_for_user_only_projects(user_only_study_ids)

        # Fix for #2381: confirmed_study_ids MUST ALWAYS contain the public dataset project IDs, because that's how we
        # enable older cohorts which didn't store project IDs (check for NULL) against ones where we did require the
        # project ID
        if len(user_programs):
            program_set.update(user_programs)
            confirmed_study_ids += user_only_study_ids

        data = get_merged_feature_vectors(fvb, x_id, y_id, c_id, cohort_id_array, logTransform, confirmed_study_ids, program_set=program_set)

        # Annotate each data point with cohort information
        add_cohort_info_to_merged_vectors(data, x_id, y_id, c_id, cohort_id_array)

        # convert to display strings where needed (eg. categoricals stored as indicies rather than strings)
        programs_by_project = {}
        preformatted_vals = {}
        for item in data['items']:
            programs = []
            for project in item['project']:
                # Fetch the program if we don't know it already
                if project not in programs_by_project:
                    programs_by_project[project] = Project.objects.get(id=project).program.id
                programs.append(programs_by_project[project])

            for program in programs:
                if program not in preformatted_vals:
                    preformatted_vals[program] = fetch_metadata_value_set(program)
                if x_id is not None and x_id.split(':')[-1] in preformatted_vals[program] and item['x'] in \
                        preformatted_vals[program][x_id.split(':')[-1]]['values']:
                    item['x'] = preformatted_vals[program][x_id.split(':')[-1]]['values'][item['x']]['displ_value']
                if y_id is not None and y_id.split(':')[-1] in preformatted_vals[program] and item['y'] in \
                        preformatted_vals[program][y_id.split(':')[-1]]['values']:
                    item['y'] = preformatted_vals[program][y_id.split(':')[-1]]['values'][item['y']]['displ_value']
                if c_id is not None and c_id.split(':')[-1] in preformatted_vals[program] and item['c'] in \
                        preformatted_vals[program][c_id.split(':')[-1]]['values']:
                    item['c'] = preformatted_vals[program][c_id.split(':')[-1]]['values'][item['c']]['displ_value']

        return JsonResponse(data)

    except Exception as e:
        logger.error("[ERROR] In data access for plot: ")
        logger.exception(e)
        return JsonResponse({'error': str(e)}, status=500)


