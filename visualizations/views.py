#
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
#
from __future__ import absolute_import

from builtins import map
from builtins import str
from past.builtins import basestring
import json
import collections
import datetime

from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_protect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import formats

from .models import SavedViz, Plot, Plot_Cohorts, Viz_Perms, Plot_Comments
from cohorts.models import Cohort, Cohort_Perms, Samples
from bq_data_access.v2.feature_search.util import SearchableFieldHelper


def _decode_list(data):
    rv = []
    for item in data:
        if isinstance(item, str):
            item = item.encode('utf-8')
        elif isinstance(item, list):
            item = _decode_list(item)
        elif isinstance(item, dict):
            item = _decode_dict(item)
        rv.append(item)
    return rv

def _decode_dict(data):
    rv = {}
    for key, value in list(data.items()):
        if isinstance(key, str):
            key = key.encode('utf-8')
        if isinstance(value, str):
            value = value.encode('utf-8')
        elif isinstance(value, list):
            value = _decode_list(value)
        elif isinstance(value, dict):
            value = _decode_dict(value)
        rv[key] = value
    return rv

def convert(data):
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(list(map(convert, iter(list(data.items())))))
    elif isinstance(data, collections.Iterable):
        return type(data)(list(map(convert, data)))
    else:
        return data

def union_cohort_samples_cases(cohort_ids):
    cohort_cases = Samples.objects.filter(cohort_id__in=cohort_ids).distinct().values_list('case_barcode', flat=True)
    cohort_samples = Samples.objects.filter(cohort_id__in=cohort_ids).distinct().values_list('sample_barcode', flat=True)
    return cohort_samples, cohort_cases

friendly_name_map = {
    'disease_code':'Disease Code',
    'gender':'Gender',
    'mirnPlatform':'microRNA expression platform',
    'gexpPlatform':'gene (mRNA) expression platform',
    'methPlatform':'DNA methylation platform',
    'rppaPlatform':'protein quantification platform',
    'cnvrPlatform':'copy-number platform',
    'age_at_initial_pathologic_diagnosis':'age at diagnosis',
    'hsa_miR_146a_5p':'hsa-miR-146a-5p expression (log2[normalized_counts+1])',
    'hsa_miR_7_7p':'hsa-miR-7-5p expression (log2[normalized_counts+1])',
    'CNVR_EGFR':'EGFR copy-number (log2[CN/2])',
    'EGFR_chr7_55086714_55324313':'EGFR expression (log2[normalized_counts+1])',
    'EGFR_chr7_55086714_55324313_EGFR':'EGFR protein quantification',
    'EGFR_chr7_55086288_cg03860890_TSS1500_Island':'EGFR methylation (TSS1500, CpG island)',
    'EGFR_chr7_55086890_cg14094960_5pUTR_Island':"EGFR methylation (5' UTR, CpG island)",
    'EGFR_chr7_55089770_cg10002850_Body_SShore':'EGFR methylation (first intron, cg10002850)',
    'EGFR_chr7_55177623_cg18809076_Body':'EGFR methylation (first intron, cg18809076)'
}

numerical_attributes = [
    'age_at_initial_pathologic_diagnosis',
    'BMI',
    'hsa_miR_146a_5p',
    'hsa_miR_7_7p',
    'CNVR_EGFR',
    'EGFR_chr7_55086714_55324313',
    'EGFR_chr7_55086714_55324313_EGFR',
    'EGFR_chr7_55086288_cg03860890_TSS1500_Island',
    'EGFR_chr7_55086890_cg14094960_5pUTR_Island',
    'EGFR_chr7_55089770_cg10002850_Body_SShore',
    'EGFR_chr7_55177623_cg18809076_Body'
]

categorical_attributes = [
    'disease_code',
    'gender',
    'mirnPlatform',
    'gexpPlatform',
    'methPlatform',
    'rppaPlatform',
    'cnvrPlatform'
]

fm_friendly_name_map = {
    'percent_lymphocyte_infiltration':'Percent Lymphocyte Infiltration',
    'percent_monocyte_infiltration':'Percent Monocyte Infiltration',
    'percent_necrosis':'Percent Necrosis',
    'percent_neutrophil_infiltration':'Percent Neutrophil Infiltration',
    'percent_normal_cells':'Percent Normal Cells',
    'percent_stromal_cells':'Percent Stromal Cells',
    'percent_tumor_cells':'Percent Tumor Cells',
    'percent_tumor_nuclei':'Percent Tumor Nuclei',
    'age_at_initial_pathologic_diagnosis':'Age at Diagnosis',
    'days_to_birth':'Days to Birth',
    'days_to_initial_pathologic_diagnosis':'Days to Diagnosis',
    'year_of_initial_pathologic_diagnosis':'Year of Diagnosis',
    'days_to_last_known_alive':'Days to Last Known Alive',
    'tumor_necrosis_percent':'Tumor Necrosis Percent',
    'tumor_nuclei_percent':'Tumor Nuclei Percent',
    'tumor_weight':'Tumor Weight',
    'days_to_last_followup':'Days to Last Followup',
    'gender':'Gender',
    'history_of_neoadjuvant_treatment':'History of Neoadjuvant Treatment',
    'icd_o_3_histology':'ICD-O-3 Code',
    'other_dx':'Prior Diagnosis',
    'vital_status':'Vital Status',
    'country':'Country',
    'disease_code':'Disease Code',
    'histological_type':'Histological Type',
    'icd_10':'ICD-10 Category',
    'icd_o_3_site':'ICD-O-3 Site',
    'tumor_tissue_site':'Tumor Tissue Site',
    'tumor_type':'Tumor Type',
    'person_neoplasm_cancer_status':'Neoplasm Cancer Status',
    'pathologic_N':'Pathologic N Stage',
    'radiation_therapy':'Radiation Therapy',
    'pathologic_T':'Pathologic T Stage',
    'race':'Race',
    'ethnicity':'Ethnicity',
    'sampleType':'Sample Type',
    'DNAseq_data':'DNA Sequencing Data',
    'mirnPlatform':'microRNA expression platform',
    'gexpPlatform':'gene (mRNA) expression platform',
    'methPlatform':'DNA methylation platform',
    'rppaPlatform':'protein quantification platform',
    'cnvrPlatform':'copy-number platform',
}

fm_numerical_attributes = [
    'percent_lymphocyte_infiltration',
    'percent_monocyte_infiltration',
    'percent_necrosis',
    'percent_neutrophil_infiltration',
    'percent_normal_cells',
    'percent_stromal_cells',
    'percent_tumor_cells',
    'percent_tumor_nuclei',
    'age_at_initial_pathologic_diagnosis',
    'BMI'
    'days_to_birth',
    'days_to_initial_pathologic_diagnosis',
    'year_of_initial_pathologic_diagnosis',
    'days_to_last_known_alive',
    'tumor_necrosis_percent',
    'tumor_nuclei_percent',
    'tumor_weight',
    'days_to_last_followup'
]

fm_categorical_attributes = [
    'gender',
    'history_of_neoadjuvant_treatment',
    'icd_o_3_histology',
    'other_dx',
    'vital_status',
    'country',
    'disease_code',
    'histological_type',
    'icd_10',
    'icd_o_3_site',
    'tumor_tissue_site',
    'tumor_type',
    'person_neoplasm_cancer_status',
    'pathologic_N',
    'radiation_therapy',
    'pathologic_T',
    'race',
    'ethnicity',
    'sampleType',
    'DNAseq_data',
    'mirnPlatform',
    'cnvrPlatform',
    'methPlatform',
    'gexpPlatform',
    'rppaPlatform'
]


def stackviz(request, id=0):
    # plots_data = []
    # search = {}
    #
    # domain_url = API_URL + '/fmdomains'
    # data = urlfetch.fetch(domain_url, deadline=60)
    # domains = json.loads(data.content, object_hook=_decode_dict)
    #
    # if id != 0:
    #     viz = SavedViz.objects.get(id=id)
    #     plots = Plot.objects.filter(visualization=id)
    #     if viz:
    #         index = 0
    #         for plot in plots:
    #             item = {
    #                      'plot_index': index,
    #                      'x_attr': str(plot.x_axis) if plot.x_axis else '',
    #                      'y_attr': str(plot.y_axis) if plot.y_axis else '',
    #                      'color_by': str(plot.color_by) if plot.color_by else '',
    #                      'cohort': int(plot.cohort.id),
    #                      'cohort_name': str(plot.cohort.name),
    #                      'cohort_length': len(plot.cohort.barcodes.split(','))}
    #             plots_data.append(item)
    #             index += 1
    #
    # if 'searchid' in request.POST.keys():
    #     search_list = filter(None, request.POST.getlist('searchid'))
    #     searches = getsearches(search_list)
    #     if len(searches) != len(search_list):
    #         searches.append(searches[0])
    #     if len(searches):
    #         index = 0
    #         for search in searches:
    #             item = {
    #                 'plot_index': index,
    #                 'x_attr': 'vital_status',
    #                 'y_attr': 'disease_code',
    #                 'color_by': 'disease_code',
    #                 'cohort': search['id'],
    #                 'cohort_name': search['name'],
    #                 'cohort_length': len(search['barcodes'].split(','))}
    #             plots_data.append(item)
    #             index += 1
    # if 'searchid' in request.GET.keys():
    #     search = getsearch(request.GET['searchid'])
    #     if search:
    #         data_url = API_URL + '/fmdata_parsets?' + search[0]['search_url'].replace('#','')
    #         # t0 = time.clock()
    #         data = urlfetch.fetch(data_url, deadline=60)
    #
    #         data_json = json.loads(data.content, object_hook=_decode_dict)
    #         plots_data = data_json['items']
    #
    #         # print time.clock() - t0, ' seconds to come back from api and start render'
    return render(request, 'visualizations/stackviz.html', {'request': request,
                                                              # 'search': search,
                                                              # 'plots_data': plots_data,
                                                              # 'friendly_name_map': fm_friendly_name_map,
                                                              # 'categorical_attributes': fm_categorical_attributes,
                                                              # 'data_domains': domains
                                                              })


def circviz(request, id=0):
    # plots_data = []
    # search = {}
    #
    # domain_url = API_URL + '/fmdomains'
    # data = urlfetch.fetch(domain_url, deadline=60)
    # domains = json.loads(data.content, object_hook=_decode_dict)
    #
    # if id != 0:
    #     viz = SavedViz.objects.get(id=id)
    #     plots = Plot.objects.filter(visualization=id)
    #     if viz:
    #         index = 0
    #         for plot in plots:
    #             item = {
    #                      'plot_index': index,
    #                      'x_attr': str(plot.x_axis) if plot.x_axis else '',
    #                      'y_attr': str(plot.y_axis) if plot.y_axis else '',
    #                      'color_by': str(plot.color_by) if plot.color_by else '',
    #                      'cohort': int(plot.cohort.id),
    #                      'cohort_name': str(plot.cohort.name),
    #                      'cohort_length': len(plot.cohort.barcodes.split(','))}
    #             plots_data.append(item)
    #             index += 1
    #
    # if 'searchid' in request.POST.keys():
    #     search_list = filter(None, request.POST.getlist('searchid'))
    #     searches = getsearches(search_list)
    #     if len(searches) != len(search_list):
    #         searches.append(searches[0])
    #     if len(searches):
    #         index = 0
    #         for search in searches:
    #             item = {
    #                 'plot_index': index,
    #                 'x_attr': 'vital_status',
    #                 'y_attr': 'disease_code',
    #                 'color_by': 'disease_code',
    #                 'cohort': search['id'],
    #                 'cohort_name': search['name'],
    #                 'cohort_length': len(search['barcodes'].split(','))}
    #             plots_data.append(item)
    #             index += 1
    # if 'searchid' in request.GET.keys():
    #     search = getsearch(request.GET['searchid'])
    #     if search:
    #         data_url = API_URL + '/fmdata_parsets?' + search[0]['search_url'].replace('#','')
    #         # t0 = time.clock()
    #         data = urlfetch.fetch(data_url, deadline=60)
    #
    #         data_json = json.loads(data.content, object_hook=_decode_dict)
    #         plots_data = data_json['items']
    #
    #         # print time.clock() - t0, ' seconds to come back from api and start render'
    return render(request, 'visualizations/circviz.html', {'request': request,
                                                           'api_url': settings.BASE_API_URL
                                                              # 'search': search,
                                                              # 'plots_data': plots_data,
                                                              # 'friendly_name_map': fm_friendly_name_map,
                                                              # 'categorical_attributes': fm_categorical_attributes,
                                                              # 'data_domains': domains
                                                              })

@login_required
def genericplot(request, id=0):
    searches = {}
    viz = {}
    plots_data = []
    plot_render_data = []
    viz_perm = None
    users = User.objects.filter(is_superuser=0)

    # Filter Options
    datatypes = [
        {'id': 'CLIN', 'label': 'Clinical'},
        {'id': 'GEXP', 'label': 'Gene Expression'},
        {'id': 'MIRN', 'label': 'miRNA'},
        {'id': 'METH', 'label': 'Methylation'},
        {'id': 'CNVR', 'label': 'Copy Number'},
        {'id': 'RPPA', 'label': 'Protein'},
        {'id': 'GNAB', 'label': 'Mutation'}
    ]

    new_datatypes = SearchableFieldHelper.get_fields_for_all_datatypes()

    # Fetch cohorts list used for autocomplete listing
    cohort_perms = Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)
    cohort_listing = Cohort.objects.filter(id__in=cohort_perms, active=True).values('id', 'name')
    for cohort in cohort_listing:
        cohort['value'] = int(cohort['id'])
        cohort['label'] = cohort['name'].encode('utf8')
        del cohort['id']
        del cohort['name']

    if id != 0:
        viz = SavedViz.objects.get(id=id)
        plots = Plot.objects.filter(visualization=id)

        if viz:
            viz_perm = viz.get_perm(request)
            for plot in plots:
                sample_set, patient_set = union_cohort_samples_cases(plot.plot_cohorts_set.all().values_list('cohort', flat=True))
                cohorts = Cohort.objects.filter(id__in=plot.plot_cohorts_set.all().values_list('cohort', flat=True))
                # for c in plot.plot_cohorts_set.all():
                #     cohorts.append(Cohort.objects.filter(id__in=)

                cohort_list = []
                for cohort in cohorts:
                    cohort_list.append({
                        'id': int(cohort.id),
                        'name': cohort.name.encode('utf-8')
                    })
                item = {
                        'plot_id': int(plot.id),
                        'title': plot.title.encode('utf-8'),
                        'x_attr': str(plot.x_axis),
                        'y_attr': str(plot.y_axis),
                        'color_by': str(plot.color_by) if plot.color_by else 'CLIN:Study',
                        'cohorts': cohort_list,
                        # 'cohort_name': str(cohort.name),
                        'patient_length': len(patient_set),
                        'sample_length': len(sample_set),
                        # 'notes': str(plot.notes)
                }
                plots_data.append(item)
                plot_render_data.append({
                    'id': int(plot.id),
                    'title': plot.title.encode('utf-8'),
                    'x_attr': str(plot.x_axis),
                    'y_attr': str(plot.y_axis),
                    'color_by': str(plot.color_by) if plot.color_by else 'CLIN:Study',
                    'cohorts': cohort_list,
                    # 'cohort_name': str(cohort.name),
                    'patient_length': len(patient_set),
                    'sample_length': len(sample_set),
                    'comments': plot.plot_comment.all(),
                    'viz_perm': viz_perm.perm
                })
    else:
        title = request.POST.get('vis_title', 'Unititled Visualization')
        cohort_id = request.POST.get('cohort_id', None)
        if not cohort_id:
            cohort = Cohort.objects.get_all_tcga_cohort()
        else:
            cohort = Cohort.objects.get(id=cohort_id)

        viz = SavedViz.objects.create(name=title)
        viz.save()
        perm = Viz_Perms.objects.create(visualization=viz, user=request.user, perm=Viz_Perms.OWNER)
        perm.save()
        viz_perm = perm
        plot = Plot.objects.create(visualization=viz,
                                   title='',
                                   x_axis='CLIN:age_at_initial_pathologic_diagnosis',
                                   y_axis='',
                                   color_by='CLIN:Study')

        plot.save()
        plot_cohort = Plot_Cohorts.objects.create(plot=plot, cohort=cohort)
        plot_cohort.save()

        item = {
                'plot_id': int(plot.id),
                'title': plot.title.encode('utf-8'),
                'x_attr': str(plot.x_axis),
                'y_attr': str(plot.y_axis),
                'color_by': str(plot.color_by),
                'cohorts': [{
                        'id': int(cohort.id),
                        'name': cohort.name.encode('utf-8')
                    }],
                'cohort_name': str(cohort.name),
                'patient_length': len(cohort.patients_set.all()),
                'sample_length': len(cohort.samples_set.all()),
        }

        plots_data.append(item)
        plot_render_data.append({
            'id': int(plot.id),
            'title': plot.title.encode('utf-8'),
            'cohorts': [{
                        'id': int(cohort.id),
                        'name': cohort.name.encode('utf-8')
                    }],
            'cohort_name': str(cohort.name),
            'patient_length': len(cohort.patients_set.all()),
            'sample_length': len(cohort.samples_set.all()),
            'comments': [],
            'viz_perm': perm.perm,
            'x_attr': str(plot.x_axis),
            'y_attr': str(plot.y_axis),
            'color_by': str(plot.color_by),
        })

    return render(request, 'visualizations/genericplot.html', {'request': request,
                                                              'searches': searches,
                                                              'viz': viz,
                                                              'viz_perm': viz_perm.perm,
                                                              'plots_data': plots_data,
                                                              'plot_render_data': plot_render_data,
                                                              'users': users,
                                                              'friendly_name_map': fm_friendly_name_map,
                                                              'categorical_attributes': fm_categorical_attributes,
                                                              'numerical_attributes': fm_numerical_attributes,
                                                              'cohorts': cohort_listing,
                                                              'base_url': settings.BASE_URL,
                                                              'base_api_url': settings.BASE_API_URL,
                                                              'data_types': datatypes,
                                                              'new_datatypes': new_datatypes})


@csrf_protect
def save_viz(request):
    redirect_url = '/dashboard/'

    if request.method == 'POST':
        params = request.POST
        name = str(params.get('name', None))
        viz_id = int(params.get('viz_id', None))

        # Update or create visualization
        viz, created = SavedViz.objects.update_or_create(id=viz_id, defaults={'name':name, 'last_date_saved': datetime.datetime.now()})

        # Update or create plots associated to visualizations
        plots = {}
        for key in list(params.keys()):
            if 'plot' in key:
                plot, index, attr = key.split('-')
                index = int(index)
                attr = str(attr)
                if index in list(plots.keys()):
                    plots[index][attr] = params[key].encode('utf-8')
                else:
                    plots[index] = {}
                    plots[index][attr] = params[key].encode('utf-8')

        for key in list(plots.keys()):
            cohort_ids = plots[key]['cohort_ids'].split(',')
            cohorts = Cohort.objects.filter(id__in=cohort_ids)
            plot, created = Plot.objects.update_or_create(id=key, defaults={'visualization':viz,
                        'title':plots[key]['name'],
                        'x_axis':plots[key]['x_axis'],
                        'y_axis':plots[key]['y_axis'],
                        'color_by':plots[key]['color_by'],
                        'plot_type':plots[key]['plot_type']})
            plot_cohort_list = []
            Plot_Cohorts.objects.filter(plot=plot).delete()
            for cohort in cohorts:
                plot_cohort_list.append(Plot_Cohorts(plot=plot, cohort=cohort))
            Plot_Cohorts.objects.bulk_create(plot_cohort_list)

        # Create and save permissions
        perm = Viz_Perms(visualization=viz, user=request.user, perm=Viz_Perms.OWNER)
        perm.save()
        messages.info(request, 'Visualization, %s, saved successfully.' % viz.name)
        # return redirect(reverse(redirect_url, args=[viz.id]))

    return redirect(redirect_url)

@csrf_protect
def delete_viz(request):
    redirect_Url = '/dashboard/'

    if request.method == 'POST':
        ids = request.POST.getlist('id')
        # for id in ids:
        #     Plot.objects.filter(visualization=id).delete()
        #     SavedViz.objects.filter(id=id).delete()
        SavedViz.objects.filter(id__in=ids).update(active=False)
    return redirect(redirect_Url)

@login_required
@csrf_protect
def share_viz(request, id=0):
    user_ids = request.POST.getlist('users')
    users = User.objects.filter(id__in=user_ids)
    redirect_url = '/dashboard/'
    if id == 0:
        viz_ids = request.POST.getlist('viz-ids')
        viz_list = SavedViz.objects.filter(id__in=viz_ids)
    else:
        viz_list = SavedViz.objects.filter(id=id)

    for user in users:
        for viz in viz_list:
            obj = Viz_Perms.objects.create(user=user, visualization=viz, perm=Viz_Perms.READER)
            obj.save()

    return redirect(redirect_url)

@login_required
def clone_viz(request, id=0):
    parent_viz = SavedViz.objects.get(id=id)
    redirect_url = 'genericplot_id'
    new_name = 'Copy of %s' % parent_viz.name

    # Create new visualization
    clone = SavedViz(name=new_name, parent=parent_viz)
    clone.save()

    # Set Permissions on new viz
    perm = Viz_Perms(visualization=clone, user=request.user, perm=Viz_Perms.OWNER)
    perm.save()

    # Create copy plots
    plots = Plot.objects.filter(visualization=parent_viz)
    for plot in plots:
        old_plot_id = plot.id
        new_plot = plot
        new_plot.id = None
        new_plot.name = new_name
        new_plot.visualization = clone
        new_plot.save()

        # Create associated cohorts with new plots
        plot_cohorts = Plot_Cohorts.objects.filter(plot_id=old_plot_id)
        for plot_cohort in plot_cohorts:
            new_plot_cohort = plot_cohort
            new_plot_cohort.id = None
            new_plot_cohort.plot = new_plot
            new_plot_cohort.save()

    return redirect(reverse(redirect_url,args=[clone.id]))


@login_required
@csrf_protect
def save_comment(request):
    content = request.POST.get('content').encode('utf-8')
    plot = Plot.objects.get(id=int(request.POST.get('plot_id')))
    obj = Plot_Comments.objects.create(user=request.user, plot=plot, content=content)
    obj.save()

    return_obj = {
        'plot': int(plot.id),
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'date_created': formats.date_format(obj.date_created, 'DATETIME_FORMAT'),
        'content': obj.content
    }
    return HttpResponse(json.dumps(return_obj), status=200)

@login_required
def add_plot(request):
    # TODO: Double check that user owns viz
    cohort = Cohort.objects.get_all_tcga_cohort()
    # Fetch cohorts list used for autocomplete listing
    cohort_perms = Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)
    cohort_listing = Cohort.objects.filter(id__in=cohort_perms, active=True).values('id', 'name')
    for cohort_item in cohort_listing:
        cohort_item['value'] = int(cohort_item['id'])
        cohort_item['label'] = cohort_item['name'].encode('utf8')
        del cohort_item['id']
        del cohort_item['name']
    viz_id = request.GET.get('viz_id', None)

    # Filter Options
    datatypes = [
        {'id': 'CLIN', 'label': 'Clinical'},
        {'id': 'GEXP', 'label': 'Gene Expression'},
        {'id': 'MIRN', 'label': 'miRNA'},
        {'id': 'METH', 'label': 'Methylation'},
        {'id': 'CNVR', 'label': 'Copy Number'},
        {'id': 'RPPA', 'label': 'Protein'},
        {'id': 'GNAB', 'label': 'Mutation'}
    ]

    new_datatypes = SearchableFieldHelper.get_fields_for_all_datatypes()

    if viz_id:
        viz = SavedViz.objects.get(id=int(viz_id))

        plot = Plot.objects.create(visualization=viz,
                                   title='',
                                   x_axis='CLIN:age_at_initial_pathologic_diagnosis',
                                   y_axis='',
                                   color_by='CLIN:Study')

        plot.save()
        plot_cohort = Plot_Cohorts.objects.create(plot=plot, cohort=cohort)
        plot_cohort.save()

        return_obj = {'plot': {
                        'id': int(plot.id),
                        'title': plot.title.encode('utf-8'),
                        'cohorts': [{
                                    'id': int(cohort.id),
                                    'name': cohort.name.encode('utf-8')
                                }],
                        'x_attr': str(plot.x_axis),
                        'y_attr': str(plot.y_axis),
                        'color_by': str(plot.color_by),
                        'cohort_name': str(cohort.name),
                        'patient_length': len(cohort.patients_set.all()),
                        'sample_length': len(cohort.samples_set.all()),
                        'comments': [],
                        'viz_perm': 'OWNER'
                    },
                    'cohorts': cohort_listing,
                    'data_types': datatypes,
                    'new_datatypes': new_datatypes}
        return render(request, 'visualizations/plot.html', return_obj, status=200)
    return HttpResponse(status=500)

@login_required
@csrf_protect
def delete_plot(request):
    # TODO: Double check that user owns viz
    plot_id = request.POST.get('plot_id', None)
    if plot_id:
        Plot.objects.get(id=plot_id).delete()
        return HttpResponse(status=200)
    return HttpResponse(status=500)