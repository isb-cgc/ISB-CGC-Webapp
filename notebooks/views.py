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

import re
import logging
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .models import Notebook, Notebook_Added
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
# from urllib.request import urlopen

logger = logging.getLogger('main_logger')

debug = settings.DEBUG
BLACKLIST_RE = settings.BLACKLIST_RE
SOLR_URL = settings.SOLR_URL

@login_required
def notebook_list(request):
    template = 'notebooks/notebook_list.html'
    command = request.path.rsplit('/', 1)[1]
    notebooks = None
    is_public_list = (command == "public")

    if is_public_list:
        if request.method == "POST":
            notebook_keywords = request.POST.get('nb-keywords')[0:2000]
            # print(notebook_keywords)
            if notebook_keywords:
                result_ids = [4, 7]
                notebooks = Notebook.objects.filter(is_public=True, active=True, pk__in=result_ids)


                # solr_nb_search_url = SOLR_URL+'notebooks/select?wt=json&q='+notebook_keywords
                # try:
                #     r = requests.post(solr_nb_search_url)
                #     # connection = urlopen('https://google.com')
                #     # connection = urlopen(solr_nb_search_url)
                #     # connection = url_open(solr_nb_search_url)
                #
                # except Exception as e:
                #     logger.error("[ERROR] Exception when viewing a notebook: ")
                #     logger.exception(e)
                #     messages.error(request, "An error was encountered while trying to view this notebook.")
                # finally:
                #     redirect_url = reverse('notebooks_public')
                #     return redirect(redirect_url)


                # response = json.load(connection)
                # print (response['response']['numFound'], "documents found.")

                # Print the name of each document.

                # for document in response['response']['docs']:
                #     print "  Name =", document['name']
        # sharedNotebooks = Notebook.objects.filter(shared__matched_user=request.user, shared__active=True,
        #                                           active=True)
        if not notebooks:
            notebooks = Notebook.objects.filter(is_public=True, active=True)
    else:
        user_notebooks = request.user.notebook_set.filter(active=True)
        added_public_notebook_ids = Notebook_Added.objects.filter(user=request.user).values_list('notebook', flat=True)
        shared_notebooks = Notebook.objects.filter(is_public=True, active=True, pk__in=added_public_notebook_ids)
        notebooks = user_notebooks | shared_notebooks
        notebooks = notebooks.distinct()

    return render(request, template, {'is_public_list' : is_public_list, 'notebooks': notebooks})

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
            elif command == "add":
                notebook_model = Notebook.objects.get(id=notebook_id)
                if not notebook_model.is_public:
                    messages.error(request, 'Notebook <b>{}</b> is a privately listed notebook - Unable to add this notebook to your list.'.format(
                            notebook_model.name))
                elif notebook_model.isin_notebooklist(user=request.user):
                    messages.error(request,
                        'Notebook <b>{}</b> is already in your notebook list.'.format(
                            notebook_model.name))
                else:
                    Notebook.add(id=notebook_id, user=request.user)
                    messages.info(request, 'Notebook <b>{}</b> is added to your notebook list.'.format(
                            notebook_model.name))
            elif command == "remove":
                notebook_model = Notebook.objects.get(id=notebook_id)
                nb_name = notebook_model.name
                Notebook.remove(id=notebook_id, user=request.user)
                messages.info(request, 'Notebook <b>{}</b> is removed from your notebook list.'.format(
                    nb_name))

            if command == "delete" or command == "remove":
                redirect_url = reverse('notebooks')
            else:
                redirect_url = reverse('notebook_detail', kwargs={'notebook_id': notebook_model.id})

            return redirect(redirect_url)

        elif request.method == "GET":
            redirect_view = 'notebooks' + ('_public' if command == "public" else '')
            if notebook_id:
                try:
                    if command == "public":
                        notebooks = Notebook.objects.filter(is_public=True, active=True)
                    else:
                        user_notebooks = request.user.notebook_set.filter(active=True)
                        added_public_notebook_ids = Notebook_Added.objects.filter(user=request.user).values_list(
                            'notebook', flat=True)
                        shared_notebooks = Notebook.objects.filter(is_public=True, active=True, pk__in=added_public_notebook_ids)
                        notebooks = user_notebooks | shared_notebooks
                        notebooks = notebooks.distinct()

                    notebook_model = notebooks.get(id=notebook_id)
                    return render(request, template, {'notebook': notebook_model, 'from_public_list': command == "public", 'notebook_viewer': settings.NOTEBOOK_VIEWER})
                except ObjectDoesNotExist:
                    redirect_url = reverse(redirect_view)
                    return redirect(redirect_url)
            else:
                redirect_url = reverse(redirect_view)
                return redirect(redirect_url)

    except Exception as e:
        logger.error("[ERROR] Exception when viewing a notebook: ")
        logger.exception(e)
        messages.error(request, "An error was encountered while trying to view this notebook.")
    finally:
        redirect_url = reverse('notebooks')

    return redirect(redirect_url)
