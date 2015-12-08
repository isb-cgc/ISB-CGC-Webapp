import json
import collections
import sys
# import pexpect

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings

from google.appengine.api import urlfetch

debug = settings.DEBUG # RO global for this file
urlfetch.set_default_fetch_deadline(60)

def convert(data):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data

BIG_QUERY_API_URL = settings.BASE_API_URL + '/_ah/api/bq_api/v1'
COHORT_API = settings.BASE_API_URL + '/_ah/api/cohort_api/v1'
META_DISCOVERY_URL = settings.BASE_API_URL + '/_ah/api/discovery/v1/apis/meta_api/v1/rest'
METADATA_API = settings.BASE_API_URL + '/_ah/api/meta_api/v1'

def data_availability_sort(key, value, data_attr, attr_details):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
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
def variable_fav_list(request):
    template = 'variables/variable_list.html'
    context = {}
    return render(request, template, context)

@login_required
def variable_fav_detail(request, variable_fav_id):
    # """ if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name """
    template = 'variables/variable_detail.html'
    context = {
        'variables': {
            'name': 'My Favorite Variables',
            'list': [{
                'parent': 'Gender',
                'identifier': 'Female'
            },{
                'parent': ''
            }]
        }
    }
    return render(request, template, context)

@login_required
def variable_fav_create(request):
    template = 'variables/variable_edit.html'

    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    users = User.objects.filter(is_superuser=0)

    # service = build('meta', 'v1', discoveryServiceUrl=META_DISCOVERY_URL)
    clin_attr = [
        'vital_status',
        # 'survival_time',
        'gender',
        'age_at_initial_pathologic_diagnosis',
        'SampleTypeCode',
        'tumor_tissue_site',
        'histological_type',
        'prior_dx',
        'pathologic_stage',
        'person_neoplasm_cancer_status',
        'new_tumor_event_after_initial_treatment',
        'neoplasm_histologic_grade',
        # 'bmi',
        'residual_tumor',
        # 'targeted_molecular_therapy', TODO: Add to metadata_samples
        'tobacco_smoking_history',
        'icd_10',
        'icd_o_3_site',
        'icd_o_3_histology'
    ]

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

    molec_attr = [
        'somatic_mutation_status',
        'mRNA_expression',
        'miRNA_expression',
        'DNA_methylation',
        'gene_copy_number',
        'protein_quantification'
    ]

    data_url = METADATA_API + '/metadata_counts?'

    results = urlfetch.fetch(data_url, deadline=60)
    results = json.loads(results.content)
    totals = results['total']

    # Get and sort counts
    attr_details = convert(results['count'])
    attr_details['RNA_sequencing'] = []
    attr_details['miRNA_sequencing'] = []
    attr_details['DNA_methylation'] = []
    for key, value in attr_details.items():
        if key.startswith('has_'):
            data_availability_sort(key, value, data_attr, attr_details)
        else:
            attr_details[key] = sorted(value, key=lambda k: int(k['count']), reverse=True)

    template_values = {
        'request': request,
        'users': users,
        'attr_list': attr_details.keys(),
        'attr_list_count': attr_details,
        'total_samples': int(totals),
        'clin_attr': clin_attr,
        'data_attr': data_attr,
        'molec_attr': molec_attr,
        'base_url': settings.BASE_URL,
        'base_api_url': settings.BASE_API_URL
    }

    print template_values

    return render(request, template, template_values)

@login_required
def variable_fav_edit(request, variable_fav_id):
    template = 'variables/variable_edit.html'
    context = {}
    return render(request, template, context)