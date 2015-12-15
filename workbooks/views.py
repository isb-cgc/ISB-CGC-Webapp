from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User

from django.conf import settings
from django.http import StreamingHttpResponse
from django.http import HttpResponse
from models import Cohort, Workbook, Worksheet, Worksheet_comment, Workbook_Perms

if settings.DEBUG :
    import sys

@login_required
def workbook_list(request):
    template  = 'workbooks/workbook_list.html',

    viewable_workbooks_ids = Workbook_Perms.objects.filter(user=request.user).values_list('workbook', flat=True)
    workbooks = Workbook.objects.filter(id__in=viewable_workbooks_ids).order_by('-last_date_saved')

    for workbook in workbooks:
        workbook.owner      = workbook.get_owner()
        workbook.worksheets = workbook.get_worksheets()
        workbook.shares     = workbook.get_shares()

    return render(request, template, {'workbooks' : workbooks})

def workbook_samples(request):
    template = 'workbooks/workbook_samples.html'
    return render(request, template, {});

@login_required
def workbook(request, workbook_id=0):
    template = 'workbooks/workbook.html'
    command  = request.path.rsplit('/',1)[1];

    if request.method == "POST" :
        if command == "create" :
            workbook_model = Workbook.createDefault(name="default name", description="this is the default description", user=request.user)
        elif command == "edit" :
            workbook_model = Workbook.edit(id=workbook_id, name=request.POST.get('name'), description=request.POST.get('description'))
        elif command == "share" :
            workbook_model = Workbook.share(id=workbook_id, user_array=request.POST.get('user_array'))
        elif command == "copy" :
            workbook_model = Workbook.copy(id=workbook_id, user=request.user)
        elif command == "delete" :
            Workbook.destroy(id=workbook_id)

        if(command == "delete"):
            redirect_url = reverse('workbooks')
            return redirect(redirect_url)
        else :
            redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
            return redirect(redirect_url)

    elif request.method   == "GET" :
        workbook            = Workbook.objects.get(id=workbook_id)
        workbook.worksheets = workbook.get_worksheets();
        workbook.shares     = workbook.get_shares()

        for worksheet in workbook.worksheets:
            worksheet.comments = worksheet.get_comments();

    return render(request, template, {'workbook' : workbook})

@login_required
def worksheet(request, workbook_id=0, worksheet_id=0):
    command  = request.path.rsplit('/',1)[1];

    if request.method == "POST" :
        if command == "create" :
            Worksheet.create(workbook_id=workbook_id, name="new", description="add a description")
        elif command == "edit" :
            Worksheet.edit(id=worksheet_id, name=request.POST.get('name'), description=request.POST.get('description'))
        elif command == "copy" :
            Worksheet.copy(id=worksheet_id)
        elif command == "delete" :
            Worksheet.destroy(id=worksheet_id)

    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_id})
    return redirect(redirect_url)


@login_required
def worksheet_comment(request, workbook_id=0, worksheet_id=0, comment_id=0):
    command  = request.path.rsplit('/',1)[1];

    if request.method == "POST" :
        if command == "create" :
            result = Worksheet_comment.create(worksheet_id = worksheet_id,
                                              content = request.POST.get('content'),
                                              user = request.user)
            return HttpResponse(json.dumps(result), status=200)
        elif command == "delete" :
            result = Worksheet_comment.destroy(comment_id = comment_id)
            return HttpResponse(json.dumps(result), status=200)



#if workbook_id != '0':
        # workbook_data = \
        #     {'name': 'Test Workbook',
        #      'id' : 1,
        #      'description': "This is a test workbook and is not attached to any database structure",
        #      'share_count': 2,
        #      'owner' : {'name' : 'billy'},
        #      'worksheet_list' : [
        #          {'name' : 'test worksheet one',
        #           'id' : 1,
        #           'owner' : {'name' : 'billy'},
        #           'description' : 'this is a test worksheet and is not attached to any database structure',
        #           'gene_list' : [
        #               {'name' : 'gene one'},
        #               {'name' : 'gene two'},
        #               {'name' : 'gene three'},
        #               {'name' : 'gene four'}],
        #           'variable_list' : [
        #               {'name' : 'variable one'},
        #               {'name' : 'variable two'},
        #               {'name' : 'variable three'},
        #               {'name' : 'variable four'}],
        #          'cohort_list' : [
        #               {'name' : 'cohort one'},
        #               {'name' : 'cohort two'},
        #               {'name' : 'cohort three'},
        #               {'name' : 'cohort four'}],
        #          'comment_list' : [
        #               {'text' : 'this is a test comment 1'},
        #               {'text' : 'this is a test comment 2'},
        #               {'text' : 'this is a test comment 3'},
        #               {'name' : 'this is a test comment 4'}]
        #          },
        #          {'name' : 'test worksheet two',
        #           'id' : 2,
        #           'description' : 'this is a test worksheet and is not attached to any database structure',
        #           'owner' : {'name' : 'billy'},
        #           'gene_list' : [
        #               {'name' : 'gene one'},
        #               {'name' : 'gene two'},
        #               {'name' : 'gene three'},
        #               {'name' : 'gene four'}],
        #           'variable_list' : [
        #               {'name' : 'variable one'},
        #               {'name' : 'variable two'},
        #               {'name' : 'variable three'},
        #               {'name' : 'variable four'}],
        #          'cohort_list' : [
        #               {'name' : 'cohort one'},
        #               {'name' : 'cohort two'},
        #               {'name' : 'cohort three'},
        #               {'name' : 'cohort four'}],
        #          'comment_list' : [
        #               {'text' : 'this is a test comment 1'},
        #               {'text' : 'this is a test comment 2'},
        #               {'text' : 'this is a test comment 3'},
        #               {'name' : 'this is a test comment 4'}]
        #          },
        #          {'name' : 'test worksheet three',
        #           'id' : 3,
        #           'description' : 'this is a test worksheet and is not attached to any database structure',
        #           'owner' : {'name' : 'billy'},
        #           'gene_list' : [
        #               {'name' : 'gene one'},
        #               {'name' : 'gene two'},
        #               {'name' : 'gene three'},
        #               {'name' : 'gene four'}],
        #           'variable_list' : [
        #               {'name' : 'variable one'},
        #               {'name' : 'variable two'},
        #               {'name' : 'variable three'},
        #               {'name' : 'variable four'}],
        #          'cohort_list' : [
        #               {'name' : 'cohort one'},
        #               {'name' : 'cohort two'},
        #               {'name' : 'cohort three'},
        #               {'name' : 'cohort four'}],
        #          'comment_list' : [
        #               {'text' : 'this is a test comment 1'},
        #               {'text' : 'this is a test comment 2'},
        #               {'text' : 'this is a test comment 3'},
        #               {'name' : 'this is a test comment 4'}]
        #           }
        #      ]};