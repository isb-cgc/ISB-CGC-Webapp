from copy import deepcopy
import json
import re
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import StreamingHttpResponse
from bq_data_access.feature_search.util import SearchableFieldHelper
from django.http import HttpResponse, JsonResponse
from models import Cohort, Workbook, Worksheet, Worksheet_comment, Worksheet_variable, Worksheet_gene, Worksheet_cohort, Worksheet_plot, Worksheet_plot_cohort
from variables.models import VariableFavorite, Variable
from genes.models import GeneFavorite
from analysis.models import Analysis
from projects.models import Project
from sharing.service import create_share
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
debug = settings.DEBUG
if settings.DEBUG :
    import sys

@login_required
def workbook_list(request):
    template  = 'workbooks/workbook_list.html',

    userWorkbooks = request.user.workbook_set.all()
    sharedWorkbooks = Workbook.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)

    workbooks = userWorkbooks | sharedWorkbooks
    workbooks = workbooks.distinct()

    return render(request, template, {'workbooks' : workbooks})

def workbook_samples(request):
    template = 'workbooks/workbook_samples.html'
    return render(request, template, {
        'workbooks': Workbook.objects.all().filter(is_public=True, active=True)
    })


#TODO secure this url
@login_required
def workbook_create_with_cohort(request):
    cohort_id       = request.POST.get('cohort_id')
    cohort          = Cohort.objects.get(id=cohort_id)
    workbook_model  = Workbook.create(name="Untitled Workbook", description="This workbook was created with cohort \"" + cohort.name + "\" added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
    worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)
    worksheet_model.add_cohort(cohort=cohort)

    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
    return redirect(redirect_url)

@login_required
def workbook_create_with_cohort_list(request):
    cohort_ids = json.loads(request.body)['cohorts']
    if len(cohort_ids) > 0 :
        workbook_model  = Workbook.create(name="Untitled Workbook", description="This is a workbook created with cohorts added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
        worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)
        for id in cohort_ids :
            cohort = Cohort.objects.get(id=id)
            worksheet_model.add_cohort(cohort=cohort)

        result = {'workbook_id'  : workbook_model.id,
                  'worksheet_id' : worksheet_model.id}
    else :
        result = {'error' : 'parameters are not correct'}

    return HttpResponse(json.dumps(result), status=200)

#TODO maybe complete
@login_required
def workbook_create_with_project(request):
    project_id = request.POST.get('project_id')
    project_model = Project.objects.get(id=project_id)

    workbook_model = Workbook.create(name="Untitled Workbook", description="this is an untitled workbook with all variables of project \"" + project_model.name + "\" added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
    worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)

    #add every variable within the model
    for study in project_model.study_set.all().filter(active=True) :
        for var in study.user_feature_definitions_set.all() :
            work_var = Worksheet_variable.objects.create(worksheet_id = worksheet_model.id,
                                              name         = var.feature_name,
                                              url_code     = var.bq_map_id,
                                              feature_id   = var.id)
            work_var.save()

    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
    return redirect(redirect_url)

@login_required
def workbook_create_with_variables(request):
    json_data = request.POST.get('json_data')
    if json_data:
        data = json.loads(json_data)
        # TODO: Refactor so that user can create using multiple variable lists
        var_list_id = data['variable_list_id'][0]
    else:
        var_list_id    = request.POST.get('variable_list_id')


    var_list_model = VariableFavorite.objects.get(id=var_list_id)
    name = request.POST.get('name', var_list_model.name + ' workbook')
    workbook_model = Workbook.create(name=name, description="this is an untitled workbook with all variables of variable favorite list \"" + var_list_model.name + "\" added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
    workbook_model.save()
    worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)
    worksheet_model.save()

    print workbook_model.id
    for var in var_list_model.get_variables() :
        work_var = Worksheet_variable.objects.create(worksheet_id = worksheet_model.id,
                                          name         = var.name,
                                          url_code     = var.code,
                                          type         = var.type,
                                          feature_id   = var.feature_id)

        work_var.save()

    redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
    if json_data:
        return JsonResponse({'workbook_id': workbook_model.id, 'worksheet_id': worksheet_model.id})
    else:
        return redirect(redirect_url)

@login_required
def workbook_create_with_analysis(request):
    analysis_type   = request.POST.get('analysis')

    allowed_types = Analysis.get_types()
    redirect_url = reverse('sample_analyses')
    for type in allowed_types :
        if analysis_type == type['name'] :
            workbook_model  = Workbook.create(name="Untitled Workbook", description="this is an untitled workbook with a \"" + analysis_type + "\" plot added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
            worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)
            worksheet_model.set_plot(type=analysis_type)
            redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_model.id})
            break

    return redirect(redirect_url)

def get_gene_datatypes():
    datatype_labels = {'GEXP' : 'Gene Expression',
                       'METH' : 'Methylation',
                       'CNVR' : 'Copy Number',
                       'RPPA' : 'Protein',
                       'GNAB' : 'Mutation'}

    datatype_list = SearchableFieldHelper.get_fields_for_all_datatypes()
    if debug: print >> sys.stderr, ' attrs ' + json.dumps(datatype_list)
    return_list = []
    for type in datatype_list:
        if type['datatype'] != 'CLIN' and type['datatype'] != 'MIRN' :
            type['label'] = datatype_labels[type['datatype']]
            return_list.append(type)

        #remove gene in fields as they are set with the variable selection
        for index, field in enumerate(type['fields']):
            if field['label'] == "Gene":
                del type['fields'][index]

    return return_list

@login_required
def workbook(request, workbook_id=0):
    template = 'workbooks/workbook.html'
    command  = request.path.rsplit('/',1)[1]

    if request.method == "POST" :
        if command == "create" :
            workbook_model = Workbook.createDefault(name="Untitled Workbook", description="", user=request.user)
        elif command == "edit" :
            workbook_model = Workbook.edit(id=workbook_id, name=request.POST.get('name'), description=request.POST.get('description'))
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
            try :
                ownedWorkbooks  = request.user.workbook_set.all().filter(active=True)
                sharedWorkbooks = Workbook.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
                publicWorkbooks = Workbook.objects.all().filter(is_public=True,active=True)

                workbooks = ownedWorkbooks | sharedWorkbooks | publicWorkbooks
                workbooks = workbooks.distinct()

                workbook_model = workbooks.get(id=workbook_id)
                workbook_model.worksheets = workbook_model.get_deep_worksheets()

                is_shareable = workbook_model.is_shareable(request)

                shared = None
                if workbook_model.owner.id != request.user.id and not workbook_model.is_public:
                    shared = request.user.shared_resource_set.get(workbook__id=workbook_id)

                plot_types = Analysis.get_types()

                return render(request, template, {'workbook'    : workbook_model,
                                                  'datatypes'   : get_gene_datatypes(),
                                                  'is_shareable': is_shareable,
                                                  'shared'      : shared,
                                                  'plot_types'  : plot_types})
            except ObjectDoesNotExist:
                redirect_url = reverse('workbooks')
                return redirect(redirect_url)
        else :
            redirect_url = reverse('workbooks')
            return redirect(redirect_url)

@login_required
def workbook_share(request, workbook_id=0):
    emails = re.split('\s*,\s*', request.POST['share_users'].strip())
    workbook = request.user.workbook_set.get(id=workbook_id, active=True)
    create_share(request, workbook, emails, 'Workbook')

    return JsonResponse({
        'status': 'success'
    })

@login_required
#used to display a particular worksheet on page load
def worksheet_display(request, workbook_id=0, worksheet_id=0):
    template = 'workbooks/workbook.html'
    workbook_model = Workbook.deep_get(workbook_id)
    workbook_model.mark_viewed(request)
    is_shareable = workbook_model.is_shareable(request)

    for worksheet in workbook_model.worksheets:
        if str(worksheet.id) == worksheet_id :
            display_worksheet = worksheet

    plot_types = Analysis.get_types()
    return render(request, template, {'workbook'            : workbook_model,
                                      'is_shareable'        : is_shareable,
                                      'datatypes'           : get_gene_datatypes(),
                                      'display_worksheet'   : display_worksheet,
                                      'plot_types'          : plot_types})

@login_required
def worksheet(request, workbook_id=0, worksheet_id=0):
    command  = request.path.rsplit('/',1)[1]

    if request.method == "POST" :
        if command == "create" :
            worksheet = Worksheet.create(workbook_id=workbook_id, name=request.POST.get('name'), description=request.POST.get('description'))
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

    return redirect(redirect_url)

@login_required
def worksheet_variable_delete(request, workbook_id=0, worksheet_id=0, variable_id=0):
    Worksheet.objects.get(id=worksheet_id).remove_variable(variable_id);
    redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet_id})
    return redirect(redirect_url)

@login_required
def worksheet_variables(request, workbook_id=0, worksheet_id=0, variable_id=0):
    command  = request.path.rsplit('/',1)[1];
    json_response = False
    workbook_name = "Untitled Workbook"
    result        = {}

    if request.method == "POST" :
        if command == "delete" :
            Worksheet_variable.destroy(workbook_id=workbook_id, worksheet_id=worksheet_id, id=variable_id, user=request.user)
            result['message'] = "variables have been deleted from workbook"
        else :
            variables = []
            #from Edit Page
            if "variables" in request.body :
                json_response = True
                name          = json.loads(request.body)['name']
                variable_list = json.loads(request.body)['variables']
                variable_favorite_result = VariableFavorite.create(name       = name,
                                                                   variables  = variable_list,
                                                                   user       = request.user)

                model = VariableFavorite.objects.get(id=variable_favorite_result['id'])
                messages.info(request, 'The variable favorite list \"' + model.name + '\" was created and added to your worksheet')
                variables = model.get_variables()

            #from Details Page or list page
            if request.POST.get("variable_list_id") :
                workbook_name = request.POST.get("name")
                variable_id   = request.POST.get("variable_list_id")
                try :
                    variable_fav = VariableFavorite.objects.get(id=variable_id)
                    variables = variable_fav.get_variables()
                except ObjectDoesNotExist:
                    result['error'] = "variable favorite does not exist"

            #from Select Page
            if "var_favorites" in request.body :
                variable_fav_list = json.loads(request.body)['var_favorites']
                json_response = True
                for fav in variable_fav_list:
                    try:
                        fav = VariableFavorite.objects.get(id=fav['id'])
                        variables = fav.get_variables()
                    except ObjectDoesNotExist:
                        result['error'] = "variable favorite does not exist"

            if len(variables) > 0:
                if workbook_id == 0:
                    workbook_model  = Workbook.create(name=workbook_name, description="This workbook was created with variables added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
                    worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)
                else :
                    workbook_model  = Workbook.objects.get(id=workbook_id)
                    worksheet_model = Worksheet.objects.get(id=worksheet_id)

                Worksheet_variable.edit_list(workbook_id=workbook_model.id, worksheet_id=worksheet_model.id, variable_list=variables, user=request.user)
                result['workbook_id'] = workbook_model.id
                result['worksheet_id'] = worksheet_model.id
            else :
                result['error'] = "no variables to add"
    else :
        result['error'] = "method not correct"

    if json_response :
        return HttpResponse(json.dumps(result), status=200)
    else :
        redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_model.id, 'worksheet_id': worksheet_model.id})
        return redirect(redirect_url)


@login_required
def workbook_create_with_genes(request):
    return worksheet_genes(request=request)

@login_required
def worksheet_gene_delete(request, workbook_id=0, worksheet_id=0, gene_id=0):
    Worksheet.objects.get(id=worksheet_id).remove_gene(gene_id);
    redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet_id})
    return redirect(redirect_url)

@login_required
def worksheet_genes(request, workbook_id=0, worksheet_id=0, genes_id=0):
    command  = request.path.rsplit('/',1)[1];
    json_response = False
    result = {}

    if request.method == "POST" :
        if command == "delete" :
            Worksheet_gene.destroy(workbook_id=workbook_id, worksheet_id=worksheet_id, id=genes_id, user=request.user)
            result['message'] = "genes have been deleted from workbook"
        else :
            genes = []
            workbook_name = 'Untitled Workbook'
            #from Gene Edit Page
            if request.POST.get("genes-list") :
                # Get workbook name
                if request.POST.get('name'):
                    workbook_name = request.POST.get('name')

                name = request.POST.get("genes-name")
                gene_list = request.POST.get("genes-list")
                gene_list = [x.strip() for x in gene_list.split(' ')]
                gene_list = list(set(gene_list))
                GeneFavorite.create(name=name, gene_list=gene_list, user=request.user)
                messages.info(request, 'The gene favorite list \"' + name + '\" was created and added to your worksheet')
                for g in gene_list:
                    genes.append(g)

            #from Gene Details Page
            if request.POST.get("gene_list_id") :
                # Get workbook name
                if request.POST.get('name'):
                    workbook_name = request.POST.get('name')

                gene_id = request.POST.get("gene_list_id")
                try :
                    gene_fav = GeneFavorite.objects.get(id=gene_id)
                    names = gene_fav.get_gene_name_list()
                    for g in names:
                        genes.append(g)
                except ObjectDoesNotExist:
                        None

            #from Gene List Page
            if "gene_fav_list" in request.body :
                json_response = True
                gene_fav_list = json.loads(request.body)['gene_fav_list']
                for id in gene_fav_list:
                    try:
                        fav = GeneFavorite.objects.get(id=id)
                        names = fav.get_gene_name_list()
                        for g in names:
                            genes.append(g)
                    except ObjectDoesNotExist:
                        None
            if len(genes) > 0:
                if workbook_id is 0:

                    workbook_model  = Workbook.create(name=workbook_name, description="This workbook was created with genes added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
                    worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)
                else :
                    workbook_model = Workbook.objects.get(id=workbook_id)
                    worksheet_model = Worksheet.objects.get(id=worksheet_id)

                Worksheet_gene.edit_list(workbook_id=workbook_model.id, worksheet_id=worksheet_model.id, gene_list=genes, user=request.user)
                result['genes'] = genes
            else :
                result['error'] = "no genes to add"

    else :
        result['error'] = "method not correct"

    if json_response :
        return HttpResponse(json.dumps(result), status=200)
    else :
        redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_model.id, 'worksheet_id': worksheet_model.id})
        return redirect(redirect_url)

@login_required
def workbook_create_with_plot(request):
    return worksheet_plots(request=request)

@login_required
def worksheet_plots(request, workbook_id=0, worksheet_id=0, plot_id=0):
    command  = request.path.rsplit('/',1)[1];
    json_response = False
    default_name  = "Untitled Workbook"
    result        = {}

    if request.method == "POST" :
        if command == "delete" :
            var = Worksheet_plot.objects.get(id=plot_id).delete()
            result['message'] = "the plot has been deleted from workbook"
        else :
            #update
            if "attrs" in request.body :
                json_response = True
                attrs    = json.loads(request.body)['attrs']
                settings = json.loads(request.body)['settings']
                if plot_id :
                    plot_model = Worksheet_plot.objects.get(id=plot_id)
                    plot_model.settings_json = settings
                    if attrs['cohorts'] :
                        try :
                            Worksheet_plot_cohort.objects.filter(plot=plot_model).delete()
                            for obj in attrs['cohorts'] :
                                wpc = Worksheet_plot_cohort(plot=plot_model, cohort_id=obj['id'])
                                wpc.save()
                        except ObjectDoesNotExist:
                            None


                    plot_model.save()
                    result['updated'] = "success"

    elif request.method == "GET" :
        json_response = True
        plot_type = request.GET.get('type', 'default')

        worksheet_model = Worksheet.objects.get(id=worksheet_id)
        plots = worksheet_model.worksheet_plot_set.all()
        for p in plots :
            p.active = False
            p.save()

        plots = worksheet_model.worksheet_plot_set.filter(type=plot_type)
        if len(plots) == 0:
            model = Worksheet_plot(type=plot_type, worksheet=worksheet_model)
            model.save()
        else :
            model = plots[0]
            model.active = True
            model.save()

        result['data'] = model.toJSON()
    else :
        result['error'] = "method not correct"

    if json_response :
        return HttpResponse(json.dumps(result), status=200)
    else :
        redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_model.id, 'worksheet_id': worksheet_model.id})
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


