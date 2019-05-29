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
from __future__ import print_function

from builtins import map
from builtins import str
import logging
import datetime
from django.contrib.auth.models import User

import re
from django.shortcuts import render, redirect
from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required

from cohorts.models import Cohort, Cohort_Perms
from visualizations.models import SavedViz, Plot, Plot_Cohorts, Viz_Perms


SEQPEEK_VIEW_DEBUG_MODE = False

SAMPLE_ID_FIELD_NAME = 'sample_barcode'
TRACK_ID_FIELD = "tumor"
COORDINATE_FIELD_NAME = 'uniprot_aapos'
PROTEIN_ID_FIELD = 'uniprot_id'

PROTEIN_DOMAIN_DB = 'PFAM'


ALPHA_FINDER = re.compile('[\W_]+', re.UNICODE)


def build_gnab_feature_id(gene):
    return "GNAB:{gene_label}:variant_classification".format(gene_label=gene)


def get_table_row_id(tumor_type):
    return "seqpeek_row_{0}".format(tumor_type)


def get_track_label(track, cohort_info_array):
    cohort_map = {item['id']: item['name'] for item in cohort_info_array}
    return cohort_map[track[TRACK_ID_FIELD]]


def build_track_data(track_id_list):
    tracks = []
    for track_id in track_id_list:
        tracks.append({
            TRACK_ID_FIELD: track_id
        })

    return tracks


def sanitize_gene_input(param_string):
    return ALPHA_FINDER.sub('', param_string)


def sanitize_normalize_tumor_type(tumor_type_list):
    sanitized = []
    for tumor_label in tumor_type_list:
        tumor_label = tumor_label.strip()
        tumor_label = ALPHA_FINDER.sub('', tumor_label)
        if len(tumor_label) > 0:
            sanitized.append(tumor_label)

    return sanitized


def get_track_id_list(param):
    return list(map(str, param))


def build_data_uri(hugo_symbol, cohort_id_array):
    cohort_id_items = []
    for cohort_id in cohort_id_array:
        cohort_id_items.append("cohort_id=" + str(cohort_id))

    cohort_id_params = "&".join(cohort_id_items)

    template = '/_ah/api/seqpeek_data_api/v1/view_data?' \
               'hugo_symbol={hugo_symbol}&' \
               '{cohort_id_params}'

    data_uri = template.format(hugo_symbol=hugo_symbol, cohort_id_params=cohort_id_params)
    logging.debug("SeqPeek view data URI: " + data_uri)

    return data_uri

@login_required
def seqpeek(request, id=0):
    users = User.objects.filter(is_superuser=0)
    cohort_id_list = Cohort_Perms.objects.filter(user=request.user).values_list('cohort_id', flat=True)
    cohort_list = Cohort.objects.filter(id__in=cohort_id_list, active=True)

    context = {
        'base_url': settings.BASE_URL,
        'base_api_url': settings.BASE_API_URL,
        'cohort_list': cohort_list,
        'users': users
    }

    if id != 0:
        viz = SavedViz.objects.get(id=id)
        plot = Plot.objects.filter(visualization=viz)[0]
        context['viz'] = viz
        context['plot'] = plot
        context['plot_cohorts'] = Cohort.objects.filter(id__in=plot.plot_cohorts_set.all().values_list('cohort', flat=True))
        context['viz_perm'] = viz.get_perm(request).perm

    return render(request, 'seqpeek/seqpeek.html', context)

def save_seqpeek(request):
    redirect_url = '/user_landing/'

    if request.method == 'POST':
        params = request.POST
        print(params)
        name = str(params.get('name', None))
        viz_id = params.get('viz_id', None)
        if viz_id:
            viz_id = int(viz_id)

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

            #TODO: This should just use a regular create or update...
            if key == 0:
                plot, created = Plot.objects.update_or_create(id=None, defaults={
                    'visualization':viz,
                    'title':plots[key]['name'],
                    'x_axis':plots[key]['x_axis'],
                    'plot_type':plots[key]['plot_type']})
            else:
                plot, created = Plot.objects.update_or_create(id=key, defaults={
                    'visualization':viz,
                    'title':plots[key]['name'],
                    'x_axis':plots[key]['x_axis'],
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

