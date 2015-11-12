from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings

def workbook_list(request):
    template = 'workbooks/workbook_list.html'
    return render(request, template, context);

@login_required
def workbook_detail(request, workbook_id=0):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    template = 'workbooks/workbook_detail.html'
    return render(request, template, {})

