import json
import collections
import sys
# import pexpect

from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from bq_data_access.feature_search.util import SearchableFieldHelper
from models import VariableFavorite
from workbooks.models import Workbook, Worksheet, Worksheet_variable
from projects.models import Project, Study
from django.core.exceptions import ObjectDoesNotExist
from django.contrib import messages
from google.appengine.api import urlfetch
from django.conf import settings
debug = settings.DEBUG
from django.http import HttpResponse
from django.db import connection

from django.core import serializers

urlfetch.set_default_fetch_deadline(60)
BIG_QUERY_API_URL   = settings.BASE_API_URL + '/_ah/api/bq_api/v1'
COHORT_API          = settings.BASE_API_URL + '/_ah/api/cohort_api/v1'
META_DISCOVERY_URL  = settings.BASE_API_URL + '/_ah/api/discovery/v1/apis/meta_api/v1/rest'
METADATA_API        = settings.BASE_API_URL + '/_ah/api/meta_api/v2'


@login_required
def variable_fav_list_for_new_workbook(request):
    return variable_fav_list(request=request, new_workbook=True)

@login_required
def variable_fav_list(request, workbook_id=0, worksheet_id=0, new_workbook=0):
    template = 'variables/variable_list.html'
    context  = {}

    variable_list = VariableFavorite.get_list(request.user)
    if len(variable_list) == 0 :
        variable_list = None
    context['variable_list']=variable_list

    if workbook_id != 0 :
        try:
            workbook_model       = Workbook.objects.get(id=workbook_id)
            context['workbook']  = workbook_model
            worksheet_model      = Worksheet.objects.get(id=worksheet_id)
            context['worksheet'] = worksheet_model
            context['base_url']  = settings.BASE_URL

            if variable_list :
                template = 'variables/variables_select.html'
            else :
                return initialize_variable_selection_page(request, workbook_id=workbook_id, worksheet_id=worksheet_id)

        except ObjectDoesNotExist:
            messages.error(request, 'The workbook and worksheet you were referencing does not exist.')
            return redirect('variables')
    elif new_workbook :
        context['new_workbook'] = True
        if variable_list :
            template = 'variables/variables_select.html'
        else :
            return initialize_variable_selection_page(request, new_workbook=True)

    return render(request, template, context)


# tests whether parameter is a string, hash or iterable object
# then returns base type data
def convert(data):
    #if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data

# sorts on availability of a key in the feature def table?
def data_availability_sort(key, value, data_attr, attr_details):
    #if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name

    if key == 'has_Illumina_DNASeq':
        attr_details['DNA_sequencing'] = sorted(value, key=lambda k: int(k['count']), reverse=True)
    if key == 'has_SNP6':
        attr_details['SNP_CN'] = sorted(value, key=lambda k: int(k['count']), reverse=True)
    if key == 'has_RPPA':
        attr_details['Protein'] = sorted(value, key=lambda k: int(k['count']), reverse=True)
    if key == 'has_27k':
        attr_details['DNA_methylation'].append({
            'value': '27k',
            'count': [v['count'] for v in value if v['value'] == 'True'][0]
        })
    if key == 'has_450k':
        attr_details['DNA_methylation'].append({
            'value': '450k',
            'count': [v['count'] for v in value if v['value'] == 'True'][0]
        })
    if key == 'has_HiSeq_miRnaSeq':
        attr_details['miRNA_sequencing'].append({
            'value': 'Illumina HiSeq',
            'count': [v['count'] for v in value if v['value'] == 'True'][0]
        })
    if key == 'has_GA_miRNASeq':
        attr_details['miRNA_sequencing'].append({
            'value': 'Illumina GA',
            'count': [v['count'] for v in value if v['value'] == 'True'][0]
        })
    if key == 'has_UNC_HiSeq_RNASeq':
        attr_details['RNA_sequencing'].append({
            'value': 'UNC Illumina HiSeq',
            'count': [v['count'] for v in value if v['value'] == 'True'][0]
        })
    if key == 'has_UNC_GA_RNASeq':
        attr_details['RNA_sequencing'].append({
            'value': 'UNC Illumina GA',
            'count': [v['count'] for v in value if v['value'] == 'True'][0]
        })
    if key == 'has_BCGSC_HiSeq_RNASeq':
        attr_details['RNA_sequencing'].append({
            'value': 'BCGSC Illumina HiSeq',
            'count': [v['count'] for v in value if v['value'] == 'True'][0]
        })
    if key == 'has_BCGSC_GA_RNASeq':
        attr_details['RNA_sequencing'].append({
            'value': 'BCGSC Illumina GA',
            'count': [v['count'] for v in value if v['value'] == 'True'][0]
        })


@login_required
def variable_fav_detail_for_new_workbook(request, variable_fav_id):
    return variable_fav_detail(request=request, variable_fav_id=variable_fav_id, new_workbook=True)

@login_required
def variable_fav_detail(request, variable_fav_id, workbook_id=0, worksheet_id=0, new_workbook=0):
    template = 'variables/variable_detail.html'
    context  = {}
    if new_workbook :
        context['new_workbook'] = True

    if workbook_id :
        try:
            workbook_model       = Workbook.objects.get(id=workbook_id)
            context['workbook']  = workbook_model
            worksheet_model      = Worksheet.objects.get(id=worksheet_id)
            context['worksheet'] = worksheet_model
        except ObjectDoesNotExist:
            messages.error(request, 'The workbook you were referencing does not exist.')
            return redirect('variables')
    try:
        variable_fav = VariableFavorite.get_deep(variable_fav_id)
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

    if workbook_id != 0 :
        try:
            workbook_model       = Workbook.objects.get(id=workbook_id)
            context['workbook']  = workbook_model
            worksheet_model      = Worksheet.objects.get(id=worksheet_id)
            context['worksheet'] = worksheet_model
        except ObjectDoesNotExist:
            messages.error(request, 'The workbook you were referencing does not exist.')
            return redirect('variables')

    if variable_list_id != 0:
        try:
            existing_variable_list = request.user.variablefavorite_set.get(id=variable_list_id)
        except ObjectDoesNotExist:
            messages.error(request, 'The variable favorite you were looking for does not exist.')
            return redirect('variables')

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
        if debug: print >> sys.stderr, ' attrs ' + json.dumps(type['fields'])
        for index, field in enumerate(type['fields']):
            if field['label'] == "Gene":
                del type['fields'][index]

    #get user projects and variables
    ownedProjects = request.user.project_set.all().filter(active=True)
    sharedProjects = Project.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
    projects = ownedProjects | sharedProjects
    projects = projects.distinct()

    #get user favorites
    favorite_list = VariableFavorite.get_list(user=request.user)
    for fav in favorite_list :
        fav.variables = fav.get_variables()

    #TODO common variables need to be refactored into an adaptive list based on common used
    displayed_common_variables = [
        {'name' : "vital_status",                          'code' : 'CLIN:vital_status',                                'type' : 'C'},
        {'name' : "gender",                                'code' : 'CLIN:gender',                                      'type' : 'C'},
        {'name' : "age_at_initial_pathologic_diagnosis",   'code' : 'CLIN:age_at_initial_pathologic_diagnosis',         'type' : 'N'},
        {'name' : "tumor_tissue_site",                     'code' : 'CLIN:tumor_tissue_site',                           'type' : 'C'},
        {'name' : "histological_type",                     'code' : 'CLIN:histological_type',                           'type' : 'C'},
        {'name' : "prior_diagnosis",                       'code' : 'CLIN:prior_dx',                                    'type' : 'C'},
        {'name' : "tumor_status",                          'code' : 'CLIN:person_neoplasm_cancer_status',               'type' : 'C'},
        {'name' : "new_tumor_event_after_initial_treatment", 'code' : 'CLIN:new_tumor_event_after_initial_treatment',   'type' : 'C'},
        {'name' : "histological_grade",                    'code' : 'CLIN:neoplasm_histologic_grade',                   'type' : 'C'},
        {'name' : "residual_tumor",                        'code' : 'CLIN:residual_tumor',                              'type' : 'C'},
        {'name' : "tobacco_smoking_history",               'code' : 'CLIN:tobacco_smoking_history',                     'type' : 'C'},
        {'name' : "icd-10",                                'code' : 'CLIN:icd_10',                                      'type' : 'C'},
        {'name' : "icd-o-3_site",                          'code' : 'CLIN:icd_o_3_site',                                'type' : 'C'},
        {'name' : "icd-o-3_histology",                     'code' : 'CLIN:icd_o_3_histology',                           'type' : 'C'}
    ]
    common_variables = displayed_common_variables
    TCGA_project    = {"id" : -1, "study" : {"id" :-1, "name" : ""}, "name" : "TCGA"}
    common_project  = {"id" : -1, "study" : {"id" :-1, "name" : ""}, "name" : "Common", "variables" : common_variables}

    data_url = METADATA_API + '/metadata_counts?'
    results = urlfetch.fetch(data_url, deadline=60)
    results = json.loads(results.content)
    totals  = results['total']

    #Get and sort counts
    variable_list = convert(results['count'])
    keys = []
    for variable in variable_list:
        keys.append(variable['name'])

    # users can select from their saved variable favorites
    variable_favorites = VariableFavorite.get_list(request.user)

    context = {
        'variable_names'        : keys,
        'variable_list_count'   : variable_list,
        'favorite_list'         : favorite_list,
        'datatype_list'         : datatype_list,
        'projects'              : projects,
        'data_attr'             : data_attr,
        'total_samples'         : totals,

        'base_url'                  : settings.BASE_URL,
        'base_api_url'              : settings.BASE_API_URL,
        'TCGA_project'              : TCGA_project,
        'common_project'            : common_project,
        'variable_favorites'        : variable_favorites,
        'workbook'                  : workbook_model,
        'worksheet'                 : worksheet_model,
        'existing_variable_list'    : existing_variable_list,
        'new_workbook'              : new_workbook
    }

    return render(request, template, context)

@login_required
def variable_fav_delete(request, variable_fav_id):
    redirect_url = reverse('variables')
    if variable_fav_id :
        try:
            variable_fav_model = VariableFavorite.objects.get(id=variable_fav_id)
            if variable_fav_model.user == request.user :
                name = variable_fav_model.name
                variable_fav_model.destroy()
                messages.info(request, 'the variable favorite \"'+name+'\" has been deleted')
            else :
                messages.error(request, 'You do not have permission to update this variable favorite list')
        except ObjectDoesNotExist:
            messages.error(request, 'The variable list you want does not exist.')

    return redirect(redirect_url)

@login_required
def variable_fav_copy(request, variable_fav_id):
    redirect_url = reverse('variables')
    if variable_fav_id :
        try:
            variable_fav_model = VariableFavorite.objects.get(id=variable_fav_id)
            if variable_fav_model.user == request.user :
                new_model = variable_fav_model.copy()
                messages.info(request, 'the variable favorite \"'+new_model.name+'\" has been created')
            else :
                messages.error(request, 'You do not have permission to update this variable favorite list')
        except ObjectDoesNotExist:
            messages.error(request, 'The variable list you want does not exist.')

    return redirect(redirect_url)

@login_required
def variable_fav_save(request, variable_fav_id=0):
    data   = json.loads(request.body)
    result = {}
    if variable_fav_id :
        try:
            variable_model = VariableFavorite.objects.get(id=variable_fav_id)
            if variable_model.user == request.user :
                variable_model.update(name = data['name'], variables = data['variables'])
                result['model'] = { 'id' : variable_model.id, 'name' : variable_model.name }
            else :
                result['error'] = 'You do not have permission to update this gene favorite list'
                messages.error(request, 'You do not have permission to update this gene favorite list')
        except ObjectDoesNotExist:
            messages.error(request, 'The gene list you want does not exist.')
            result['error'] = 'You do not have permission to update this gene favorite list'
    else :
        variable_model = VariableFavorite.create(name        = data['name'],
                                                 variables   = data['variables'],
                                                 user        = request.user)
        result['model'] = { 'id' : variable_model['id'], 'name' : variable_model['name'] }

    return HttpResponse(json.dumps(result), status=200)