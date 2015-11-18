from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.conf import settings


@login_required
def workbook_list(request):
    template = 'workbooks/workbook_list.html'
    return render(request, template, {});

def workbook_samples(request):
    template = 'workbooks/workbook_samples.html'
    return render(request, template, {});

@login_required
def workbook(request, workbook_id=0):
    template = 'workbooks/workbook.html'

    workbook_data = \
        {'name': 'Test Workbook',
         'id' : 1,
         'description': "This is a test workbook and is not attached to any database structure",
         'share_count': 2,
         'owner' : {'name' : 'billy'},
         'worksheet_list' : [
             {'name' : 'test worksheet one',
              'id' : 1,
              'owner' : {'name' : 'billy'},
              'description' : 'this is a test worksheet and is not attached to any database structure',
              'gene_list' : [
                  {'name' : 'gene one'},
                  {'name' : 'gene two'},
                  {'name' : 'gene three'},
                  {'name' : 'gene four'}],
              'variable_list' : [
                  {'name' : 'variable one'},
                  {'name' : 'variable two'},
                  {'name' : 'variable three'},
                  {'name' : 'variable four'}],
             'cohort_list' : [
                  {'name' : 'cohort one'},
                  {'name' : 'cohort two'},
                  {'name' : 'cohort three'},
                  {'name' : 'cohort four'}],
             'comment_list' : [
                  {'text' : 'this is a test comment 1'},
                  {'text' : 'this is a test comment 2'},
                  {'text' : 'this is a test comment 3'},
                  {'name' : 'this is a test comment 4'}]
             },
             {'name' : 'test worksheet two',
              'id' : 2,
              'description' : 'this is a test worksheet and is not attached to any database structure',
              'owner' : {'name' : 'billy'},
              'gene_list' : [
                  {'name' : 'gene one'},
                  {'name' : 'gene two'},
                  {'name' : 'gene three'},
                  {'name' : 'gene four'}],
              'variable_list' : [
                  {'name' : 'variable one'},
                  {'name' : 'variable two'},
                  {'name' : 'variable three'},
                  {'name' : 'variable four'}],
             'cohort_list' : [
                  {'name' : 'cohort one'},
                  {'name' : 'cohort two'},
                  {'name' : 'cohort three'},
                  {'name' : 'cohort four'}],
             'comment_list' : [
                  {'text' : 'this is a test comment 1'},
                  {'text' : 'this is a test comment 2'},
                  {'text' : 'this is a test comment 3'},
                  {'name' : 'this is a test comment 4'}]
             },
             {'name' : 'test worksheet three',
              'id' : 3,
              'description' : 'this is a test worksheet and is not attached to any database structure',
              'owner' : {'name' : 'billy'},
              'gene_list' : [
                  {'name' : 'gene one'},
                  {'name' : 'gene two'},
                  {'name' : 'gene three'},
                  {'name' : 'gene four'}],
              'variable_list' : [
                  {'name' : 'variable one'},
                  {'name' : 'variable two'},
                  {'name' : 'variable three'},
                  {'name' : 'variable four'}],
             'cohort_list' : [
                  {'name' : 'cohort one'},
                  {'name' : 'cohort two'},
                  {'name' : 'cohort three'},
                  {'name' : 'cohort four'}],
             'comment_list' : [
                  {'text' : 'this is a test comment 1'},
                  {'text' : 'this is a test comment 2'},
                  {'text' : 'this is a test comment 3'},
                  {'name' : 'this is a test comment 4'}]
              }
         ]};
    return render(request, template, {'workbook' : workbook_data})

