from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings

@login_required
def variable_fav_list(request):
    template = 'variables/variable_list.html'
    context = {}
    return render(request, template, context)

@login_required
def variable_fav_detail(request, variable_fav_id):
    # """ if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name """
    template = 'variables/variable_detail.html'
    context = {
        'variables': {
            'name': 'My Favorite Variables',
            'list': [{
                'parent': 'Gender',
                'identifier': 'Female'
            },{
                'parent': ''
            }]
        }
    }
    return render(request, template, context)

@login_required
def variable_fav_create(request):
    template = 'variables/variable_edit.html'
    context = {}
    return render(request, template, context)

@login_required
def variable_fav_edit(request, variable_fav_id):
    template = 'variables/variable_edit.html'
    context = {}
    return render(request, template, context)