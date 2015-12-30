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
from workbooks.models import Workbook, Worksheet
from projects.models import Project, Study

from google.appengine.api import urlfetch
from django.conf import settings
debug = settings.DEBUG
from django.http import HttpResponse

from django.core import serializers

urlfetch.set_default_fetch_deadline(60)
BIG_QUERY_API_URL   = settings.BASE_API_URL + '/_ah/api/bq_api/v1'
COHORT_API          = settings.BASE_API_URL + '/_ah/api/cohort_api/v1'
META_DISCOVERY_URL  = settings.BASE_API_URL + '/_ah/api/discovery/v1/apis/meta_api/v1/rest'
METADATA_API        = settings.BASE_API_URL + '/_ah/api/meta_api/v1'

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
def variable_fav_detail(request, variable_fav_id):
    template = 'variables/variable_detail.html'

    variable_fav = VariableFavorite.get_deep(variable_fav_id)

    context = {
        'variables': variable_fav,
    }

    print variable_fav

    variable_fav.mark_viewed(request)
    return render(request, template, context)

#called via workbooks for the selected variables to be added to a workbook
@login_required
# USECASE 1: ADD VAR LIST TO EXISTING WORKBOOK
def variable_select_for_existing_workbook(request, workbook_id, worksheet_id):
    #TODO validate user has access to the workbook
    return initialize_variable_selection_page(request, workbook_id=workbook_id, worksheet_id=worksheet_id)

@login_required
# USECASE 2: CREATE VAR LIST THEN CREATE WORKBOOK WITH VAR LIST
def variable_select_for_new_workbook(request):
    return initialize_variable_selection_page(request, new_workbook=True)

@login_required
# USECASE 3: EDIT EXISTING VAR LIST
def variable_fav_edit(request, variable_fav_id):
    #TODO validate user has access to the list
    return initialize_variable_selection_page(request, variable_list_id=variable_fav_id)

@login_required
# USECASE 4: CREATE VAR FAVORITE
def variable_fav_create(request):
    return initialize_variable_selection_page(request)

@login_required
def initialize_variable_selection_page(request,
                                       workbook_id=None,
                                       worksheet_id=None,
                                       new_workbook=False,
                                       variable_list_id=None):
    template = 'variables/variable_edit.html'

    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    users = User.objects.filter(is_superuser=0)

    # service = build('meta', 'v1', discoveryServiceUrl=META_DISCOVERY_URL)
    # clin_attr = [
    #     'vital_status',
    #     # 'survival_time',
    #     'gender',
    #     'age_at_initial_pathologic_diagnosis',
    #     'SampleTypeCode',
    #     'tumor_tissue_site',
    #     'histological_type',
    #     'prior_dx',
    #     'pathologic_stage',
    #     'person_neoplasm_cancer_status',
    #     'new_tumor_event_after_initial_treatment',
    #     'neoplasm_histologic_grade',
    #     # 'bmi',
    #     'residual_tumor',
    #     # 'targeted_molecular_therapy', TODO: Add to metadata_samples
    #     'tobacco_smoking_history',
    #     'icd_10',
    #     'icd_o_3_site',
    #     'icd_o_3_histology'
    # ]

    # data_attr = [
    #     'has_Illumina_DNASeq',
    #     'has_BCGSC_HiSeq_RNASeq',
    #     'has_UNC_HiSeq_RNASeq',
    #     'has_BCGSC_GA_RNASeq',
    #     'has_UNC_GA_RNASeq',
    #     'has_HiSeq_miRnaSeq',
    #     'has_GA_miRNASeq',
    #     'has_RPPA',
    #     'has_SNP6',
    #     'has_27k',
    #     'has_450k'
    # ]

    data_attr = [
        'DNA_sequencing',
        'RNA_sequencing',
        'miRNA_sequencing',
        'Protein',
        'SNP_CN',
        'DNA_methylation'
    ]
    #
    # molec_attr = [
    #     'somatic_mutation_status',
    #     'mRNA_expression',
    #     'miRNA_expression',
    #     'DNA_methylation',
    #     'gene_copy_number',
    #     'protein_quantification'
    # ]

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
    for project in projects:
        project.studies = project.study_set.all().filter(active=True)
        for study in project.studies:
            study.variables = study.user_feature_definitions_set.all()
            #TODO need to list feature_name and not name

    #get user favorites
    favorite_list = VariableFavorite.get_list(user=request.user)
    for fav in favorite_list :
        fav.variables = fav.get_variables()

    #stubbed data for populating the variable list model
    TCGA_project    = {"id" : -1, "study" : {"id" :-1, "name" : ""}, "name" : "TCGA"}
    common_project  = {"id" : -1, "study" : {"id" :-1, "name" : ""}, "name" : "Common", "variables" : [
        "Vital Status",
        "Gender",
        "Age at Diagnosis",
        "Sample Type Code",
        "Tumor Tissue Site",
        "Histological Type",
        "Prior Diagnosis",
        "Tumor Status",
        "New Tumor Event After Initial Treatment",
        "Histological Grade",
        "Residual Tumor",
        "Tobacco Smoking History",
        "ICD-10",
        "ICD-O-3 Site",
        "ICD-O-3 Histology"]}

    data_url = METADATA_API + '/metadata_counts?'
    results = urlfetch.fetch(data_url, deadline=60)
    results = json.loads(results.content)
    totals  = results['total']

    #Get and sort counts
    variable_list = convert(results['count'])
    variable_list['RNA_sequencing'] = []
    variable_list['miRNA_sequencing'] = []
    variable_list['DNA_methylation'] = []
    # for key, value in variable_list.items():
    #     if key.startswith('has_'):
    #         data_availability_sort(key, value, data_attr, variable_list)
    #     else:
    #         variable_list[key] = sorted(value, key=lambda k: int(k['count']), reverse=True)

    # users can select from their saved variable favorites
    variable_favorites = VariableFavorite.get_list(request.user)
    context = {
        'variable_names'        : variable_list.keys(),
        'variable_list_count'   : variable_list,
        'favorite_list'         : favorite_list,
        'datatype_list'         : datatype_list,
        'projects'              : projects,

        # 'clinical_variables'    : clin_attr,
        'data_attr'             : data_attr,
        'total_samples'         : totals,

        'base_url'              : settings.BASE_URL,
        'base_api_url'          : settings.BASE_API_URL,
        'TCGA_project'          : TCGA_project,
        'common_project'        : common_project,
        'variable_favorites'    : variable_favorites
    }

    # USECASE 1: ADD VAR LIST TO EXISTING WORKBOOK
    if workbook_id is not None and worksheet_id is not None :
        workbook = Workbook.objects.get(id=workbook_id)
        worksheet = Worksheet.objects.get(id=worksheet_id)
        context['workbook'] = workbook
        context['worksheet'] = worksheet

    # USECASE 2: CREATE VAR LIST THEN CREATE WORKBOOK WITH VAR LIST
    elif new_workbook :
        context['newWorkbook'] = True

    # USECASE 3: EDIT EXISTING VAR LIST
    elif variable_list_id is not None :
        existing_variable_list = VariableFavorite.get_deep(variable_list_id)
        context['existing_variable_list'] = existing_variable_list

    # USECASE 4: CREATE VAR FAVORITE #
        # nothin

    return render(request, template, context)

@login_required
def variable_fav_list(request):
    template = 'variables/variable_list.html'
    variable_list = VariableFavorite.get_list(request.user)

    return render(request, template, {'variable_list' : variable_list})

@login_required
#TODO
def variable_fav_delete(request, variable_fav_id):
    return HttpResponse(json.dumps({}), status=200)

@login_required
#TODO
def variable_fav_copy(request, variable_fav_id):
    return HttpResponse(json.dumps({}), status=200)

@login_required
def variable_fav_save(request):
    data = json.loads(request.body)
    variable_model = VariableFavorite.create(name       =data['name'],
                                            variables   =data['variables'],
                                            user        =request.user)
    return HttpResponse(json.dumps(variable_model), status=200)