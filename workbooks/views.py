from copy import deepcopy
import json
import re
from google.appengine.api import urlfetch
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User

from django.http import StreamingHttpResponse
from django.http import HttpResponse
from models import Cohort, Workbook, Worksheet, Worksheet_comment, Workbook_Perms, Worksheet_variable, Worksheet_gene, Worksheet_cohort

from django.conf import settings
debug = settings.DEBUG
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
def workbook_create_with_variables(request, variable_list_id=None):
    workbook_model = Workbook.createDefault(name="Untitled Workbook", description="this is an untitled workbook. Click Edit Details to change your workbook title and description.", user=request.user)
    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
    return redirect(redirect_url)

def workbook_create_with_project(request, project_id=None):
    workbook_model = Workbook.createDefault(name="Untitled Workbook", description="this is an untitled workbook. Click Edit Details to change your workbook title and description.", user=request.user)
    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
    return redirect(redirect_url)

def workbook_create_with_genes(request, gene_list_id=None):
    workbook_model = Workbook.createDefault(name="Untitled Workbook", description="this is an untitled workbook. Click Edit Details to change your workbook title and description.", user=request.user)
    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
    return redirect(redirect_url)

def workbook_create_with_cohort(request, cohort_id=None):
    workbook_model = Workbook.createDefault(name="Untitled Workbook", description="this is an untitled workbook. Click Edit Details to change your workbook title and description.", user=request.user)
    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
    return redirect(redirect_url)

def workbook_create_with_analysis(request, analysis_type=None):
    workbook_model = Workbook.createDefault(name="Untitled Workbook", description="this is an untitled workbook. Click Edit Details to change your workbook title and description.", user=request.user)
    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
    return redirect(redirect_url)

@login_required
def workbook(request, workbook_id=0):
    template = 'workbooks/workbook.html'
    command  = request.path.rsplit('/',1)[1];

    if request.method == "POST" :
        if command == "create" :
            workbook_model = Workbook.createDefault(name="Untitled Workbook", description="", user=request.user)
        elif command == "edit" :
            workbook_model = Workbook.edit(id=workbook_id, name=request.POST.get('name'), description=request.POST.get('description'))
        elif command == "share" :
            workbook_model = Workbook.share(id=workbook_id, user_array=request.POST.get('user_array'))
        elif command == "copy" :
            workbook_model = Workbook.copy(id=workbook_id, user=request.user)
        elif command == "delete" :
            Workbook.destroy(id=workbook_id)

        if command == "delete":
            redirect_url = reverse('workbooks')
            return redirect(redirect_url)
        else :
            redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
            return redirect(redirect_url)

    elif request.method == "GET" :
        if workbook_id:
            workbook_model = Workbook.deep_get(id=workbook_id)

            workbook_model.mark_viewed(request)

            plot_types = [{'name' : 'Bar Chart'},
                          {'name' : 'Histogram'},
                          {'name' : 'Scatter Plot'},
                          {'name' : 'Violin Plot'},
                          {'name' : 'Violin Plot 2'},
                          {'name' : 'Cubby Hole'},
                          {'name' : 'SeqPeak'}]
            return render(request, template, {'workbook'    : workbook_model,
                                              'plot_types'  : plot_types})
        else :
            redirect_url = reverse('workbooks')
            return redirect(redirect_url)

@login_required
#used to display a particular worksheet on page load
def worksheet_display(request, workbook_id=0, worksheet_id=0):
    template = 'workbooks/workbook.html'
    workbook_model = Workbook.deep_get(workbook_id)

    for worksheet in workbook_model.worksheets:
        if str(worksheet.id) == worksheet_id :
            display_worksheet = worksheet

        plot_types = [{'name' : 'Bar Chart'},
                          {'name' : 'Histogram'},
                          {'name' : 'Scatter Plot'},
                          {'name' : 'Violin Plot'},
                          {'name' : 'Violin Plot 2'},
                          {'name' : 'Cubby Hole'},
                          {'name' : 'SeqPeak'}]
    return render(request, template, {'workbook'            : workbook_model,
                                      'display_worksheet'   : display_worksheet,
                                      'plot_types'          : plot_types})

@login_required
def worksheet(request, workbook_id=0, worksheet_id=0):
    command  = request.path.rsplit('/',1)[1]
    query = ''

    if request.method == "POST" :
        if command == "create" :
            worksheet = Worksheet.create(workbook_id=workbook_id, name=request.POST.get('name'), description=request.POST.get('description'))
            # query = '#'+ str(worksheet.id)
            redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet.id})
        elif command == "edit" :
            worksheet = Worksheet.edit(id=worksheet_id, name=request.POST.get('name'), description=request.POST.get('description'))
            redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet.id})
        elif command == "copy" :
            worksheet = Worksheet.copy(id=worksheet_id)
            redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet.id})
        elif command == "delete" :
            Worksheet.destroy(id=worksheet_id)
            redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_id})

    # redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_id}) + query
    return redirect(redirect_url)

@login_required
def worksheet_variables(request, workbook_id=0, worksheet_id=0, variable_id=0):
    command  = request.path.rsplit('/',1)[1];

    variables = json.loads(request.body)['variables']
    if request.method == "POST" :
        if command == "edit" :
            Worksheet_variable.edit_list(workbook_id=workbook_id, worksheet_id=worksheet_id, variable_list=variables, user=request.user)
        elif command == "delete" :
            Worksheet_variable.destroy(workbook_id=workbook_id, worksheet_id=worksheet_id, id=variable_id, user=request.user)

    redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet_id})
    return redirect(redirect_url)

@login_required
def worksheet_genes(request, workbook_id=0, worksheet_id=0, genes_id=0):
    command  = request.path.rsplit('/',1)[1];

    genes = json.loads(request.body)['genes']
    if request.method == "POST" :
        if command == "edit" :
            Worksheet_gene.edit_list(worksheet_id=worksheet_id, genes=genes, user=request.user)
        elif command == "delete" :
            Worksheet_gene.destroy(worksheet_id=worksheet_id, id=genes_id, user=request.user)

    redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet_id})
    return redirect(redirect_url)

@login_required
def worksheet_cohorts(request, workbook_id=0, worksheet_id=0, cohort_id=0):
    command  = request.path.rsplit('/',1)[1];

    cohorts = json.loads(request.body)['cohorts']
    if request.method == "POST" :
        if command == "edit" :
            Worksheet_cohort.edit_list(worksheet_id=worksheet_id, id=cohort_id, cohort_ids=cohorts, user=request.user)
        elif command == "delete" :
            Worksheet_cohort.destroy(worksheet_id=worksheet_id, id=cohort_id, user=request.user)

    redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet_id})
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


