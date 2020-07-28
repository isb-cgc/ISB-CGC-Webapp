# from __future__ import absolute_import
# import django
# import sys
# import json
# from django.shortcuts import render
# from django.contrib.auth.decorators import login_required
# from django.conf import settings
# from django.urls import reverse
# from workbooks.models import Workbook, Worksheet, Worksheet_plot
# from django.utils.html import escape
# from google_helpers.bigquery.cohort_support import BigQuerySupport
# from google_helpers.bigquery.cohort_support import BigQueryCohortSupport
# from google_helpers.bigquery.export_support import BigQueryExportCohort, BigQueryExportFileList
#
#
# from .models import Cohort_Perms
#
#
# from django.core import serializers
# from django.contrib.auth.models import User as Django_User
# from django.contrib.auth.models import User, AnonymousUser
#
# # Create your views here.
# from pip._internal.utils import logging
#
# debug = settings.DEBUG # RO global for this file
# logger = logging.getLogger('main_logger')
#
# @login_required
# def cohorts_compare_list(request, is_public=False, workbook_id=0, worksheet_id=0, create_workbook=False):
#     if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)
#
#     # check to see if user has read access to 'All TCGA Data' cohort
#     isb_superuser = User.objects.get(is_staff=True, is_superuser=True, is_active=True)
#     superuser_perm = Cohort_Perms.objects.get(user=isb_superuser)
#     user_all_data_perm = Cohort_Perms.objects.filter(user=request.user, cohort=superuser_perm.cohort)
#     if not user_all_data_perm:
#         Cohort_Perms.objects.create(user=request.user, cohort=superuser_perm.cohort, perm=Cohort_Perms.READER)
#
#     # add_data_cohort = Cohort.objects.filter(name='All TCGA Data')
#
#     users = User.objects.filter(is_superuser=0)
#     cohort_perms = Cohort_Perms.objects.filter(user=request.user).values_list('cohort', flat=True)
#     cohorts = Cohort.objects.filter(id__in=cohort_perms, active=True).order_by('-last_date_saved')
#
#     cohorts.has_private_cohorts = False
#     shared_users = {}
#
#     for item in cohorts:
#         item.perm = item.get_perm(request).get_perm_display()
#         item.owner = item.get_owner()
#         shared_with_ids = Cohort_Perms.objects.filter(cohort=item, perm=Cohort_Perms.READER).values_list('user',
#                                                                                                          flat=True)
#         item.shared_with_users = User.objects.filter(id__in=shared_with_ids)
#         if not item.owner.is_superuser:
#             cohorts.has_private_cohorts = True
#             # if it is not a public cohort and it has been shared with other users
#             # append the list of shared users to the shared_users array
#             if item.shared_with_users and item.owner.id == request.user.id:
#                 shared_users[int(item.id)] = serializers.serialize('json', item.shared_with_users,
#                                                                    fields=('last_name', 'first_name', 'email'))
#
#     # Used for autocomplete listing
#     cohort_id_names = Cohort.objects.filter(id__in=cohort_perms, active=True).values('id', 'name')
#     cohort_listing = []
#     for cohort in cohort_id_names:
#         cohort_listing.append({
#             'value': int(cohort['id']),
#             'label': escape(cohort['name'])
#         })
#     workbook = None
#     worksheet = None
#     previously_selected_cohort_ids = []
#     if workbook_id != 0:
#         workbook = Workbook.objects.get(owner=request.user, id=workbook_id)
#         worksheet = workbook.worksheet_set.get(id=worksheet_id)
#         worksheet_cohorts = worksheet.worksheet_cohort_set.all()
#         for wc in worksheet_cohorts:
#             previously_selected_cohort_ids.append(wc.cohort_id)
#
#     return render(request, 'cohorts/cohort_list.html', {'request': request,
#                                                         'cohorts': cohorts,
#                                                         'user_list': users,
#                                                         'cohorts_listing': cohort_listing,
#                                                         'shared_users': json.dumps(shared_users),
#                                                         'base_url': settings.BASE_URL,
#                                                         'base_api_url': settings.BASE_API_URL,
#                                                         'is_public': is_public,
#                                                         'workbook': workbook,
#                                                         'worksheet': worksheet,
#                                                         'previously_selected_cohort_ids': previously_selected_cohort_ids,
#                                                         'create_workbook': create_workbook,
#                                                         'from_workbook': bool(workbook),
#                                                         })
#
#     #return 0;

#import django
from django.shortcuts import render
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
import json
from cohorts.models import Cohort
from json.decoder import JSONDecodeError


def compare_cohorts(request, cohort_id_1=1, cohort_id_2=2):
    return render(request, 'comparison/compare_cohorts.html')


@login_required
def compare_validate_cohorts(request):
    body_unicode = request.body.decode('utf-8')
    body = json.loads(body_unicode)
    sel_cohort_ids = body['sel_cohort_ids']
    if len(sel_cohort_ids) == 2:

        cohort1 = Cohort.objects.get(id=sel_cohort_ids[0], active=True)
        cohort2 = Cohort.objects.get(id=sel_cohort_ids[1], active=True)

        if cohort1 is None or cohort2 is None:
            result = {'error': 'parameters are not correct'}

        else:
            result = {'first': sel_cohort_ids[0], 'second': sel_cohort_ids[1]}
    else:
        result = {'error': 'parameters are not correct'}

    return HttpResponse(json.dumps(result), status=200)
