from __future__ import absolute_import
from builtins import str
import json
import logging
import re

from django.conf import settings
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ObjectDoesNotExist
from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.utils.safestring import mark_safe
from .models import GeneFavorite, GeneSymbol
from workbooks.models import Workbook, Worksheet

BLACKLIST_RE = settings.BLACKLIST_RE

logger = logging.getLogger('main_logger')

# validates whether each gene is a list of gene symbols are known gene symbols
# returns a json object keyed on each gene symbol with values of whether or not they are valid
@login_required
def check_gene_list_validity(request):
    gene_list = json.loads(request.body)['genes-list']
    response = {}
    response['results'] = {}
    for gene in gene_list:
        response['results'][gene] = GeneSymbol.is_gene_valid(gene)

    return HttpResponse(json.dumps(response), status=200)

# based on input entered, return a list of gene symbol suggestions
# returns a json array of gene symbol suggestions
@login_required
def suggest_gene_symbols(request, string):
    response = GeneSymbol.suggest_symbol(string)
    result = []
    for obj in response :
        result.append({'value' : obj['symbol']})

    return HttpResponse(json.dumps(result), status=200)

@login_required
def gene_fav_list_for_new_workbook(request):
    return gene_fav_list(request=request, new_workbook=True)

@login_required
def gene_fav_list(request, workbook_id=0, worksheet_id=0, new_workbook=0):
    template = 'genes/genes_list.html'
    context  = {}

    gene_list = GeneFavorite.get_list(request.user)
    if len(gene_list) == 0 :
        gene_list = None
    context['gene_fav_list']=gene_list

    if workbook_id != 0 :
        try:
            workbook_model = Workbook.objects.get(id=workbook_id)
            context['workbook'] = workbook_model
            worksheet_model = Worksheet.objects.get(id=worksheet_id)
            context['worksheet'] = worksheet_model
            context['base_url']  = settings.BASE_URL

            template = 'genes/genes_select.html'
            if not gene_list :
                context['genes'] = []

        except ObjectDoesNotExist:
            messages.error(request, 'The workbook and worksheet you were referencing does not exist.')
            return redirect('genes')
    elif new_workbook :
        context['new_workbook'] = True
        if gene_list :
            template = 'genes/genes_select.html'
        else :
            template = 'genes/genes_edit.html'
            context['genes'] = []
            context['base_url'] = settings.BASE_URL

    return render(request, template, context)


@login_required
def gene_fav_detail_for_new_workbook(request, gene_fav_id):
    return gene_fav_detail(request=request, gene_fav_id=gene_fav_id, new_workbook=True)


@login_required
def gene_fav_detail(request, gene_fav_id, workbook_id=0, worksheet_id=0, new_workbook=0):
    template = 'genes/genes_detail.html'
    context = {}
    context['base_url'] = settings.BASE_URL
    if new_workbook :
        context['new_workbook'] = True

    if workbook_id :
        try:
            workbook_model = Workbook.objects.get(id=workbook_id)
            context['workbook'] = workbook_model
            worksheet_model = Worksheet.objects.get(id=worksheet_id)
            context['worksheet'] = worksheet_model
        except ObjectDoesNotExist:
            messages.error(request, 'The workbook you were referencing does not exist.')
            return redirect('genes')
    try:
        gene_favorite_model = GeneFavorite.objects.get(id=gene_fav_id, user=request.user)
        gene_favorite_model.genes = gene_favorite_model.get_genes()
        context['gene_favorite'] = gene_favorite_model
        gene_favorite_model.mark_viewed(request)
    except ObjectDoesNotExist:
        messages.error(request, 'The genes favorite you were looking for does not exist.')
        return redirect('genes')

    return render(request, template, context)


@login_required
def gene_fav_edit_for_new_workbook(request):
    return gene_fav_edit(request=request, new_workbook=True)


@login_required
def gene_fav_edit(request, gene_fav_id=0, workbook_id=0, worksheet_id=0, new_workbook=0):
    template = 'genes/genes_edit.html'
    context = {'genes' : [] }
    context['base_url'] = settings.BASE_URL

    if new_workbook :
        context['new_workbook'] = True

    if workbook_id != 0:
        try:
            workbook_model = Workbook.objects.get(id=workbook_id)
            context['workbook'] = workbook_model
            worksheet_model = Worksheet.objects.get(id=worksheet_id)
            context['worksheet'] = worksheet_model
        except ObjectDoesNotExist:
            messages.error(request, 'The workbook you were referencing does not exist.')
            return redirect('genes')

    if gene_fav_id != 0:
        try:
            gene_favorite_model = GeneFavorite.objects.get(id=gene_fav_id)
            context['gene_favorite'] = gene_favorite_model
            gene_list = gene_favorite_model.get_genes()
            gene_names = []
            for g in gene_list:
                gene_names.append(g.name)
            context['genes'] = mark_safe(json.dumps(gene_names))
        except ObjectDoesNotExist:
            messages.error(request, 'The genes favorite you were looking for does not exist.')
            return redirect('genes')

    return render(request, template, context)


def gene_fav_delete(request, gene_fav_id):
    redirect_url = reverse('genes')
    if gene_fav_id :
        try:
            gene_fav_model = GeneFavorite.objects.get(id=gene_fav_id)
            if gene_fav_model.user == request.user :
                name = gene_fav_model.name
                gene_fav_model.destroy()
                messages.info(request, 'the gene favorite \"'+name+'\" has been deleted')
            else :
                messages.error(request, 'You do not have permission to update this gene favorite list')
        except ObjectDoesNotExist:
            messages.error(request, 'The gene list you want does not exist.')

    return redirect(redirect_url)


@login_required
def gene_fav_save(request, gene_fav_id=0):
    name = request.POST.get("genes-name")
    gene_list = request.POST.get("genes-list")

    gene_list = [x.strip() for x in gene_list.split(' ')]
    gene_list = list(set(gene_list))

    blacklist = re.compile(BLACKLIST_RE, re.UNICODE)
    match = blacklist.search(str(name))
    if match:
        # XSS risk, log and fail this cohort save
        match = blacklist.findall(str(name))
        logger.error('[ERROR] While saving a gene list, saw a malformed name: ' + name + ', characters: ' + str(match))
        messages.error(request, "Your gene list's name contains invalid characters; please choose another name.")
        redirect_url = reverse('genes') if not gene_fav_id else reverse('gene_fav_detail', kwargs={'gene_fav_id': gene_fav_id})
        return redirect(redirect_url)

    if gene_fav_id:
        try:
            gene_fav_model = GeneFavorite.objects.get(id=gene_fav_id)
            if gene_fav_model.user == request.user:
                gene_fav_model.name = name
                gene_fav_model.save()
                gene_fav_model.edit_list(gene_list, request.user)
                redirect_url = reverse('gene_fav_detail', kwargs={'gene_fav_id':gene_fav_id})
            else:
                messages.error(request, 'You do not have permission to update this gene favorite list')
                redirect_url = reverse('genes')
        except ObjectDoesNotExist:
            messages.error(request, 'The gene list you want does not exist.')
            redirect_url = reverse('genes')
    else:
        GeneFavorite.create(name=name, gene_list=gene_list, user=request.user)
        redirect_url = reverse('genes')

    return redirect(redirect_url)
