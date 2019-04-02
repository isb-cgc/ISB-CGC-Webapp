"""
Copyright 2017, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""


from copy import deepcopy
import json
import re
import sys
import logging
from django.shortcuts import render, redirect
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import StreamingHttpResponse
from bq_data_access.v1.feature_search.util import SearchableFieldHelper
from bq_data_access.v2.feature_search.util import SearchableFieldHelper as SearchableFieldHelper_v2
from django.http import HttpResponse, JsonResponse
from models import Cohort, Workbook, Worksheet, Worksheet_comment, Worksheet_variable, Worksheet_gene, Worksheet_cohort, Worksheet_plot, Worksheet_plot_cohort
from variables.models import VariableFavorite, Variable
from genes.models import GeneFavorite
from analysis.models import Analysis
from projects.models import Program
from sharing.service import create_share
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.utils.html import escape

logger = logging.getLogger('main_logger')

debug = settings.DEBUG

BLACKLIST_RE = settings.BLACKLIST_RE

# These fields are handled by the workbook/worksheet UI and do not need to be determined from the SearchHelper
SKIPPED_FIELDS = ['mirna_name', 'gene_name', 'genomic_build']
DEFAULT_GENES = ['ASXL1', 'BCR', 'CBLB', 'DCTN1', 'ERBB2', 'FANCF', 'GOPC', 'H3F3A', 'IKZF1', 'JUN', 'KDR', 'LRIG3',
                 'MAP2K2', 'NF2', 'OLIG2']


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
        'workbooks': Workbook.objects.filter(is_public=True, active=True)
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
    else:
        result = {'error' : 'parameters are not correct'}

    return HttpResponse(json.dumps(result), status=200)


#TODO maybe complete
@login_required
def workbook_create_with_program(request):
    program_id = request.POST.get('program_id')
    program_model = Program.objects.get(id=program_id)

    workbook_model = Workbook.create(name="Untitled Workbook", description="this is an untitled workbook with all variables of program \"" + program_model.name + "\" added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
    worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)

    #add every variable within the model
    for study in program_model.study_set.filter(active=True) :
        for var in study.user_feature_definitions_set.all():
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
    for var in var_list_model.get_variables():
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


def get_gene_datatypes(build=None):

    datatype_labels = {'GEXP' : 'Gene Expression',
                       'METH' : 'DNA Methylation',
                       'CNVR' : 'Copy Number',
                       'RPPA' : 'Protein',
                       'GNAB' : 'Mutation',
                       'MIRN' : 'miRNA Expression'}

    datatype_list = SearchableFieldHelper.get_fields_for_all_datatypes() if build is None else SearchableFieldHelper_v2.get_fields_for_all_datatypes(build)

    return_list = []
    for type in datatype_list:
        if type['datatype'] != 'CLIN' and ((build is None and type['datatype'] != 'MIRN') or build is not None):
            type['label'] = datatype_labels[type['datatype']]
            type['var_type'] = 'N' if type['datatype'] != 'GNAB' else 'M'

            relevant_fields = []

            for field in type['fields']:
                if 'name' in field and field['name'] not in SKIPPED_FIELDS:
                    relevant_fields.append(field)

            type['fields'] = relevant_fields

            return_list.append(type)

    return return_list


@login_required
def workbook(request, workbook_id=0):
    template = 'workbooks/workbook.html'
    command = request.path.rsplit('/',1)[1]
    workbook_model = None

    try:

        if request.method == "POST":
            if command == "create":
                workbook_model = Workbook.createDefault(name="Untitled Workbook", description="", user=request.user)
            elif command == "edit":
                # Truncate incoming name and desc fields in case someone tried to send ones which were too long
                workbook_name = request.POST.get('name')[0:2000]
                workbook_desc = request.POST.get('description')[0:2000]
                workbook_build = request.POST.get('build')

                blacklist = re.compile(BLACKLIST_RE, re.UNICODE)
                match_name = blacklist.search(unicode(workbook_name))
                match_desc = blacklist.search(unicode(workbook_desc))

                if match_name or match_desc:
                    # XSS risk, log and fail this cohort save
                    matches = ""
                    fields = ""
                    if match_name:
                        match_name = blacklist.findall(unicode(workbook_name))
                        logger.error('[ERROR] While saving a workbook, saw a malformed name: ' + workbook_name + ', characters: ' + str(match_name))
                        matches = "name contains"
                        fields = "name"
                    if match_desc:
                        match_desc = blacklist.findall(unicode(workbook_desc))
                        logger.error('[ERROR] While saving a workbook, saw a malformed description: ' + workbook_desc + ', characters: ' + str(match_desc))
                        matches = "name and description contain" if match_name else "description contains"
                        fields += (" and description" if match_name else "description")

                    err_msg = "Your workbook's %s invalid characters; please choose another %s." % (matches, fields,)
                    messages.error(request, err_msg)
                    redirect_url = reverse('workbook_detail', kwargs={'workbook_id': workbook_id})
                    return redirect(redirect_url)

                workbook_model = Workbook.edit(id=workbook_id, name=workbook_name, description=workbook_desc, build=workbook_build)
            elif command == "copy":
                workbook_model = Workbook.copy(id=workbook_id, user=request.user)
            elif command == "delete":
                Workbook.destroy(id=workbook_id)

            if command == "delete":
                redirect_url = reverse('workbooks')
            else:
                redirect_url = reverse('workbook_detail', kwargs={'workbook_id': workbook_model.id})

            return redirect(redirect_url)

        elif request.method == "GET":
            if workbook_id:
                try :
                    ownedWorkbooks = request.user.workbook_set.filter(active=True)
                    sharedWorkbooks = Workbook.objects.filter(shared__matched_user=request.user, shared__active=True, active=True)
                    publicWorkbooks = Workbook.objects.filter(is_public=True,active=True)

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
                                                      'default_genes': DEFAULT_GENES,
                                                      'datatypes'   : get_gene_datatypes(workbook_model.build),
                                                      'is_shareable': is_shareable,
                                                      'shared'      : shared,
                                                      'plot_types'  : plot_types})
                except ObjectDoesNotExist:
                    redirect_url = reverse('workbooks')
                    return redirect(redirect_url)
            else:
                redirect_url = reverse('workbooks')
                return redirect(redirect_url)

    except Exception as e:
        logger.error("[ERROR] Exception when viewing a workbook: ")
        logger.exception(e)
        messages.error(request, "An error was encountered while trying to view this workbook.")
    finally:
        redirect_url = reverse('workbooks')

    return redirect(redirect_url)


@login_required
def workbook_share(request, workbook_id=0):
    status = None
    result = None

    try:
        emails = re.split('\s*,\s*', request.POST['share_users'].strip())
        users_not_found = []
        req_user = None

        try:
            req_user = User.objects.get(id=request.user.id)
        except ObjectDoesNotExist as e:
            raise Exception("{} is not a user ID in this database!".format(str(request.user.id)))

        workbook_to_share = request.user.workbook_set.get(id=workbook_id, active=True)

        if workbook_to_share.owner.id != req_user.id:
            raise Exception(" {} is not the owner of this workbook!".format(req_user.email))

        for email in emails:
            try:
                User.objects.get(email=email)
            except ObjectDoesNotExist as e:
                users_not_found.append(email)

        if len(users_not_found) > 0:
            status = 'error'
            result = {
                'msg': 'The following user emails could not be found; please ask them to log into the site first: '+", ".join(users_not_found)
            }
        else:
            create_share(request, workbook_to_share, emails, 'Workbook')
            status = 'success'

    except Exception as e:
        logger.error("[ERROR] While trying to share a workbook:")
        logger.exception(e)
        status = 'error'
        result = {
            'msg': 'There was an error while attempting to share this workbook.'
        }
    finally:
        if not status:
            status = 'error'
            result = {
                'msg': 'An unknown error has occurred while sharing this workbook.'
            }

    return JsonResponse({
        'status': status,
        'result': result
    })


@login_required
#used to display a particular worksheet on page load
def worksheet_display(request, workbook_id=0, worksheet_id=0):
    template = 'workbooks/workbook.html'
    workbook_model = Workbook.deep_get(workbook_id)
    workbook_model.mark_viewed(request)
    is_shareable = workbook_model.is_shareable(request)

    for worksheet in workbook_model.worksheets:
        if str(worksheet.id) == worksheet_id:
            display_worksheet = worksheet

    plot_types = Analysis.get_types()
    return render(request, template, {'workbook'            : workbook_model,
                                      'is_shareable'        : is_shareable,
                                      'default_genes'       : DEFAULT_GENES,
                                      'datatypes'           : get_gene_datatypes(workbook_model.build),
                                      'display_worksheet'   : display_worksheet,
                                      'plot_types'          : plot_types})


@login_required
def worksheet(request, workbook_id=0, worksheet_id=0):
    command = request.path.rsplit('/',1)[1]

    if request.method == "POST":
        this_workbook = Workbook.objects.get(id=workbook_id)
        this_workbook.save()
        if command == "create":
            this_worksheet = Worksheet.create(workbook_id=workbook_id, name=request.POST.get('name'), description=request.POST.get('description'))
            redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': this_worksheet.id})
        elif command == "edit":
            worksheet_name = request.POST.get('name')
            worksheet_desc = request.POST.get('description')
            blacklist = re.compile(BLACKLIST_RE, re.UNICODE)
            match_name = blacklist.search(unicode(worksheet_name))
            match_desc = blacklist.search(unicode(worksheet_desc))

            if match_name or match_desc:
                # XSS risk, log and fail this cohort save
                matches = ""
                fields = ""
                if match_name:
                    match_name = blacklist.findall(unicode(worksheet_name))
                    logger.error('[ERROR] While saving a worksheet, saw a malformed name: ' + worksheet_name + ', characters: ' + str(match_name))
                    matches = "name contains"
                    fields = "name"
                if match_desc:
                    match_desc = blacklist.findall(unicode(worksheet_desc))
                    logger.error('[ERROR] While saving a worksheet, saw a malformed description: ' + worksheet_desc + ', characters: ' + str(match_desc))
                    matches = "name and description contain" if match_name else "description contains"
                    fields += (" and description" if match_name else "description")

                err_msg = "Your worksheet's %s invalid characters; please choose another %s." % (matches, fields,)
                messages.error(request, err_msg)
            else:
                Worksheet.edit(id=worksheet_id, name=worksheet_name, description=worksheet_desc)

            redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet_id})
        elif command == "copy" :
            this_worksheet = Worksheet.copy(id=worksheet_id)
            redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': this_worksheet.id})
        elif command == "delete" :
            Worksheet.destroy(id=worksheet_id)
            redirect_url = reverse('workbook_detail', kwargs={'workbook_id':workbook_id})

    return redirect(redirect_url)


@login_required
def worksheet_variable_delete(request, workbook_id=0, worksheet_id=0, variable_id=0):
    Worksheet.objects.get(id=worksheet_id).remove_variable(variable_id);
    workbook = Workbook.objects.get(id=workbook_id)
    workbook.save()
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
        else:
            variables = []
            #from Edit Page
            if "variables" in request.body:
                json_response = True
                name          = json.loads(request.body)['name']
                variable_list = json.loads(request.body)['variables']
                variable_favorite_result = VariableFavorite.create(name       = name,
                                                                   variables  = variable_list,
                                                                   user       = request.user)

                model = VariableFavorite.objects.get(id=variable_favorite_result['id'])
                messages.info(request, 'The variable favorite list \"' + escape(model.name) + '\" was created and added to your worksheet')
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
                else:
                    workbook_model  = Workbook.objects.get(id=workbook_id)
                    workbook_model.save()
                    worksheet_model = Worksheet.objects.get(id=worksheet_id)

                Worksheet_variable.edit_list(workbook_id=workbook_model.id, worksheet_id=worksheet_model.id, variable_list=variables, user=request.user)
                result['workbook_id'] = workbook_model.id
                result['worksheet_id'] = worksheet_model.id
            else:
                result['error'] = "no variables to add"
    else:
        result['error'] = "method not correct"

    if json_response :
        return HttpResponse(json.dumps(result), status=200)
    else:
        redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_model.id, 'worksheet_id': worksheet_model.id})
        return redirect(redirect_url)


@login_required
def workbook_create_with_genes(request):
    return worksheet_genes(request=request)


@login_required
def worksheet_gene_delete(request, workbook_id=0, worksheet_id=0, gene_id=0):
    Worksheet.objects.get(id=worksheet_id).remove_gene(gene_id);
    workbook = Workbook.objects.get(id=workbook_id)
    workbook.save()
    redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_id, 'worksheet_id': worksheet_id})
    return redirect(redirect_url)


@login_required
def worksheet_genes(request, workbook_id=0, worksheet_id=0, genes_id=0):
    command = request.path.rsplit('/',1)[1];
    json_response = False
    result = {}

    if request.method == "POST":
        if command == "delete":
            Worksheet_gene.destroy(workbook_id=workbook_id, worksheet_id=worksheet_id, id=genes_id, user=request.user)
            result['message'] = "genes have been deleted from workbook"
        else:
            genes = []
            workbook_name = 'Untitled Workbook'
            #from Gene Edit Page
            if request.POST.get("genes-list"):
                # Get workbook name
                if request.POST.get('name'):
                    workbook_name = request.POST.get('name')

                name = request.POST.get("genes-name")
                gene_list = request.POST.get("genes-list")
                gene_list = [x.strip() for x in gene_list.split(' ')]
                gene_list = list(set(gene_list))
                GeneFave = GeneFavorite.create(name=name, gene_list=gene_list, user=request.user)
                messages.info(request, 'The gene favorite list \"' + name + '\" was created and added to your worksheet')
                # Refetch the created gene list, because it will have the names correctly formatted
                for g in GeneFavorite.objects.get(id=GeneFave['id']).get_genes_list():
                    genes.append(g)

            #from Gene Details Page
            if request.POST.get("gene_list_id"):
                # Get workbook name
                if request.POST.get('name'):
                    workbook_name = request.POST.get('name')

                gene_id = request.POST.get("gene_list_id")
                try :
                    gene_fav = GeneFavorite.objects.get(id=gene_id)
                    names = gene_fav.get_gene_name_list()
                    for g in names:
                        if g not  in genes:
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
                            if g not in genes:
                                genes.append(g)
                    except ObjectDoesNotExist:
                        None
            if len(genes) > 0:
                if workbook_id is 0:
                    workbook_model = Workbook.create(name=workbook_name, description="This workbook was created with genes added to the first worksheet. Click Edit Details to change your workbook title and description.", user=request.user)
                    worksheet_model = Worksheet.objects.create(name="worksheet 1", description="", workbook=workbook_model)
                else:
                    workbook_model = Workbook.objects.get(id=workbook_id)
                    workbook_model.save()
                    worksheet_model = Worksheet.objects.get(id=worksheet_id)

                Worksheet_gene.edit_list(workbook_id=workbook_model.id, worksheet_id=worksheet_model.id, gene_list=genes, user=request.user)
                result['genes'] = genes
            else:
                result['error'] = "no genes to add"

    else:
        result['error'] = "method not correct"

    if json_response :
        return HttpResponse(json.dumps(result), status=200)
    else:
        redirect_url = reverse('worksheet_display', kwargs={'workbook_id':workbook_model.id, 'worksheet_id': worksheet_model.id})
        return redirect(redirect_url)


@login_required
def workbook_create_with_plot(request):
    return worksheet_plots(request=request)


@login_required
def worksheet_plots(request, workbook_id=0, worksheet_id=0, plot_id=0):
    command = request.path.rsplit('/',1)[1];
    json_response = False
    default_name  = "Untitled Workbook"
    result        = {}
    try:
        workbook_model = Workbook.objects.get(id=workbook_id) if workbook_id else None

        if request.method == "POST":
            workbook_model.save()
            if command == "delete":
                var = Worksheet_plot.objects.get(id=plot_id).delete()
                result['message'] = "This plot has been deleted from workbook."
            else:
                if "attrs" in request.body:
                    json_response = True
                    attrs    = json.loads(request.body)['attrs']
                    settings = json.loads(request.body)['settings']
                    if plot_id :
                        plot_model = Worksheet_plot.objects.get(id=plot_id)
                        plot_model.settings_json = settings
                        if attrs['cohorts']:
                            try :
                                Worksheet_plot_cohort.objects.filter(plot=plot_model).delete()
                                for obj in attrs['cohorts'] :
                                    wpc = Worksheet_plot_cohort(plot=plot_model, cohort_id=obj['id'])
                                    wpc.save()
                            except ObjectDoesNotExist:
                                None

                        plot_model.save()
                        result['updated'] = "success"

        elif request.method == "GET":
            json_response = True
            plot_type = escape(request.GET.get('type', 'default'))

            if plot_type not in Analysis.get_types_list():
                raise Exception("Plot type {} was not found in the allowed list of plot types!".format(plot_type))

            worksheet_model = Worksheet.objects.get(id=worksheet_id)
            plots = worksheet_model.worksheet_plot_set.all()
            for p in plots :
                p.active = False
                p.save()

            plots = worksheet_model.worksheet_plot_set.filter(type=plot_type)
            if len(plots) == 0:
                model = Worksheet_plot(type=plot_type, worksheet=worksheet_model)
                model.save()
            else:
                model = plots[0]
                model.active = True
                model.save()

            result['data'] = model.toJSON()
        else:
            result['error'] = "method not correct"

        if json_response:
            return HttpResponse(json.dumps(result), status=200)
        else:
            redirect_url = reverse('worksheet_display', kwargs={'workbook_id': workbook_model.id, 'worksheet_id': worksheet_model.id})
            return redirect(redirect_url)

    except Exception as e:
        logger.error("[ERROR] While accessing workbooks/worksheets:")
        logger.exception(e)
        messages.error(request, "An error occurred while trying to process this workbook request.")
        return redirect('workbooks')


@login_required
def worksheet_cohorts(request, workbook_id=0, worksheet_id=0, cohort_id=0):
    command = request.path.rsplit('/', 1)[1]

    cohorts = json.loads(request.body)['cohorts']
    if request.method == "POST":
        wrkbk = Workbook.objects.get(id=workbook_id)
        wrkbk.save()
        if command == "edit":
            Worksheet_cohort.edit_list(worksheet_id=worksheet_id, id=cohort_id, cohort_ids=cohorts, user=request.user)
        elif command == "delete":
            Worksheet_cohort.destroy(worksheet_id=worksheet_id, id=cohort_id, user=request.user)

    redirect_url = reverse('worksheet_display', kwargs={'workbook_id': workbook_id, 'worksheet_id': worksheet_id})
    return redirect(redirect_url)


@login_required
def worksheet_comment(request, workbook_id=0, worksheet_id=0, comment_id=0):
    command = request.path.rsplit('/', 1)[1]

    if request.method == "POST":
        wrkbk = Workbook.objects.get(id=workbook_id)
        wrkbk.save()
        content = request.POST.get('content', '').encode('utf-8')
        if command == "create":
            return_obj = Worksheet_comment.create(worksheet_id=worksheet_id,
                                              content=content,
                                              user=request.user)

            return_obj['content'] = escape(return_obj['content'])
            return HttpResponse(json.dumps(return_obj), status=200)
        elif command == "delete":
            result = Worksheet_comment.destroy(comment_id=comment_id)
            return HttpResponse(json.dumps(result), status=200)
