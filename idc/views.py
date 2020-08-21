###
# Copyright 2015-2020, Institute for Systems Biology
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

from builtins import str
import time
import json
import logging
import sys
import datetime

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.contrib.auth.models import User
from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib import messages

from google_helpers.stackdriver import StackDriverLogger
from cohorts.models import Cohort, Cohort_Perms
from idc_collections.models import Program, Attribute_Display_Values, DataSource, DataVersion, Collection, DataSetType
from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponse, JsonResponse
from .metadata_utils import get_collex_metadata

debug = settings.DEBUG
logger = logging.getLogger('main_logger')

BQ_ATTEMPT_MAX = 10
WEBAPP_LOGIN_LOG_NAME = settings.WEBAPP_LOGIN_LOG_NAME

# The site's homepage
@never_cache
def landing_page(request):
    counts = get_collex_metadata(None, None, 0, True, False, with_derived=False, facets=["BodyPartExamined"])

    facets = counts['facets']

    exclusions = ["Undefined", "None", "Thorax_1Head_Nec", "Chestabdpelvis", "Tspine"]

    sapien_counts = {
        "Colorectal": {
            'site': "Colorectal",
            'cases': 0,
            'fileCount': 0
        }
    }

    for x in facets:
        for y in facets[x]['facets']:
            for z in facets[x]['facets'][y]:
                key = z.title()
                if key not in exclusions:
                    if key in ["Rectum", "Colon"]:
                        sapien_counts["Colorectal"]['cases'] += facets[x]['facets'][y][z]
                    else:
                        if z == 'HEADNECK':
                            key = 'Head and Neck'
                        sapien_counts[key] = {'site': key, 'cases': facets[x]['facets'][y][z], 'fileCount': 0}


    return render(request, 'idc/landing.html', {'request': request, 'case_counts': [sapien_counts[x] for x in sapien_counts] })

# Displays the privacy policy
@never_cache
def privacy_policy(request):
    return render(request, 'idc/privacy.html', {'request': request, })

# Returns css_test page used to test css for general ui elements
def css_test(request):
    return render(request, 'idc/css_test.html', {'request': request})

# View for testing methods manually
@login_required
def test_methods(request):
    context = {}
    try:
        # These are example filters; typically they will be reconstituted from the request
        filters = {"vital_status": ["Alive"], "disease_code": ["READ", "BRCA"]}
        # These are the actual data fields to display in the expanding table; again this is just an example
        # set that should be properly supplied in the reuqest
        fields = ["BodyPartExamined", "Modality", "StudyDescription", "StudyInstanceUID", "SeriesInstanceUID", "case_barcode", "disease_code", "sample_type"]

        # get_collex_metadata will eventually branch into 'from BQ' and 'from Solr' depending on if there's a request
        # for a version which isn't current, or for a user cohort
        facets_and_lists = get_collex_metadata(filters, fields)

        if facets_and_lists:
            context = {
                'collex_attr_counts': facets_and_lists['clinical'],
                'cross_collex_attr_counts': facets_and_lists['facets']['cross_collex'],
                'listings': facets_and_lists['docs']
            }

    except Exception as e:
        logger.error("[ERROR] In explore_data:")
        logger.exception(e)

    return render(request, 'idc/explore.html', {'request': request, 'context': context})

# User details page
@login_required
def user_detail(request, user_id):
    if debug: logger.debug('Called '+sys._getframe().f_code.co_name)

    if int(request.user.id) == int(user_id):

        user = User.objects.get(id=user_id)
        try:
            social_account = SocialAccount.objects.get(user_id=user_id, provider='google')
        except Exception as e:
            # This is a local account
            social_account = None
        user_details = {
            'date_joined':  user.date_joined,
            'email':        user.email,
            'id':           user.id,
            'last_login':   user.last_login
        }

        if social_account:
            user_details['extra_data'] = social_account.extra_data if social_account else None
            user_details['first_name'] = user.first_name
            user_details['last_name'] = user.last_name
        else:
            user_details['username'] = user.username

        return render(request, 'idc/user_detail.html',
                      {'request': request,
                       'user': user,
                       'user_details': user_details,
                       'local_account': bool(social_account is None)
                       })
    else:
        return render(request, '403.html')


# Extended login view so we can track user logins, redirects to data exploration page
def extended_login_view(request):

    try:
        # Write log entry
        st_logger = StackDriverLogger.build_from_django_settings()
        log_name = WEBAPP_LOGIN_LOG_NAME
        user = User.objects.get(id=request.user.id)
        st_logger.write_text_log_entry(
            log_name,
            "[WEBAPP LOGIN] User {} logged in to the web application at {}".format(user.email, datetime.datetime.utcnow())
        )

    except Exception as e:
        logger.exception(e)

    return redirect(reverse('explore_data'))


# Health check callback
#
# Because the match for vm_ is always done regardless of its presense in the URL
# we must always provide an argument slot for it
def health_check(request, match):
    return HttpResponse('')

# Returns the basic help page (will direct to contact info and readthedocs
def help_page(request):
    return render(request, 'idc/help.html',{'request': request})

# Data exploration and cohort creation page
@login_required
def explore_data_page(request):
    attr_by_source = {}
    attr_sets = {}
    context = {'request': request}
    is_json = False

    try:
        req = request.GET if request.GET else request.POST
        is_dicofdic = (req.get('is_dicofdic', "False").lower() == "true")
        source = req.get('data_source_type', DataSource.SOLR)
        versions = json.loads(req.get('versions', '[]'))
        filters = json.loads(req.get('filters', '{}'))
        fields = json.loads(req.get('fields', '[]'))
        order_docs = json.loads(req.get('order_docs', '[]'))
        counts_only = (req.get('counts_only', "False").lower() == "true")
        with_related = (req.get('with_clinical', "True").lower() == "true")
        with_derived = (req.get('with_derived', "True").lower() == "true")
        collapse_on = req.get('collapse_on', 'SeriesInstanceUID')
        is_json = (req.get('is_json', "False").lower() == "true")

        context['collection_tooltips'] = Collection.objects.filter(active=True).get_tooltips()

        versions = DataVersion.objects.filter(name__in=versions) if len(versions) else DataVersion.objects.filter(active=True)

        data_types = [DataSetType.IMAGE_DATA,]
        with_related and data_types.extend(DataSetType.ANCILLARY_DATA)
        with_derived and data_types.extend(DataSetType.DERIVED_DATA)
        data_sets = DataSetType.objects.filter(data_type__in=data_types)
        sources = data_sets.get_data_sources().filter(source_type=source, id__in=versions.get_data_sources().filter(source_type=source).values_list("id",flat=True)).distinct()

        source_attrs = sources.get_source_attrs(for_ui=True, with_set_map=True)

        # For now we're only allowing TCGA+ispy1+lidc-idri+qin_headneck
        # TODO: REMOVE THIS ONCE WE'RE ALLOWING MORE
        tcga_in_tcia = Program.objects.get(short_name="TCGA").collection_set.all()
        collectionFilterList = [collex.collection_id for collex in tcga_in_tcia] + ['ispy1', 'lidc_idri', 'qin_headneck', 'nsclc_radiomics']
        if not 'collection_id' in filters:
            filters['collection_id'] =  collectionFilterList

        source_data_types = sources.get_source_data_types()

        for source in sources:
            is_origin = DataSetType.IMAGE_DATA in source_data_types[source.id]
            # If a field list wasn't provided, work from a default set
            if is_origin and not len(fields):
                fields = source.get_attr(for_faceting=False).filter(default_ui_display=True).values_list('name', flat=True)

            for dataset in data_sets:
                if dataset.data_type in source_data_types[source.id]:
                    set_type = dataset.get_set_name()
                    if set_type not in attr_by_source:
                        attr_by_source[set_type] = {}
                    attrs = source_attrs['sources'][source.id]['attr_sets'][dataset.id]
                    if 'attributes' not in attr_by_source[set_type]:
                        attr_by_source[set_type]['attributes'] = {}
                        attr_sets[set_type] = attrs
                    else:
                        attr_sets[set_type] = attr_sets[set_type] | attrs

                    attr_by_source[set_type]['attributes'].update(
                        {attr.name: {'source': source.id, 'obj': attr, 'vals': None, 'id': attr.id} for attr in attrs}
                    )

        start = time.time()
        source_metadata = get_collex_metadata(
            filters, fields, record_limit=1000, counts_only=counts_only, with_ancillary = with_related,
            collapse_on = collapse_on, order_docs = order_docs, sources = sources, versions = versions
        )
        stop = time.time()
        logger.debug("[STATUS] Benchmarking: Time to collect metadata for source type {}: {}s".format(
            "BigQuery" if sources.first().source_type == DataSource.BIGQUERY else "Solr",
            str((stop-start))
        ))

        for source in source_metadata['facets']:
            source_name = ":".join(source.split(":")[0:2])
            facet_set = source_metadata['facets'][source]['facets']
            for dataset in data_sets:
                if dataset.data_type in source_data_types[int(source.split(":")[-1])]:
                    set_name = dataset.get_set_name()
                    if dataset.data_type in data_types and set_name in attr_sets:
                        attr_display_vals = Attribute_Display_Values.objects.filter(
                            attribute__id__in=attr_sets[set_name]).to_dict()
                        if dataset.data_type == DataSetType.DERIVED_DATA:
                            attr_cats = attr_sets[set_name].get_attr_cats()
                            for attr in facet_set:
                                if attr in attr_by_source[set_name]['attributes']:
                                    source_name = "{}:{}".format(source_name.split(":")[0], attr_cats[attr]['cat_name'])
                                    if source_name not in attr_by_source[set_name]:
                                        attr_by_source[set_name][source_name] = {'attributes': {}}
                                    attr_by_source[set_name][source_name]['attributes'][attr] = \
                                    attr_by_source[set_name]['attributes'][attr]
                                    this_attr = attr_by_source[set_name]['attributes'][attr]['obj']
                                    values = []
                                    for val in facet_set[attr]:
                                        if val == 'min_max':
                                            attr_by_source[set_name][source_name]['attributes'][attr][val] = facet_set[attr][val]
                                        else:
                                            displ_val = val if this_attr.preformatted_values else attr_display_vals.get(
                                                this_attr.id, {}).get(val, None)
                                            values.append({
                                                'value': val,
                                                'display_value': displ_val,
                                                'units': this_attr.units,
                                                'count': facet_set[attr][val] if val in facet_set[attr] else 0
                                            })
                                    attr_by_source[set_name][source_name]['attributes'][attr]['vals'] = sorted(values, key=lambda x: x['value'])
                        else:
                            attr_by_source[set_name]['All'] = {'attributes': attr_by_source[set_name]['attributes']}
                            for attr in facet_set:
                                if attr in attr_by_source[set_name]['attributes']:
                                    this_attr = attr_by_source[set_name]['attributes'][attr]['obj']
                                    values = []
                                    for val in source_metadata['facets'][source]['facets'][attr]:
                                        if val == 'min_max':
                                            attr_by_source[set_name]['All']['attributes'][attr][val] = facet_set[attr][val]
                                        else:
                                            displ_val = val if this_attr.preformatted_values else attr_display_vals.get(this_attr.id, {}).get(val, None)
                                            values.append({
                                                'value': val,
                                                'display_value': displ_val,
                                                'count': facet_set[attr][val] if val in facet_set[attr] else 0
                                            })
                                    if attr == 'bmi':
                                        sortDic = {'underweight': 0, 'normal weight': 1, 'overweight': 2, 'obese': 3, 'None': 4}
                                        attr_by_source[set_name]['All']['attributes'][attr]['vals'] = sorted(values, key=lambda x: sortDic[x['value']])
                                    else:
                                        attr_by_source[set_name]['All']['attributes'][attr]['vals'] = sorted(values, key=lambda x: x['value'])

        for set in attr_by_source:
            for source in attr_by_source[set]:
                if source == 'attributes':
                    continue
                if is_dicofdic:
                    for x in list(attr_by_source[set][source]['attributes'].keys()):
                        if (isinstance(attr_by_source[set][source]['attributes'][x]['vals'],list) and (len(attr_by_source[set][source]['attributes'][x]['vals']) > 0)):
                            attr_by_source[set][source]['attributes'][x] = {y['value']: {
                                'display_value': y['display_value'], 'count': y['count']
                            } for y in attr_by_source[set][source]['attributes'][x]['vals']}
                        else:
                            attr_by_source[set][source]['attributes'][x] = {}

                    if set == 'origin_set':
                        context['collections'] = {a: attr_by_source[set][source]['attributes']['collection_id'][a]['count'] for a in attr_by_source[set][source]['attributes']['collection_id']}
                        context['collections']['All'] = source_metadata['total']
                else:
                    if set == 'origin_set':
                        collex = attr_by_source[set][source]['attributes']['collection_id']
                        if collex['vals']:
                            context['collections'] = {a['value']: a['count'] for a in collex['vals'] if a['value'] in collectionFilterList}
                        else:
                            context['collections'] = {a.name: 0 for a in Collection.objects.filter(active=True, name__in=collectionFilterList)}
                        context['collections']['All'] = source_metadata['total']

                    attr_by_source[set][source]['attributes'] = [{
                        'name': x,
                        'id': attr_by_source[set][source]['attributes'][x]['obj'].id,
                        'display_name': attr_by_source[set][source]['attributes'][x]['obj'].display_name,
                        'values': attr_by_source[set][source]['attributes'][x]['vals'],
                        'units': attr_by_source[set][source]['attributes'][x]['obj'].units,
                        'min_max': attr_by_source[set][source]['attributes'][x].get('min_max', None)
                   } for x, val in sorted(attr_by_source[set][source]['attributes'].items())]

            if not counts_only:
                attr_by_source[set]['docs'] = source_metadata['docs']

        for key, source_set in attr_by_source.items():
            sources = list(source_set.keys())
            for key in sources:
                if key == 'attributes':
                    source_set.pop(key)

        attr_by_source['total'] = source_metadata['total']

        context['set_attributes'] = attr_by_source
        context['filters'] = filters

        programs = [x.lower() for x in list(Program.get_public_programs().values_list('short_name', flat=True))]
        programSet = {}
        for collection in context['collections']:
            pref = collection.split('_')[0]
            if pref in programs:
                if not pref in programSet:
                    programSet[pref] = {
                        'projects': {},
                        'val': 0
                    }
                programSet[pref]['projects'][collection] = context['collections'][collection]
                programSet[pref]['val'] += context['collections'][collection]
            else:
                programSet[collection] = {'val': context['collections'][collection]}

        if with_related:
            context['tcga_collections'] = tcga_in_tcia

        context['programs'] = programSet
        #context['derived_list'] = [{'segmentations:TCIA Segmentation Analysis':'Segmentation'}, {'qualitative_measurements:TCIA Qualitative Analysis': 'Qualitative Analysis'}, {'quantitative_measurements:TCIA Quantitative Analysis':'Quantitative Analysis'}]

        if 'derived_set' in context['set_attributes']:
            if 'dicom_derived_all:segmentation' in context['set_attributes']['derived_set']:
                context['set_attributes']['derived_set']['dicom_derived_all:segmentation'].update({'display_name': 'Segmentation', 'name': 'segmentation'})
            if 'dicom_derived_all:qualitative' in context['set_attributes']['derived_set']:
                context['set_attributes']['derived_set']['dicom_derived_all:qualitative'].update({'display_name': 'Qualitative Analysis', 'name': 'qualitative'})
            if 'dicom_derived_all:quantitative' in context['set_attributes']['derived_set']:
                context['set_attributes']['derived_set']['dicom_derived_all:quantitative'].update({'display_name': 'Quantitative Analysis', 'name': 'quantitative'})

    except Exception as e:
        logger.error("[ERROR] While attempting to load the search page:")
        logger.exception(e)
        messages.error(request, "Encountered an error when attempting to load the page - please contact the administrator.")

    if is_json:
        attr_by_source['programs'] = programSet
        return JsonResponse(attr_by_source)
    else:
        context['order']={}
        context['order']['derived_set']=['dicom_derived_all:segmentation','dicom_derived_all:qualitative','dicom_derived_all:quantitative']
        return render(request, 'idc/explore.html', context)

# @login_required
# def ohif_test_page(request):
#     request.session['last_path']=request.get_full_path()
#     return render(request, 'idc/ohif.html',{'request': request})
#
# @login_required
# def ohif_viewer_page(request):
#     request.session['last_path'] = request.get_full_path()
#     return render(request, 'idc/ohif.html',{'request': request})

# @login_required
# def ohif_callback_page(request):
#     return render(request,'idc/ohif.html',{'request': request})
#
# @login_required
# def ohif_projects_page(request):
#     request.session['last_ohif_path'] = request.get_full_path()
#     return render(request, 'idc/ohif.html',{'request': request})
#
# def ohif_page(request):
#     request.session['last_path'] = request.get_full_path()
#     return render(request, 'idc/ohif.html',{'request': request})

# Callback for recording the user's agreement to the warning popup
def warn_page(request):
    request.session['seenWarning']=True;
    return JsonResponse({'warning_status': 'SEEN'}, status=200)

# About page
def about_page(request):
    return render(request, 'idc/about.html',{'request': request})

# User dashboard, where saved cohorts (and, in the future, uploaded/indexed data) are listed
@login_required
def dashboard_page(request):

    context = {'request'  : request}

    try:
        # Cohort List
        cohort_perms = list(set(Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)))
        # TODO: Add in 'date created' and sort on that
        context['cohorts'] = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-name')

        # Program List
        ownedPrograms = request.user.program_set.filter(active=True)
        sharedPrograms = Program.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
        programs = ownedPrograms | sharedPrograms
        context['programs'] = programs.distinct().order_by('-last_date_saved')

    except Exception as e:
        logger.error("[ERROR] While attempting to load the dashboard:")
        logger.exception(e)

    return render(request, 'idc/dashboard.html', context)
