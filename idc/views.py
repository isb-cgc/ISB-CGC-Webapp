###
# Copyright 2015-2021, Institute for Systems Biology
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
from json.decoder import JSONDecodeError
import logging
import sys
import datetime
import re
import copy

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.views.decorators.cache import never_cache
from django.contrib.auth.models import User
from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib import messages

from google_helpers.stackdriver import StackDriverLogger
from cohorts.models import Cohort, Cohort_Perms
from idc_collections.models import Program, DataSource, Collection, ImagingDataCommonsVersion, Attribute, Attribute_Tooltips
from idc_collections.collex_metadata_utils import build_explorer_context, get_collex_metadata
from allauth.socialaccount.models import SocialAccount
from django.core.exceptions import ObjectDoesNotExist
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.signals import user_login_failed
from django.dispatch import receiver
from idc.models import User_Data


debug = settings.DEBUG
logger = logging.getLogger('main_logger')

BQ_ATTEMPT_MAX = 10
WEBAPP_LOGIN_LOG_NAME = settings.WEBAPP_LOGIN_LOG_NAME


# The site's homepage
@never_cache
def landing_page(request):
    collex = Collection.objects.filter(active=True, subject_count__gt=6,
                                       collection_type=Collection.ORIGINAL_COLLEX, species='Human',
                                       access="Public").values()
    idc_info = ImagingDataCommonsVersion.objects.get(active=True)

    sapien_counts = {}

    changes = {
        'Head': 'Head and Neck',
        'Head-Neck': 'Head and Neck',
        'Head-and-Neck': 'Head and Neck',
        'Colon': 'Colorectal',
        'Rectum': 'Colorectal',
        "Marrow, Blood": "Blood",
        "Testicles": "Testis",
        "Adrenal Glands": "Adrenal Gland"
    }

    skip = [
        'Extremities',
        'Abdomen, Mediastinum',
        'Abdomen, Pelvis',
        'Abdomen',
        'Ear',
        'Pelvis, Prostate, Anus',
        "Intraocular",
        "Mesothelium",
        "Chest-Abdomen-Pelvis, Leg, TSpine"
    ]

    for collection in collex:
        loc = collection['location']
        if re.search(r'[Pp]hantom',loc) or re.search('[Vv]arious',loc) or loc in skip:
            continue
        if collection['location'] in changes:
            loc = changes[collection['location']]
        if loc not in sapien_counts:
            sapien_counts[loc] = 0
        sapien_counts[loc] += collection['subject_count']

    ex_tooltips = {
        '1.3.6.1.4.1.14519.5.2.1.6279.6001.224985459390356936417021464571': '<p>Patient ID: LIDC-IDRI-0834</p><p>Modality: CT</p>',
        '1.3.6.1.4.1.14519.5.2.1.1706.4001.149500105036523046215258942545': '<p>Patient ID: TCGA-02-0006</p><p>Modality: MR</p>',
        '1.3.6.1.4.1.14519.5.2.1.2744.7002.950936925946327395356711739684': '<p>Patient ID: QIN-HEADNECK-01-0228</p><p>Modality: PET</p>'
    }

    return render(request, 'idc/landing.html', {
        'request': request,
        'case_counts': [{'site': x, 'cases': sapien_counts[x], 'fileCount': 0} for x in sapien_counts.keys()],
        'example_tooltips': ex_tooltips,
        'idc_info': idc_info
    })


# Displays the privacy policy
def privacy_policy(request):
    return render(request, 'idc/privacy.html', {'request': request, })


def collaborators(request):
    return render(request, 'idc/collaborators.html', {'request': request, })


# News page (loads from Discourse)
def news_page(request):
    return render(request, 'idc/news.html')


# User details page
@login_required
def user_detail(request, user_id):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)

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
                       'unconnected_local_account': bool(social_account is None),
                       'social_account': bool(social_account is not None)
                       })
    else:
        return render(request, '403.html')


@receiver(user_login_failed)
def user_login_failed_callback(sender, credentials, **kwargs):
    try:
        # Write log entry
        st_logger = StackDriverLogger.build_from_django_settings()
        log_name = WEBAPP_LOGIN_LOG_NAME
        st_logger.write_text_log_entry(
            log_name,
            '[WEBAPP LOGIN] Login FAILED for: {credentials}'.format(credentials=credentials)
        )

    except Exception as e:
        logger.exception(e)


# Extended login view so we can track user logins, redirects to data exploration page
def extended_login_view(request):
    try:
        # Write log entry
        st_logger = StackDriverLogger.build_from_django_settings()
        log_name = WEBAPP_LOGIN_LOG_NAME
        user = User.objects.get(id=request.user.id)
        st_logger.write_text_log_entry(
            log_name,
            "[WEBAPP LOGIN] User {} logged in to the web application at {}".format(user.email,
                                                                                   datetime.datetime.utcnow())
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


# Quote page
def quota_page(request):
    return render(request, 'idc/quota.html', {'request': request, 'quota': settings.IMG_QUOTA})


@login_required
def save_ui_hist(request):
    status = 200
    try:
        req = request.POST or request.GET
        hist = req['his']
        try:
            user_data = User_Data.objects.get(user_id=request.user.id)
            user_data.history = hist
            user_data.save()

        except ObjectDoesNotExist:
            user_data_dict = {'user_id': request.user.id, "history": hist}
            User_Data.objects.update_or_create(**user_data_dict)
    except Exception as e:
        logger.error("[ERROR] While trying to save the user's UI preferences:")
        logger.exception(e)
        status = 500

    return JsonResponse({}, status=status)


@login_required
def populate_tables(request):
    response = {}
    status = 200
    tableRes = []
    try:
        req = request.GET if request.GET else request.POST
        path_arr = [nstr for nstr in request.path.split('/') if nstr]
        table_type = path_arr[len(path_arr)-1]
        fields = None
        collapse_on = None
        filters = json.loads(req.get('filters', '{}'))
        offset = int(req.get('offset', '0'))
        limit = int(req.get('limit', '500'))
        if limit > settings.MAX_SOLR_RECORD_REQUEST:
            logger.warning("[WARNING] Attempt to request more than MAX_SOLR_RECORD_REQUEST! ({})".format(limit))
            limit = settings.MAX_SOLR_RECORD_REQUEST
        sort = req.get('sort', 'PatientID')
        sortdir = req.get('sortdir', 'asc')
        checkIds = json.loads(req.get('checkids', '[]'))
        #table_data = get_table_data(filters, table_type)
        diffA = []

        sources = ImagingDataCommonsVersion.objects.get(active=True).get_data_sources(
            active=True, source_type=DataSource.SOLR,
            aggregate_level="SeriesInstanceUID" if table_type == 'series' else "StudyInstanceUID"
        )

        sortByField = True
        #idsReq=[]
        custom_facets = None
        custom_facets_order = None
        if table_type == 'cases':
            custom_facets = {"per_id": {"type": "terms", "field": "PatientID", "limit": limit,
                                "facet": {"unique_study": "unique(StudyInstanceUID)",
                                          "unique_series": "unique(SeriesInstanceUID)"}}
                            }
            tableIndex = 'PatientID'
            fields = ['collection_id', 'PatientID','access']
            facetfields=['unique_study', 'unique_series']

            if sort == 'collection_id':
                sortByField = True
                sort_arg = 'collection_id '+sortdir

            elif sort == 'PatientID':
                sort_arg = 'PatientID ' + sortdir

            elif sort == 'StudyInstanceUID':
                sortByField = False
                sort_arg = 'unique_study ' + sortdir
                custom_facets_order = {
                    "tot": "unique(PatientID)",
                    "per_id": {
                        "type": "terms",
                        "field": "PatientID",
                        "sort": sort_arg,
                        "offset": offset,
                        "limit": limit,
                        "facet": {
                            "unique_study": "unique(StudyInstanceUID)",
                            "unique_series": "unique(SeriesInstanceUID)"
                        }
                    }
                }
            elif sort == 'SeriesInstanceUID':
                sortByField=False
                sort_arg = 'unique_series '+sortdir
                custom_facets_order = {
                    "tot": "unique(PatientID)",
                    "per_id": {
                        "type": "terms", "field": "PatientID", "sort": sort_arg, "offset": offset, "limit": limit,
                        "facet": {
                            "unique_study": "unique(StudyInstanceUID)",
                            "unique_series": "unique(SeriesInstanceUID)"
                        }
                    }
                }

        if table_type == 'studies':
            custom_facets = {"per_id": {"type": "terms", "field": "StudyInstanceUID", "limit": limit,
                                        "facet": {"unique_series": "unique(SeriesInstanceUID)"}}
                             }
            tableIndex = 'StudyInstanceUID'
            fields = ['collection_id','PatientID','StudyInstanceUID','StudyDescription','Modality','StudyDate','access']
            facetfields = ['unique_series']
            sort_arg = 'PatientID asc, StudyDate asc'

            if sort in ['PatientID','StudyInstanceUID', 'StudyDescription', 'StudyDate']:
                sortByField = True
                sort_arg = "{} {}".format(sort, sortdir)
                if sort == 'PatientID':
                    sort_arg = sort_arg+', StudyDate asc'
                #elif sort == 'StudyInstanceUID':
                #    sort_arg = sort_arg + 'StudyDate asc'
            elif sort == 'SeriesInstanceUID':
                sortByField = False
                sort_arg = 'unique_series '+sortdir

                custom_facets_order = {"tot": "unique(SeriesInstanceUID)",
                                       "per_id": {"type": "terms", "field": "StudyInstanceUID",
                                                  "sort": sort_arg,"offset": offset, "limit": limit,
                                                  "facet": {"unique_series": "unique(SeriesInstanceUID)"}
                                                  }
                                       }

        if table_type == 'series':
            custom_facets = {}
            tableIndex = 'SeriesInstanceUID'
            fields = ['collection_id', 'SeriesInstanceUID', 'StudyInstanceUID', 'SeriesDescription', 'SeriesNumber',
                      'BodyPartExamined', 'Modality', 'access']
            facetfields = []
            sortByField = True

            sort_arg = 'StudyInstanceUID asc, SeriesNumber asc' if not sort else "{} {}, SeriesNumber asc".format(
                sort, sortdir
            )

            if sort == 'SeriesDescription':
                custom_facets_order = {}

        order = {}
        curInd = 0
        idsFilt = []

        # check that any selected ids are still valid after the filter is updated. ids that are not longer valid are
        # then deselected on the front end
        if len(checkIds)>0:
            selFilters=copy.deepcopy(filters)
            selFilters[tableIndex] = checkIds
            newCheckIds = get_collex_metadata(
                selFilters, [tableIndex], record_limit=len(checkIds)+1,sources=sources, records_only=True,
                collapse_on=tableIndex, counts_only=False, filtered_needed=False, sort=tableIndex+' asc'
            )

            nset = set([x[tableIndex] for x in newCheckIds['docs']])
            diffA = [x for x in checkIds if x not in nset]

        if sortByField:
            idsReq = get_collex_metadata(
                filters, fields, record_limit=limit, sources=sources, offset=offset, records_only=True,
                collapse_on=tableIndex, counts_only=False, filtered_needed=False, sort=sort_arg
            )

            cnt = idsReq['total']
            for rec in idsReq['docs']:
                id = rec[tableIndex]
                idsFilt.append(id)
                order[id] = curInd
                newRow = {}
                for field in fields:
                    if field in rec:
                        newRow[field] = rec[field]
                    else:
                        newRow[field] = ''
                tableRes.append(newRow)
                curInd = curInd + 1
            filters[tableIndex]=idsFilt
            if not table_type == 'series':
                cntRecs = get_collex_metadata(
                    filters, fields, record_limit=limit, sources=sources, collapse_on=tableIndex, counts_only=True,
                    records_only=False, filtered_needed=False, custom_facets=custom_facets, raw_format=True
                )

                for rec in cntRecs['facets']['per_id']['buckets']:
                    id = rec['val']
                    tableRow = tableRes[order[id]]
                    for facet in facetfields:
                        if facet in rec:
                            tableRow[facet] = rec[facet]
                        else:
                            tableRow[facet] = 0
        else:
            idsReq = get_collex_metadata(
                filters, fields, record_limit=limit, sources=sources, offset=offset, records_only=False,
                collapse_on=tableIndex, counts_only=True, filtered_needed=False, custom_facets=custom_facets_order,
                raw_format=True
            )
            cnt = idsReq['facets']['tot']
            for rec in idsReq['facets']['per_id']['buckets']:
                id = rec['val']
                idsFilt.append(id)
                order[id] = curInd
                newRow = {tableIndex: id}
                for facet in facetfields:
                    if facet in rec:
                        newRow[facet]=rec[facet]
                    else:
                        newRow[facet] = 0
                tableRes.append(newRow)
                curInd = curInd + 1
            filters[tableIndex] = idsFilt
            fieldRecs = get_collex_metadata(
                filters, fields, record_limit=limit, sources=sources, records_only=True, collapse_on=tableIndex,
                counts_only=False, filtered_needed=False
            )
            for rec in fieldRecs['docs']:
                id = rec[tableIndex]
                tableRow = tableRes[order[id]]
                for field in fields:
                    if not field == tableIndex:
                        if field in rec:
                            tableRow[field] = rec[field]
                        else:
                            tableRow[field] = ''

        response["res"] = tableRes
        response["cnt"] = cnt
        response["diff"] = diffA

    except Exception as e:
        logger.error("[ERROR] While attempting to populate the table:")
        logger.exception(e)
        messages.error(
           request,
           "Encountered an error when attempting to populate the page - please contact the administrator."
        )
        status = 400

    return JsonResponse(response, status=status)


# Data exploration and cohort creation page
@login_required
def explore_data_page(request, filter_path=False, path_filters=None):
    context = {'request': request}
    is_json = False
    wcohort = False
    status = 200

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
        if len(Attribute.objects.filter(name=collapse_on)) <= 0:
            logger.error("[ERROR] Attempt to collapse on an invalid field: {}".format(collapse_on))
            collapse_on='SeriesInstanceUID'
        is_json = (req.get('is_json', "False").lower() == "true")
        uniques = json.loads(req.get('uniques', '[]'))
        totals = json.loads(req.get('totals', '[]'))

        cohort_id = int(req.get('cohort_id', '-1'))

        cohort_filters = {}
        if cohort_id > 0:
            cohort = Cohort.objects.get(id=cohort_id, active=True)
            cohort.perm = cohort.get_perm(request)
            if cohort.perm:
                wcohort = True
                cohort_filters_dict = cohort.get_filters_as_dict()
                cohort_filters_list = cohort_filters_dict[0]['filters']
                for cohort in cohort_filters_list:
                    cohort_filters[cohort['name']] = cohort['values']
        if filter_path and is_json:
            filters = path_filters

        if wcohort and is_json:
            filters = cohort_filters

        context = build_explorer_context(
            is_dicofdic, source, versions, filters, fields, order_docs, counts_only, with_related, with_derived,
            collapse_on, is_json, uniques=uniques, totals=totals
        )

        if not is_json:
            # These are filters to be loaded *after* a page render
            if wcohort:
                context['filters_for_load'] = cohort_filters_dict
            elif filter_path:
                context['filters_for_load'] = path_filters
            else:
                filters_for_load = req.get('filters_for_load', None)
                if filters_for_load:
                    blacklist = re.compile(settings.BLACKLIST_RE, re.UNICODE)
                    if blacklist.search(filters_for_load):
                        logger.warning("[WARNING] Saw bad filters in filters_for_load:")
                        logger.warning(filters_for_load)
                        filters_for_load = {}
                        messages.error(
                            request,
                            "There was a problem with some of your filters - please ensure they're properly formatted."
                        )
                        status = 400
                    else:
                        filters_for_load = json.loads(filters_for_load)
                else:
                    filters_for_load = [{"filters": [{
                        "id": Attribute.objects.get(name="access").id,
                        "values": ["Public"]
                    }]}]
                context['filters_for_load'] = filters_for_load

            request.session['fav'] = 'temp'
            context['hist'] = ''
            try:
                user_data = User_Data.objects.get(user_id=request.user.id)
                context['history'] = json.loads(user_data.history)
            except ObjectDoesNotExist:
                pass

    except JSONDecodeError as e:
        logger.error("[ERROR] While attempting to load the search page:")
        logger.error("Invalid JSON format received.")
        logger.exception(e)
        messages.error(
            request,
            "The filters supplied contained invalid JSON."
        )
        status = 400
    except Exception as e:
        logger.error("[ERROR] While attempting to load the search page:")
        logger.exception(e)
        messages.error(
            request,
            "Encountered an error when attempting to load the page - please contact the administrator."
        )
        status = 500

    if is_json:
        # In the case of is_json=True, the 'context' is simply attr_by_source
        return JsonResponse(context, status=status)

    return render(request, 'idc/explore.html', context)


def parse_explore_filters(request):
    try:
        if not request.GET:
            raise Exception("This call only supports GET!")
        raw_filters = {x: request.GET.getlist(x) for x in request.GET.keys()}
        filters = {}
        filter_ops = {}
        for x in raw_filters:
            if re.search('_op', x):
                filter_ops[x[:x.rfind('_')]] = raw_filters[x][0]
            else:
                filters[x] = raw_filters[x]
        # determine if any of the filters are misnamed
        filter_name_map = {(x[:x.rfind('_')] if re.search('_[gl]te?|_e?btwe?', x) else x): x for x in filters.keys()}
        attr_names = filter_name_map.keys()
        attrs = Attribute.objects.filter(name__in=attr_names)
        attr_map = {x.name: {"id": x.id, "filter": filter_name_map[x.name]} for x in attrs}
        not_found = [x for x in attr_names if x not in attr_map.keys()]
        if len(not_found) > 0:
            not_rec = "{}".format("; ".join(not_found))
            logger.warning("[WARNING] Saw invalid filters while parsing explore/filters call:")
            logger.warning(not_rec)
            messages.warning(request, "The following attribute names are not recognized: {}".format(not_rec))
        else:
            blacklist = re.compile(settings.BLACKLIST_RE, re.UNICODE)
            if blacklist.search(str(filters)):
                logger.warning("[WARNING] Saw bad filters in filters_for_load:")
                logger.warning(filters)
                messages.error(
                    request,
                    "There was a problem with some of your filters - please ensure they're properly formatted."
                )
            else:
                if len(attrs) > 0:
                    filters = [{
                        "id": attr_map[x]['id'],
                        "values": filters[attr_map[x]['filter']],
                        "op": filter_ops.get(x, 'OR')
                    } for x in attr_map]
                    return explore_data_page(request, filter_path=True, path_filters=[{"filters": filters}])

    except Exception as e:
        logger.error("[ERROR] While parsing filters for the explorer page:")
        logger.exception(e)

    return redirect(reverse('explore_data'))


# Callback for recording the user's agreement to the warning popup
def warn_page(request):
    request.session['seenWarning'] = True;
    return JsonResponse({'warning_status': 'SEEN'}, status=200)


# About page
def about_page(request):
    return render(request, 'idc/about.html', {'request': request})


# User dashboard, where saved cohorts (and, in the future, uploaded/indexed data) are listed
@login_required
def dashboard_page(request):
    context = {'request': request}

    try:
        # Cohort List
        cohort_perms = list(set(Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)))
        # TODO: Add in 'date created' and sort on that
        context['cohorts'] = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-name')

    except Exception as e:
        logger.error("[ERROR] While attempting to load the dashboard:")
        logger.exception(e)

    return render(request, 'idc/dashboard.html', context)
