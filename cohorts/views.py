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

import json
import collections
import csv
import sys

from django.utils import formats
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_protect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings
from django.db.models import Count

from django.http import StreamingHttpResponse
from google.appengine.api import urlfetch
from allauth.socialaccount.models import SocialToken

from models import Cohort, Patients, Samples, Cohort_Perms, Source, Filters, Cohort_Comments
from visualizations.models import Plot_Cohorts, Plot
from bq_data_access.cohort_bigquery import BigQueryCohortSupport

debug = settings.DEBUG # RO global for this file
urlfetch.set_default_fetch_deadline(60)

def convert(data):
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
def cohorts_list(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    # check to see if user has read access to 'All TCGA Data' cohort
    isb_superuser = User.objects.get(username='isb')
    superuser_perm = Cohort_Perms.objects.get(user=isb_superuser)
    user_all_data_perm = Cohort_Perms.objects.filter(user=request.user, cohort=superuser_perm.cohort)
    if not user_all_data_perm:
        Cohort_Perms.objects.create(user=request.user, cohort=superuser_perm.cohort, perm=Cohort_Perms.READER)

    # add_data_cohort = Cohort.objects.filter(name='All TCGA Data')

    users = User.objects.filter(is_superuser=0)
    cohort_perms = Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-last_date_saved').annotate(num_patients=Count('samples'))

    for item in cohorts:
        item.perm = item.get_perm(request).get_perm_display()
        item.owner = item.get_owner()
        # print local_zone.localize(item.last_date_saved)

    # Used for autocomplete listing
    cohort_listing = Cohort.objects.filter(id__in=cohort_perms, active=True).values('id', 'name')
    for cohort in cohort_listing:
        cohort['value'] = int(cohort['id'])
        cohort['label'] = cohort['name'].encode('utf8')
        del cohort['id']
        del cohort['name']

    return render(request, 'cohorts/cohort_list.html', {'request': request,
                                                            'cohorts': cohorts,
                                                            'user_list': users,
                                                            'cohorts_listing': cohort_listing,
                                                            'base_url': settings.BASE_URL,
                                                            'base_api_url': settings.BASE_API_URL
                                                            })

@login_required
def cohort_detail(request, cohort_id=0):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    users = User.objects.filter(is_superuser=0)
    cohort = None
    shared_with_users = []

    # service = build('meta', 'v1', discoveryServiceUrl=META_DISCOVERY_URL)
    clin_attr = [
        'Project',
        'Study',
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
    template = 'cohorts/new_cohort.html'

    if cohort_id != 0:
        try:
            cohort = Cohort.objects.get(id=cohort_id, active=True)
            cohort.perm = cohort.get_perm(request)

            if not cohort.perm:
                messages.error(request, 'You do not have permission to view that cohort.')
                return redirect('user_landing')

            cohort.mark_viewed(request)

            shared_with_ids = Cohort_Perms.objects.filter(cohort=cohort, perm=Cohort_Perms.READER).values_list('user', flat=True)
            shared_with_users = User.objects.filter(id__in=shared_with_ids)
            template = 'cohorts/cohort_details.html'
            template_values['cohort'] = cohort
            template_values['total_samples'] = len(cohort.samples_set.all())
            template_values['total_patients'] = len(cohort.patients_set.all())
            template_values['shared_with_users'] = shared_with_users
        except ObjectDoesNotExist:
            # Cohort doesn't exist, return to user landing with error.
            messages.error(request, 'The cohort you were looking for does not exist.')
            return redirect('user_landing')

    return render(request, template, template_values)

'''
This save view only works coming from cohort editing or creation views.
- only ever one source coming in
- filters optional
'''
# TODO: Create new view to save cohorts from visualizations
@login_required
@csrf_protect
def save_cohort(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    redirect_url = reverse('user_landing')

    samples = []
    patients = []
    name = ''
    user_id = request.user.id
    parent = None

    if request.POST:
        name = request.POST.get('name')
        source = request.POST.get('source')
        deactivate_sources = request.POST.get('deactivate_sources')
        filters = request.POST.getlist('filters')
        data_url = METADATA_API + '/metadata_list?selectors=ParticipantBarcode&selectors=SampleBarcode'

        # Given cohort_id is the only source id.
        if source:
            # Only ever one source
            data_url += '&cohort_id=' + source
            parent = Cohort.objects.get(id=source)
            if deactivate_sources:
                parent.active = False
                parent.save()

        if filters:
            filter_obj = {}
            for filter in filters:
                tmp = filter.split('-')
                key = tmp[0]
                val = tmp[1]
                if key in filter_obj.keys():
                    filter_obj[key] += ',' + val
                else:
                    filter_obj[key] = val

            for key, value in filter_obj.items():
                data_url += '&' + key + '=' + value

        result = urlfetch.fetch(data_url, deadline=60)
        items = json.loads(result.content)
        items = items['items']
        for item in items:
            samples.append(item['SampleBarcode'])
            patients.append(item['ParticipantBarcode'])

        # Create new cohort
        cohort = Cohort.objects.create(name=name)
        cohort.save()

        # If there are sample ids
        sample_list = []
        if len(samples):
            samples = list(set(samples))
            for sample_code in samples:
                sample_list.append(Samples(cohort=cohort, sample_id=sample_code))
        Samples.objects.bulk_create(sample_list)

        # If there are patient ids
        patient_list = []
        if len(patients):
            patients = list(set(patients))
            for patient_code in patients:
                patient_list.append(Patients(cohort=cohort, patient_id=patient_code))
        Patients.objects.bulk_create(patient_list)

        # Set permission for user to be owner
        perm = Cohort_Perms(cohort=cohort, user=request.user, perm=Cohort_Perms.OWNER)
        perm.save()

        # Create the source if it was given
        if source:
            Source.objects.create(parent=parent, cohort=cohort, type=Source.FILTERS).save()

        # Create filters applied
        if filters:
            for filter in filters:
                tmp = filter.split('-')
                key = tmp[0]
                val = tmp[1]
                Filters.objects.create(resulting_cohort=cohort, name=key, value=val).save()

        # Store cohort to BigQuery
        project_id = settings.BQ_PROJECT_ID
        cohort_settings = settings.GET_BQ_COHORT_SETTINGS()
        bcs = BigQueryCohortSupport(project_id, cohort_settings.dataset_id, cohort_settings.table_id)
        bcs.add_cohort_with_sample_barcodes(cohort.id, samples)

        # Check if coming from applying filters and redirect accordingly
        if 'apply-filters' in request.POST:
            redirect_url = reverse('cohort_details',args=[cohort.id])
            messages.info(request, 'Filters applied successfully.')
        else:
            redirect_url = reverse('user_landing')
            messages.info(request, 'Cohort, %s, created successfully.' % cohort.name)

    return redirect(redirect_url) # redirect to search/ with search parameters just saved

@login_required
@csrf_protect
def delete_cohort(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    redirect_url = 'user_landing'
    cohort_ids = request.POST.getlist('id')
    Cohort.objects.filter(id__in=cohort_ids).update(active=False)
    return redirect(reverse(redirect_url))

@login_required
@csrf_protect
def share_cohort(request, cohort_id=0):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    user_ids = request.POST.getlist('users')
    users = User.objects.filter(id__in=user_ids)

    if cohort_id == 0:
        redirect_url = '/user_landing/'
        cohort_ids = request.POST.getlist('cohort-ids')
        cohorts = Cohort.objects.filter(id__in=cohort_ids)
    else:
        redirect_url = '/cohorts/%s' % cohort_id
        cohorts = Cohort.objects.filter(id=cohort_id)
    for user in users:

        for cohort in cohorts:
            obj = Cohort_Perms.objects.create(user=user, cohort=cohort, perm=Cohort_Perms.READER)
            obj.save()

    return redirect(redirect_url)

@login_required
@csrf_protect
def clone_cohort(request, cohort_id):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    redirect_url = 'cohort_details'
    parent_cohort = Cohort.objects.get(id=cohort_id)
    new_name = 'Copy of %s' % parent_cohort.name
    cohort = Cohort.objects.create(name=new_name)
    cohort.save()

    # If there are sample ids
    samples = Samples.objects.filter(cohort=parent_cohort).values_list('sample_id', flat=True)
    sample_list = []
    for sample_code in samples:
        sample_list.append(Samples(cohort=cohort, sample_id=sample_code))
    Samples.objects.bulk_create(sample_list)

    # If there are patient ids
    patients = Patients.objects.filter(cohort=parent_cohort).values_list('patient_id', flat=True)
    patient_list = []
    for patient_code in patients:
        patient_list.append(Patients(cohort=cohort, patient_id=patient_code))
    Patients.objects.bulk_create(patient_list)

    # Set source
    source = Source(parent=parent_cohort, cohort=cohort, type=Source.CLONE)
    source.save()

    # Set permissions
    perm = Cohort_Perms(cohort=cohort, user=request.user, perm=Cohort_Perms.OWNER)
    perm.save()

    # Store cohort to BigQuery
    project_id = settings.BQ_PROJECT_ID
    cohort_settings = settings.GET_BQ_COHORT_SETTINGS()
    bcs = BigQueryCohortSupport(project_id, cohort_settings.dataset_id, cohort_settings.table_id)
    bcs.add_cohort_with_sample_barcodes(cohort.id, samples)

    return redirect(reverse(redirect_url,args=[cohort.id]))

@login_required
@csrf_protect
def set_operation(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    redirect_url = '/user_landing/'

    if request.POST:
        name = request.POST.get('name').encode('utf8')
        cohorts = []
        base_cohort = None
        subtract_cohorts = []
        notes = ''
        cohort_patients = []
        cohort_samples = []

        op = request.POST.get('operation')
        if op == 'union':
            notes = 'Union of '
            cohort_ids = request.POST.getlist('selected-ids')
            cohorts = Cohort.objects.filter(id__in=cohort_ids)
            first = True
            for cohort in cohorts:
                if first:
                    notes += cohort.name
                    first = False
                else:
                    notes += ', ' + cohort.name
            patients = Patients.objects.filter(cohort_id__in=cohort_ids).distinct().values_list('patient_id', flat=True)
            samples = Samples.objects.filter(cohort_id__in=cohort_ids).distinct().values_list('sample_id', flat=True)
        elif op == 'intersect':
            notes = 'Intersection of '
            cohort_ids = request.POST.getlist('selected-ids')
            cohorts = Cohort.objects.filter(id__in=cohort_ids)
            first = True
            for cohort in cohorts:
                if first:
                    notes += cohort.name
                    first = False
                else:
                    notes += ', ' + cohort.name
            cohort_patients = tuple(Patients.objects.filter(cohort=cohorts[0]).values_list('patient_id', flat=True))
            cohort_samples = tuple(Samples.objects.filter(cohort=cohorts[0]).values_list('sample_id', flat=True))
            for i in range(1, len(cohorts)):
                new_patient_list = tuple(Patients.objects.filter(cohort=cohorts[i]).values_list('patient_id', flat=True))
                new_sample_list = tuple(Samples.objects.filter(cohort=cohorts[i]).values_list('sample_id', flat=True))
                cohort_patients = set(cohort_patients).intersection(new_patient_list)
                cohort_samples = set(cohort_samples).intersection(new_sample_list)
            patients = list(cohort_patients)
            samples = list(cohort_samples)
        elif op == 'complement':
            base_id = request.POST.get('base-id')
            subtract_ids = request.POST.getlist('subtract-ids')

            base_patients = tuple(Patients.objects.filter(cohort_id=base_id).values_list('patient_id', flat=True))
            subtract_patients = tuple(Patients.objects.filter(cohort_id__in=subtract_ids).distinct().values_list('patient_id', flat=True))
            cohort_patients = set(base_patients).difference(subtract_patients)
            patients = list(cohort_patients)

            base_samples = tuple(Samples.objects.filter(cohort_id=base_id).values_list('sample_id', flat=True))
            subtract_samples = tuple(Samples.objects.filter(cohort_id__in=subtract_ids).distinct().values_list('sample_id', flat=True))
            cohort_samples = set(base_samples).difference(subtract_samples)
            samples = list(cohort_samples)

            notes = 'Subtracted '
            base_cohort = Cohort.objects.get(id=base_id)
            subtracted_cohorts = Cohort.objects.filter(id__in=subtract_ids)
            first = True
            for item in subtracted_cohorts:
                if first:
                    notes += item.name
                    first = False
                else:
                    notes += ', ' + item.name
            notes += ' from %s.' % base_cohort.name

        if len(samples) or len(patients):
            new_cohort = Cohort.objects.create(name=name)
            perm = Cohort_Perms(cohort=new_cohort, user=request.user, perm=Cohort_Perms.OWNER)
            perm.save()

            # Store cohort to BigQuery
            project_id = settings.BQ_PROJECT_ID
            cohort_settings = settings.GET_BQ_COHORT_SETTINGS()
            bcs = BigQueryCohortSupport(project_id, cohort_settings.dataset_id, cohort_settings.table_id)
            bcs.add_cohort_with_sample_barcodes(new_cohort.id, samples)

            # Store cohort to CloudSQL
            patient_list = []
            for patient in patients:
                patient_list.append(Patients(cohort=new_cohort, patient_id=patient))
            Patients.objects.bulk_create(patient_list)

            sample_list = []
            for sample in samples:
                sample_list.append(Samples(cohort=new_cohort, sample_id=sample))
            Samples.objects.bulk_create(sample_list)

            # Create Sources
            if op == 'union' or op == 'intersect':
                for cohort in cohorts:
                    source = Source.objects.create(parent=cohort, cohort=new_cohort, type=Source.SET_OPS, notes=notes)
                    source.save()
            elif op=='complement':
                source = Source.objects.create(parent=base_cohort, cohort=new_cohort, type=Source.SET_OPS, notes=notes)
                source.save()
                for cohort in subtract_cohorts:
                    source = Source.objects.create(parent=cohort, cohort=new_cohort, type=Source.SET_OPS, notes=notes)
                    source.save()

        else:
            message = 'Operation resulted in empty set of samples and patients. Cohort not created.'
            messages.warning(request, message)
            return redirect('user_landing')

    return redirect(redirect_url)


@login_required
@csrf_protect
def union_cohort(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    redirect_url = '/cohorts/'

    return redirect(redirect_url)

@login_required
@csrf_protect
def intersect_cohort(request): 
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    redirect_url = '/cohorts/'
    return redirect(redirect_url)

@login_required
@csrf_protect
def set_minus_cohort(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    redirect_url = '/cohorts/'

    return redirect(redirect_url)

@login_required
@csrf_protect
def save_comment(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    content = request.POST.get('content').encode('utf-8')
    cohort = Cohort.objects.get(id=int(request.POST.get('cohort_id')))
    obj = Cohort_Comments.objects.create(user=request.user, cohort=cohort, content=content)
    obj.save()
    return_obj = {
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'date_created': formats.date_format(obj.date_created, 'DATETIME_FORMAT'),
        'content': obj.content
    }
    return HttpResponse(json.dumps(return_obj), status=200)

@login_required
@csrf_protect
def save_cohort_from_plot(request):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    cohort_name = request.POST.get('cohort-name', 'Plot Selected Cohort')
    if cohort_name:
        # Create Cohort
        cohort = Cohort.objects.create(name=cohort_name)
        cohort.save()

        # Create Permission
        perm = Cohort_Perms.objects.create(cohort=cohort, user=request.user, perm=Cohort_Perms.OWNER)
        perm.save()

        # Create Sources
        plot_id = request.POST.get('plot_id')
        source_cohorts = Plot_Cohorts.objects.filter(plot=Plot.objects.get(id=plot_id))
        source_list = []
        for source in source_cohorts:
            source_list.append(Source(parent=source.cohort, cohort=cohort, type=Source.PLOT_SEL))
        Source.objects.bulk_create(source_list)

        # Create Samples
        samples = request.POST.get('samples', '')
        if len(samples):
            samples = samples.split(',')
        sample_list = []
        patient_id_list = []
        for sample in samples:
            patient_id = sample[:12]
            if patient_id not in patient_id_list:
                patient_id_list.append(patient_id)
            sample_list.append(Samples(cohort=cohort, sample_id=sample))
        Samples.objects.bulk_create(sample_list)

        # Create Patients
        patient_list = []
        for patient in patient_id_list:
            patient_list.append(Patients(cohort=cohort, patient_id=patient))
        Patients.objects.bulk_create(patient_list)

        # Store cohort to BigQuery
        project_id = settings.BQ_PROJECT_ID
        cohort_settings = settings.GET_BQ_COHORT_SETTINGS()
        bcs = BigQueryCohortSupport(project_id, cohort_settings.dataset_id, cohort_settings.table_id)
        bcs.add_cohort_with_sample_barcodes(cohort.id, samples)

        response_str = '<div class="row">' \
                        '<div class="col-lg-12">' \
                        '<div class="alert alert-info alert-dismissible">' \
                        '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' \
                        'Cohort, {name}, created successfully.' \
                        '</div></div></div>'.format(name=cohort.name)
        return HttpResponse(response_str, status=200)
    response_str = '<div class="row">' \
                    '<div class="col-lg-12">' \
                    '<div class="alert alert-danger alert-dismissible">' \
                    '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' \
                    'Cohort failed to save.' \
                    '</div></div></div>'
    return HttpResponse(response_str, status=500)

@login_required
@csrf_protect
def cohort_filelist(request, cohort_id=0):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    if cohort_id == 0:
        messages.error(request, 'Cohort provided does not exist.')
        return redirect('/user_landing')

    token = SocialToken.objects.filter(account__user=request.user, account__provider='Google')[0].token
    data_url = METADATA_API + ('/cohort_files?cohort_id=%s&token=%s' % (cohort_id, token))
    result = urlfetch.fetch(data_url, deadline=60)
    items = json.loads(result.content)
    file_list = []
    if 'file_list' in items:
        file_list = items['file_list']
    cohort = Cohort.objects.get(id=cohort_id, active=True)

    if int(items['total_file_count']) == 0:
        messages.info(request, 'There were no files found for this cohort.')

    return render(request, 'cohorts/cohort_filelist.html', {'request': request,
                                                            'cohort': cohort,
                                                            'base_url': settings.BASE_URL,
                                                            'base_api_url': settings.BASE_API_URL,
                                                            'file_count': items['total_file_count'],
                                                            'page': items['page'],
                                                            'download_url': reverse('download_filelist', kwargs={'cohort_id': cohort_id}),
                                                            'platform_counts': items['platform_count_list'],
                                                            'filelist': file_list})

@login_required
def cohort_filelist_ajax(request, cohort_id=0):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    if cohort_id == 0:
        response_str = '<div class="row">' \
                    '<div class="col-lg-12">' \
                    '<div class="alert alert-danger alert-dismissible">' \
                    '<button type="button" class="close" data-dismiss="alert"><span aria-hidden="true">&times;</span><span class="sr-only">Close</span></button>' \
                    'Cohort provided does not exist.' \
                    '</div></div></div>'
        return HttpResponse(response_str, status=500)

    token = SocialToken.objects.filter(account__user=request.user, account__provider='Google')[0].token
    data_url = METADATA_API + ('/cohort_files?cohort_id=%s&token=%s' % (cohort_id, token))

    for key in request.GET:
        data_url += '&' + key + '=' + request.GET[key]

    result = urlfetch.fetch(data_url, deadline=60)

    return HttpResponse(result.content, status=200)

class Echo(object):
    """An object that implements just the write method of the file-like
    interface.
    """
    def write(self, value):
        """Write the value by returning it, instead of storing in a buffer."""
        return value

def streaming_csv_view(request, cohort_id=0):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    if cohort_id == 0:
        messages.error('Cohort provided does not exist.')
        return redirect('/user_landing')

    data_url = METADATA_API + ('/cohort_files?cohort_id=%s&user_id=%s&limit=-1' % (cohort_id, request.user.id))
    if 'params' in request.GET:
        params = request.GET.get('params').split(',')

        for param in params:
            data_url += '&' + param + '=True'

    result = urlfetch.fetch(data_url, deadline=60)
    items = json.loads(result.content)
    if 'file_list' in items:
        file_list = items['file_list']
        """A view that streams a large CSV file."""
        # Generate a sequence of rows. The range is based on the maximum number of
        # rows that can be handled by a single sheet in most spreadsheet
        # applications.
        rows = ()
        rows = (["Sample", "Platform", "Pipeline", "DataLevel", "CloudStorageLocation"],)
        for file in file_list:
            rows += ([file['sample'], file['platform'], file['pipeline'], file['datalevel'], file['cloudstorage_location']],)
        pseudo_buffer = Echo()
        writer = csv.writer(pseudo_buffer)
        response = StreamingHttpResponse((writer.writerow(row) for row in rows),
                                         content_type="text/csv")
        response['Content-Disposition'] = 'attachment; filename="somefilename.csv"'
        return response

    elif 'error' in items:
        messages.error(request, items['error']['message'])
        return redirect(reverse('cohort_filelist', kwargs={'cohort_id':cohort_id}))
    return render(request)
