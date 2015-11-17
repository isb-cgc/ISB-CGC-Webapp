from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings

@login_required
def project_list(request):
    template = 'projects/project_list.html'
    context = {}
    return render(request, template, context)

@login_required
def project_detail(request, project_id=0):
    # """ if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name """
    template = 'projects/project_detail.html'
    context = {}
    return render(request, template, context)

@login_required
def project_upload(request):
    template = 'projects/project_upload.html'
    context = {}
    return render(request, template, context)