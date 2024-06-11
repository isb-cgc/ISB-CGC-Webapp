from __future__ import absolute_import
from builtins import str
import json
import logging
import re

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect
from django.core.exceptions import ObjectDoesNotExist
from django.urls import reverse
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.utils.safestring import mark_safe
from .models import GeneSymbol

BLACKLIST_RE = settings.BLACKLIST_RE

logger = logging.getLogger('main_logger')

# validates whether each gene is a list of gene symbols are known gene symbols
# returns a json object keyed on each gene symbol with values of whether or not they are valid
@csrf_protect
def check_gene_list_validity(request):
    body_unicode = request.body
    if type(body_unicode) is bytes:
        body_unicode = body_unicode.decode('utf-8')
    body = json.loads(body_unicode)
    gene_list = body['genes-list']
    response = {
        'results': {}
    }
    for gene in gene_list:
        response['results'][gene] = GeneSymbol.is_gene_valid(gene)

    return HttpResponse(json.dumps(response), status=200)

# based on input entered, return a list of gene symbol suggestions
# returns a json array of gene symbol suggestions
@csrf_protect
def suggest_gene_symbols(request, string):
    response = GeneSymbol.suggest_symbol(string)
    result = []
    for obj in response :
        result.append({'value' : obj['symbol']})

    return HttpResponse(json.dumps(result), status=200)
