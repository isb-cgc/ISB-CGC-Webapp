###
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###
from __future__ import absolute_import

from builtins import str
import json
import logging
import re
import sys
import traceback

from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from bq_data_access.v1.feature_search.util import SearchableFieldHelper
from bq_data_access.v2.feature_search.util import SearchableFieldHelper as SearchableFieldHelper_v2
from bq_data_access.v2.feature_search.clinical_schema_utils import ClinicalColumnFeatureSupport
from .models import VariableFavorite
from workbooks.models import Workbook, Worksheet
from projects.models import Program
from django.core.exceptions import ObjectDoesNotExist
from django.contrib import messages
from django.conf import settings
from django.contrib.auth.models import User as Django_User
from django.http import HttpResponse, JsonResponse

from cohorts.metadata_helpers import fetch_program_attr
from GenespotRE.templatetags.custom_tags import get_readable_name

debug = settings.DEBUG

BLACKLIST_RE = settings.BLACKLIST_RE

logger = logging.getLogger('main_logger')


@login_required
def variable_fav_list_for_new_workbook(request):
    return variable_fav_list(request=request, new_workbook=True)


@login_required
def variable_fav_list(request, workbook_id=0, worksheet_id=0, new_workbook=0):
    template = 'variables/variable_list.html'
    context  = {}

    variable_list = VariableFavorite.get_list(request.user)
    if not variable_list.count():
        variable_list = None
    context['variable_list']=variable_list

    if workbook_id != 0:
        try:
            workbook_model       = Workbook.objects.get(id=workbook_id)
            context['workbook']  = workbook_model
            worksheet_model      = Worksheet.objects.get(id=worksheet_id)
            context['worksheet'] = worksheet_model
            context['base_url']  = settings.BASE_URL

            if variable_list:
                template = 'variables/variables_select.html'
            else:
                return initialize_variable_selection_page(request, workbook_id=workbook_id, worksheet_id=worksheet_id)

        except ObjectDoesNotExist:
            messages.error(request, 'The workbook and worksheet you were referencing does not exist.')
            return redirect('variables')
    elif new_workbook:
        context['new_workbook'] = True
        if variable_list:
            template = 'variables/variables_select.html'
        else:
            return initialize_variable_selection_page(request, new_workbook=True)

    return render(request, template, context)


@login_required
def variable_fav_detail_for_new_workbook(request, variable_fav_id):
    return variable_fav_detail(request=request, variable_fav_id=variable_fav_id, new_workbook=True)


@login_required
def variable_fav_detail(request, variable_fav_id, workbook_id=0, worksheet_id=0, new_workbook=0):
    template = 'variables/variable_detail.html'
    context  = {}
    if new_workbook:
        context['new_workbook'] = True

    if workbook_id:
        try:
            workbook_model       = Workbook.objects.get(id=workbook_id)
            context['workbook']  = workbook_model
            worksheet_model      = Worksheet.objects.get(id=worksheet_id)
            context['worksheet'] = worksheet_model
        except ObjectDoesNotExist:
            messages.error(request, 'The workbook you were referencing does not exist.')
            return redirect('variables')
    try:
        variable_fav = VariableFavorite.get_deep(id=variable_fav_id, user=request.user)
        context['variables'] = variable_fav
        variable_fav.mark_viewed(request)
    except ObjectDoesNotExist:
        messages.error(request, 'The variable favorite you were looking for does not exist.')
        return redirect('variables')

    return render(request, template, context)


@login_required
def variable_fav_edit_for_new_workbook(request):
    return initialize_variable_selection_page(request, new_workbook=True)


@login_required
def variable_fav_edit_for_existing_workbook(request, workbook_id=0, worksheet_id=0, variable_fav_id=0):
    return initialize_variable_selection_page(request, workbook_id=workbook_id, worksheet_id=worksheet_id)


@login_required
def variable_fav_edit(request, variable_fav_id=0):
    return initialize_variable_selection_page(request, variable_list_id=variable_fav_id)


@login_required
def get_user_vars(request):

    try:
        # User programs
        ownedPrograms = request.user.program_set.filter(active=True)
        sharedPrograms = Program.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
        programs = ownedPrograms | sharedPrograms
        # user_programs is not being used. Can a shared program actually show up twice?
        #user_programs = programs.distinct()


        # This detailed construction of user data variables WAS happening in the template. Now it is here:

        user_vars = {}
        if programs:
            for program in programs:
                for project in program.project_set.all():
                    if project.active:
                        per_proj = {
                            'progName' : program.name,
                            'projName' : project.name,
                            'progID' : program.id,
                            'projID' : project.id
                        }
                        user_vars[project.id] = per_proj
                        per_proj_vars = []
                        per_proj['vars'] = per_proj_vars

                        for variable in project.user_feature_definitions_set.all():
                            if variable.shared_map_id:
                                value = variable.shared_map_id
                            else:
                                value = 'v2:USER:{0}:{1}'.format(str(project.id), str(variable.id))
                            per_proj_var = {
                                'var_type' : 'N' if variable.is_numeric else 'C',
                                'value' : value,
                                'data_code' : value,
                                'data_text_label' : '{0}: {1}'.format(project.name, get_readable_name(variable.feature_name)),
                                'data_feature_id' : variable.id,
                                'data_feature_name' : get_readable_name(variable.feature_name)
                            }
                            per_proj_vars.append(per_proj_var)
    except Exception as e:
        logger.error("[ERROR] While trying to load user variables for variable selection page:")
        logger.exception(e)
        messages(request,"There was an error while trying to load your user variables - please contact the administrator.")
        return redirect(reverse('variables'))

    return render(request, 'variables/variable_edit_user_data.html', {'user_vars': user_vars})


@login_required
def initialize_variable_selection_page(request,
                                       variable_list_id=0,
                                       workbook_id=0,
                                       worksheet_id=0,
                                       new_workbook=False):
    template = 'variables/variable_edit.html'
    context = {'variables' : [] }
    workbook_model = None
    worksheet_model = None
    existing_variable_list = None

    try:

        if workbook_id != 0:
            try:
                workbook_model       = Workbook.objects.get(id=workbook_id)
                context['workbook']  = workbook_model
                worksheet_model      = Worksheet.objects.get(id=worksheet_id)
                context['worksheet'] = worksheet_model
            except ObjectDoesNotExist:
                messages.error(request, 'The workbook you were referencing does not exist.')
                return redirect(reverse('variables'))

        if variable_list_id != 0:
            try:
                existing_variable_list = request.user.variablefavorite_set.get(id=variable_list_id)
                if existing_variable_list.version != 'v2':
                    messages.warning(request, 'Version 1 Variable lists cannot be edited due to changes in available variables.')
                    return redirect(reverse('variables'))
            except ObjectDoesNotExist:
                messages.error(request, 'The variable favorite you were looking for does not exist.')
                return redirect(reverse('variables'))

        data_attr = [
            'DNA_sequencing',
            'RNA_sequencing',
            'miRNA_sequencing',
            'Protein',
            'SNP_CN',
            'DNA_methylation'
        ]

        # This is a list of specific data classifications which require additional filtering in order to
        # Gather categorical or numercial variables for use in the plot
        # Filter Options
        datatype_labels = {'CLIN' : 'Clinical',
                           'GEXP' : 'Gene Expression',
                           'MIRN' : 'miRNA',
                           'METH' : 'Methylation',
                           'CNVR' : 'Copy Number',
                           'RPPA' : 'Protein',
                           'GNAB' : 'Mutation'}

        datatype_list = SearchableFieldHelper.get_fields_for_all_datatypes()
        for type in datatype_list:
            type['label'] = datatype_labels[type['datatype']]

            #remove gene in fields
            for index, field in enumerate(type['fields']):
                if field['label'] == "Gene":
                    del type['fields'][index]


        # Public programs
        isb_user = Django_User.objects.filter(username='isb').first()
        public_programs = Program.objects.filter(active=True, is_public=True, owner=isb_user)

        # User favorites
        favorite_list = VariableFavorite.get_list(user=request.user, version='v2')
        for fav in favorite_list:
            fav.variables = fav.get_variables()

        full_fave_count =  VariableFavorite.get_list(user=request.user).count()

        program_attrs = {}

        for prog in public_programs:
            program_attrs[prog.id] = fetch_program_attr(prog.id)
            attr_codes = ClinicalColumnFeatureSupport.get_features_ids_for_column_names(list(program_attrs[prog.id].keys()))
            if 'not_found_columns' in attr_codes:
                new_keys = [x for x in list(program_attrs[prog.id].keys()) if x not in attr_codes['not_found_columns']]
                attr_codes = ClinicalColumnFeatureSupport.get_features_ids_for_column_names(new_keys)
            for attr in program_attrs[prog.id]:
                if attr in attr_codes['clinical_feature_ids']:
                    program_attrs[prog.id][attr]['data_code'] = attr_codes['clinical_feature_ids'][attr]
                else:
                    program_attrs[prog.id][attr]['data_code'] = 'v2:CLIN:'+attr

        # users can select from their saved variable favorites
        variable_favorites = VariableFavorite.get_list(request.user)

        has_user_data = (request.user.program_set.filter(active=True).count() > 0)

        context = {
            'favorite_list'         : favorite_list,
            'full_favorite_list_count': full_fave_count,
            'datatype_list'         : datatype_list,
            'data_attr'             : data_attr,
            'public_programs'       : public_programs,
            'base_url'                  : settings.BASE_URL,
            'base_api_url'              : settings.BASE_API_URL,
            'variable_favorites'        : variable_favorites,
            'workbook'                  : workbook_model,
            'worksheet'                 : worksheet_model,
            'existing_variable_list'    : existing_variable_list,
            'new_workbook'              : new_workbook,
            'program_attrs'         : program_attrs,
            'has_user_data'         : has_user_data
        }
    except Exception as e:
        logger.error("[ERROR] While attempting to initialize variable selection:")
        logger.exception(e)
        return JsonResponse({'msg': "There was an error while attempting to load the variable selection page - please contact the administrator."}, status=500)

    return render(request, template, context)


@login_required
def variable_fav_delete(request, variable_fav_id):
    redirect_url = reverse('variables')
    if variable_fav_id:
        try:
            variable_fav_model = VariableFavorite.objects.get(id=variable_fav_id)
            if variable_fav_model.user == request.user:
                name = variable_fav_model.name
                variable_fav_model.destroy()
                messages.info(request, 'The variable favorite \"'+name+'\" has been deleted.')
            else:
                messages.error(request, 'You do not have permission to update this variable favorite list.')
        except ObjectDoesNotExist:
            messages.error(request, 'The variable list you want does not exist.')

    return redirect(redirect_url)


@login_required
def variable_fav_copy(request, variable_fav_id):
    redirect_url = reverse('variables')
    if variable_fav_id:
        try:
            variable_fav_model = VariableFavorite.objects.get(id=variable_fav_id)
            if variable_fav_model.user == request.user:
                new_model = variable_fav_model.copy()
                messages.info(request, 'The variable favorite \"'+new_model.name+'\" has been copied from \"'+variable_fav_model.name+'\".')
            else:
                messages.error(request, 'You do not have permission to copy this variable favorite list.')
        except ObjectDoesNotExist:
            messages.error(request, 'The variable list you requested does not exist.')

    return redirect(redirect_url)


@login_required
def variable_fav_save(request, variable_fav_id=0):
    try:
        data   = json.loads(request.body)
        result = {}

        name = data['name']
        blacklist = re.compile(BLACKLIST_RE, re.UNICODE)
        match = blacklist.search(str(name))
        if match:
            # XSS risk, log and fail this cohort save
            match = blacklist.findall(str(name))
            logger.error(
                '[ERROR] While saving a variable list, saw a malformed name: ' + name + ', characters: ' + match.__str__())
            messages.error(request, "Your variable list's name contains invalid characters; please choose another name.")
            result['error'] = "Your variable list's name contains invalid characters; please choose another name."
            return HttpResponse(json.dumps(result), status=200)

        if variable_fav_id:
            try:
                variable_model = VariableFavorite.objects.get(id=variable_fav_id)
                if variable_model.user == request.user:
                    variable_model.update(name = data['name'], variables = data['variables'])
                    result['model'] = { 'id' : variable_model.id, 'name' : variable_model.name }
                else:
                    result['error'] = 'You do not have permission to update this variable favorite list'
                    messages.error(request, 'You do not have permission to update this variable favorite list')
            except ObjectDoesNotExist:
                messages.error(request, 'The variable list you want does not exist.')
                result['error'] = 'You do not have permission to update this variable favorite list'
        else:
            variable_model = VariableFavorite.create(name        = data['name'],
                                                     variables   = data['variables'],
                                                     user        = request.user)
            result['model'] = { 'id' : variable_model['id'], 'name' : variable_model['name'] }

        return HttpResponse(json.dumps(result), status=200)
    except Exception as e:
        logger.error('[ERROR] Exception while saving variable favorite:')
        logger.exception(e)
        result['error'] = "There was an error saving your variable favorite; it may not have been saved correctly."
        return HttpResponse(json.dumps(result), status=500)