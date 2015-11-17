from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings

@login_required
def genes_list(request):
    template = 'genes/genes_list.html'
    context = {}
    return render(request, template, context)

@login_required
def genes_detail(request, genes_id=0):
    # """ if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name """
    template = 'genes/genes_detail.html'
    context = {}
    return render(request, template, context)

@login_required
def genes_upload(request):
    template = 'genes/genes_upload.html'
    context = {}
    return render(request, template, context)

@login_required
def create_genes_list(request):
    template = 'genes/genes_edit.html'
    context = {}
    return render(request, template, context)

@login_required
def edit_genes_list(request):
    template = 'genes/genes_edit.html'
    context = {}
    return render(request, template, context)