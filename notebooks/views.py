"""
Copyright 2019, Institute for Systems Biology

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

# from copy import deepcopy
# import json
# import re
# import sys
import logging
import json
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
# from django.contrib.auth.models import User
from django.contrib import messages
# from django.http import StreamingHttpResponse
# from bq_data_access.v1.feature_search.util import SearchableFieldHelper
# from bq_data_access.v2.feature_search.util import SearchableFieldHelper as SearchableFieldHelper_v2
from django.http import HttpResponse, JsonResponse
from models import Notebook
# from variables.models import VariableFavorite, Variable
# from genes.models import GeneFavorite
# from analysis.models import Analysis
# from projects.models import Program
# from sharing.service import create_share
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from urllib2 import *

# from django.utils.html import escape

logger = logging.getLogger('main_logger')

debug = settings.DEBUG
BLACKLIST_RE = settings.BLACKLIST_RE
SOLR_URL = settings.SOLR_URL

@login_required
def notebook_list(request):
    template = 'notebooks/notebook_list.html'
    command = request.path.rsplit('/', 1)[1]
    # notebooks = None
    is_public = (command == "public")

    if is_public:
        # if request.method == "POST":
        #     notebook_keywords = request.POST.get('nb-keywords')[0:2000]
        #     if notebook_keywords:
                # connection = urlopen('https://google.com')
                # solr_nb_search_url = SOLR_URL+'notebooks/select?wt=python&q='+notebook_keywords
                # try:
                #     # urlopen(solr_nb_search_url)
                #     # connection = url_open(solr_nb_search_url)
                #
                # except Exception as e:
                #     logger.error("[ERROR] Exception when viewing a notebook: ")
                #     logger.exception(e)
                #     messages.error(request, "An error was encountered while trying to view this notebook.")
                # finally:
                #     redirect_url = reverse('notebooks')
                #     return redirect(redirect_url)

                # response = json.load(connection)
                # print response['response']['numFound'], "documents found."

                # Print the name of each document.

                # for document in response['response']['docs']:
                #     print "  Name =", document['name']
        # sharedNotebooks = Notebook.objects.filter(shared__matched_user=request.user, shared__active=True,
        #                                           active=True)

        notebooks = Notebook.objects.filter(is_public=True, active=True)
    else:
        userNotebooks = request.user.notebook_set.all()
        notebooks = userNotebooks.distinct()

    return render(request, template, {'is_public' : is_public, 'notebooks': notebooks})

@login_required
def notebook(request, notebook_id=0):
    template = 'notebooks/notebook.html'
    command = request.path.rsplit('/', 1)[1]
    notebook_model = None

    try:

        if request.method == "POST":
            if command == "create":
                notebook_model = Notebook.createDefault(name="Untitled Notebook", description="", user=request.user)
            elif command == "edit":
                # Truncate incoming name and desc fields in case someone tried to send ones which were too long
                notebook_name = request.POST.get('name')[0:2000]
                notebook_keywords = request.POST.get('keywords')[0:2000]
                notebook_desc = request.POST.get('description')[0:2000]
                notebook_file_path = request.POST.get('file_path')[0:2000]



                blacklist = re.compile(BLACKLIST_RE, re.UNICODE)
                match_name = blacklist.search(unicode(notebook_name))
                match_keywords = blacklist.search(unicode(notebook_keywords))
                match_desc = blacklist.search(unicode(notebook_desc))

                if match_name or match_desc or match_keywords:
                    # XSS risk, log and fail this cohort save
                    match_list = []
                    field_names = ""

                    if match_name:
                        match_list.append('name')
                    if match_desc:
                        match_list.append('description')
                    if match_keywords:
                        match_list.append('keywords field')
                    match_list_len = len(match_list)
                    for i in range(match_list_len):
                        field_names += ('' if i == 0 else (' and ' if i == (match_list_len - 1) else ', ') + match_list[i])
                    err_msg = "Your notebook's %s contain%s invalid characters; please revise your inputs" % (field_names, ('s' if match_list_len < 2 else ''))
                    messages.error(request, err_msg)
                    redirect_url = reverse('notebook_detail', kwargs={'notebook_id': notebook_id})
                    return redirect(redirect_url)

                notebook_model = Notebook.edit(id=notebook_id, name=notebook_name, keywords=notebook_keywords, description=notebook_desc, file_path=notebook_file_path)
            elif command == "copy":
                notebook_model = Notebook.copy(id=notebook_id, user=request.user)
            elif command == "delete":
                Notebook.destroy(id=notebook_id)

            if command == "delete":
                redirect_url = reverse('notebooks')
            else:
                redirect_url = reverse('notebook_detail', kwargs={'notebook_id': notebook_model.id})

            return redirect(redirect_url)

        elif request.method == "GET":
            if notebook_id:
                try:
                    ownedNotebooks = request.user.notebook_set.filter(active=True)
                    # publicNotebooks = Notebook.objects.filter(is_public=True, active=True)
                    notebooks = ownedNotebooks
                                # | publicNotebooks
                    notebooks = notebooks.distinct()
                    notebook_model = notebooks.get(id=notebook_id)
                    return render(request, template, {'notebook': notebook_model, 'notebook_viewer': settings.NOTEBOOK_VIEWER})
                except ObjectDoesNotExist:
                    redirect_url = reverse('notebooks')
                    return redirect(redirect_url)
            else:
                redirect_url = reverse('notebooks')
                return redirect(redirect_url)

    except Exception as e:
        logger.error("[ERROR] Exception when viewing a notebook: ")
        logger.exception(e)
        messages.error(request, "An error was encountered while trying to view this notebook.")
    finally:
        redirect_url = reverse('notebooks')

    return redirect(redirect_url)


# @login_required
# def notebook_share(request, notebook_id=0):
#     status = None
#     result = None
#
#     try:
#         emails = re.split('\s*,\s*', request.POST['share_users'].strip())
#         users_not_found = []
#         # req_user = None
#
#         try:
#             req_user = User.objects.get(id=request.user.id)
#         except ObjectDoesNotExist as e:
#             raise Exception("{} is not a user ID in this database!".format(str(request.user.id)))
#
#         notebook_to_share = request.user.notebook_set.get(id=notebook_id, active=True)
#
#         if notebook_to_share.owner.id != req_user.id:
#             raise Exception(" {} is not the owner of this notebook!".format(req_user.email))
#
#         for email in emails:
#             try:
#                 User.objects.get(email=email)
#             except ObjectDoesNotExist as e:
#                 users_not_found.append(email)
#
#         if len(users_not_found) > 0:
#             status = 'error'
#             result = {
#                 'msg': 'The following user emails could not be found; please ask them to log into the site first: ' + ", ".join(
#                     users_not_found)
#             }
#         else:
#             create_share(request, notebook_to_share, emails, 'Notebook')
#             status = 'success'
#
#     except Exception as e:
#         logger.error("[ERROR] While trying to share a notebook:")
#         logger.exception(e)
#         status = 'error'
#         result = {
#             'msg': 'There was an error while attempting to share this notebook.'
#         }
#     finally:
#         if not status:
#             status = 'error'
#             result = {
#                 'msg': 'An unknown error has occurred while sharing this notebook.'
#             }
#
#     return JsonResponse({
#         'status': status,
#         'result': result
#     })

