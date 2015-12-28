from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.views.decorators.csrf import csrf_protect
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from models import GeneFavorite
from django.contrib.auth.models import User
from django.conf import settings

GENES_FAVS = [{
            'id': 1,
            'name': 'BRCA1',
            'genes': ['BRCA1'],
            'last_updated': '10/15/2015'
        }, {
            'id': 2,
            'name': 'ATK Pathway',
            'genes': ['PTEN', 'PIK3CA', 'AKT', 'MTOR'],
            'last_updated': '10/15/2015'
        }]

@login_required
def gene_fav_list(request):
    template = 'genes/genes_list.html'

    gene_list = GeneFavorite.get_list(request.user)

    return render(request, template, {'genes_favs': gene_list})

@login_required
def gene_fav_detail(request, gene_fav_id):
    template = 'genes/genes_detail.html'
    context = {}

    try:
        # Find the gene favorite objects
        for genes_fav in GENES_FAVS:
            if genes_fav['id'] == int(gene_fav_id):
                context['genes_detail'] = genes_fav
    except ObjectDoesNotExist:
        # Cohort doesn't exist, return to user landing with error.
        messages.error(request, 'The genes favorite you were looking for does not exist.')
        return redirect('genes_list')

    return render(request, template, context)

@login_required
def gene_fav_edit(request, gene_fav_id=0):
    template = 'genes/genes_edit.html'
    context = {
        'genes_id': gene_fav_id,
        'genes_detail': '',
    }

    if(gene_fav_id != 0):
        try:
            # Find the gene favorite objects
            for genes_fav in GENES_FAVS:
                if genes_fav['id'] == int(gene_fav_id):
                    context['genes_detail'] = genes_fav
        except ObjectDoesNotExist:
            messages.error(request, 'The genes favorite you were looking for does not exist.')
            return redirect('genes_list')
    return render(request, template, context)

def gene_fav_delete(request, gene_fav_id):
    template = 'genes/genes_upload.html'
    context = {
        'genes_id': gene_fav_id,
        'genes_detail': '',
    }


    return render(request, template, context)

@login_required
def gene_fav_save(request, genes_id=0):
    template = 'genes/genes_upload.html'
    context = {
        'genes_id': gene_fav_id,
        'genes_detail': '',
    }


    return render(request, template, context)

@login_required
def gene_fav_upload(request, genes_id=0):
    template = 'genes/genes_upload.html'
    context = {
        'genes_id': genes_id,
        'genes_detail': '',
    }


    return render(request, template, context)

@login_required
def gene_select_for_existing_workbook(request, workbook_id=0, worksheet_id=0):
    template = 'genes/genes_upload.html'
    context = {
        'genes_id': genes_id,
        'genes_detail': '',
    }


    return render(request, template, context)

@login_required
def gene_select_for_new_workbook(request):
    template = 'genes/genes_upload.html'
    context = {
        'genes_id': genes_id,
        'genes_detail': '',
    }


    return render(request, template, context)