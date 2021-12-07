###
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

import ast

from cohorts.models import Cohort
from django.contrib import admin
from django.contrib.auth.models import User
from django.db import models
from django.utils import formats
from django.utils.html import escape
from projects.models import User_Feature_Definitions
from sharing.models import Shared_Resource
from genes.models import GeneSymbol

import logging

logger = logging.getLogger('main_logger')

# Create your models here.
class WorkbookManager(models.Manager):
    content = None

class Workbook(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=2024,null=False)
    description = models.CharField(max_length=2024, null=False)
    date_created = models.DateTimeField(auto_now_add=True)
    last_date_saved = models.DateTimeField(auto_now=True)
    objects = WorkbookManager()
    is_public = models.BooleanField(default=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    active = models.BooleanField(default=True)
    shared = models.ManyToManyField(Shared_Resource)
    build = models.CharField(max_length=10, null=True)

    @classmethod
    def deep_get(cls, id):
        workbook_model            = cls.objects.get(id=id)
        workbook_model.owner      = workbook_model.get_owner()
        workbook_model.worksheets = workbook_model.get_deep_worksheets()
        workbook_model.shares     = workbook_model.shared

        return workbook_model

    @classmethod
    def create(cls, name, description, user, build='HG38'):
        workbook_model = cls.objects.create(name=name, description=description, owner=user, build=build)
        workbook_model.save()

        return workbook_model

    @classmethod
    def createDefault(cls, name, description, user):
        workbook_model = cls.create(name, description, user)
        return workbook_model

    @classmethod
    def edit(cls, id, name, description, build=None):
        workbook_model = cls.objects.get(id=id)
        workbook_model.name = name
        workbook_model.description = description
        # Workbook builds cannot be set to None - that would flag them as Legacy workbooks - and they cannot be
        # changed from None to a non-Legacy build value
        if build and workbook_model.build is not None:
            workbook_model.build = build

        workbook_model.save()
        return workbook_model

    @classmethod
    def copy(cls, id, user):
        workbook_model = cls.objects.get(id=id)
        workbook_copy  = cls.create(workbook_model.name + " copy", workbook_model.description, user, workbook_model.build)

        worksheets = workbook_model.get_worksheets()
        for worksheet in worksheets:
            copy = Worksheet.copy(id=worksheet.id)
            copy.workbook = workbook_copy
            copy.save()

        return workbook_copy

    @classmethod
    def destroy(cls, id):
        workbook_model = cls.objects.get(id=id)

        worksheets = workbook_model.get_worksheets()
        for worksheet in worksheets:
            Worksheet.destroy(id=worksheet.id)

        workbook_model.delete()
        return workbook_model

    @classmethod
    def get_owner(cls, id):
        workbook_model = cls.objects.get(id=id)
        return workbook_model.owner

    '''
    Sets the last viewed time for a workbook
    '''
    def mark_viewed (self, request, user=None):
        if user is None:
            user = request.user

        last_view = self.workbook_last_view_set.filter(user=user)
        if last_view is None or len(last_view) is 0:
            last_view = self.workbook_last_view_set.create(user=user)
        else:
            last_view = last_view[0]

        last_view.save(False, True)

        return last_view

    def get_owner(self):
        return self.owner

    def get_worksheets(self):
        return self.worksheet_set.filter(workbook=self)

    def get_deep_worksheets(self):
        worksheets =  self.worksheet_set.filter(workbook=self)
        for worksheet in worksheets:
            worksheet.comments  = worksheet.get_comments()
            worksheet.variables = worksheet.get_variables()
            worksheet.genes     = worksheet.get_genes()
            worksheet.cohorts   = worksheet.get_cohorts()

            worksheet.active_plot = worksheet.get_active_plot()
        return worksheets

    def is_shareable(self, request):
        is_shareable = (self.owner.id == request.user.id)

        if is_shareable:
            for worksheet in self.get_deep_worksheets():
                # Check all cohorts are owned by the user
                for cohort in worksheet.cohorts:
                    if cohort.cohort.get_owner().id != request.user.id and not cohort.cohort.is_public():
                        logger.debug("Not shareable due to cohort")
                        is_shareable = False
                        break

                # Check all variables are from programs owned by the user
                for variable in worksheet.get_variables():
                    if variable.feature: #feature will be null if the variable is from TCGA
                        if variable.feature.project.program.owner_id != request.user.id and not variable.feature.project.program.is_public:
                            logger.debug("Not shareable due to variable features")
                            is_shareable = False
                            break

                if not is_shareable:
                    break

        return is_shareable


    def get_builds(self):
        return ["HG19", "HG38"]


class Workbook_Last_View(models.Model):
    workbook = models.ForeignKey(Workbook, blank=False, on_delete=models.CASCADE)
    user = models.ForeignKey(User, null=False, blank=False, on_delete=models.CASCADE)
    test = models.DateTimeField(auto_now_add=True, null=True)
    last_view = models.DateTimeField(auto_now=True)

# Deprecated. Left in for the conversion
class Workbook_Perms(models.Model):
    READER = 'READER'
    OWNER = 'OWNER'
    PERMISSIONS = (
        (READER, 'Reader'),
        (OWNER, 'Owner')
    )

    workbook = models.ForeignKey(Workbook, null=False, blank=False, on_delete=models.CASCADE)
    user = models.ForeignKey(User, null=False, blank=True, on_delete=models.CASCADE)
    perm = models.CharField(max_length=10, choices=PERMISSIONS, default=READER)

class WorksheetManager(models.Manager):
    content = None

class Worksheet(models.Model):
    id              = models.AutoField(primary_key=True)
    name            = models.CharField(max_length=2024, blank=False)
    description     = models.CharField(max_length=2024, null=False)
    workbook        = models.ForeignKey(Workbook, null=False, blank=False, on_delete=models.CASCADE)
    last_date_saved = models.DateTimeField(auto_now=True)
    date_created    = models.DateTimeField(auto_now_add=True)
    objects         = WorksheetManager()

    @classmethod
    def destroy(cls, id):
        worksheet_model = cls.objects.get(id=id)
        worksheet_model.worksheet_cohort_set.all().delete()
        worksheet_model.worksheet_comment_set.all().delete()
        worksheet_model.worksheet_variable_set.all().delete()
        worksheet_model.worksheet_gene_set.all().delete()
        worksheet_model.worksheet_plot_set.all().delete()
        worksheet_model.delete()
        return worksheet_model

    @classmethod
    def create(cls, workbook_id, name, description):
        worksheet_model = cls(workbook_id=workbook_id, name=name, description=description)
        worksheet_model.save()
        return worksheet_model

    @classmethod
    def copy(cls, id):
        worksheet = cls.objects.get(id=id)
        worksheet_copy = cls(workbook=worksheet.workbook,
                             name=worksheet.name + " copy",
                             description=worksheet.description)
        worksheet_copy.save()

        worksheet_variables = worksheet.worksheet_variable_set.all()
        for wv in worksheet_variables:
            wv.pk = None
            wv.worksheet = worksheet_copy
            wv.save()

        worksheet_genes = worksheet.worksheet_gene_set.all()
        for wg in worksheet_genes:
            wg.pk = None
            wg.worksheet = worksheet_copy
            wg.save()

        worksheet_cohorts = worksheet.worksheet_cohort_set.all()
        for wc in worksheet_cohorts:
            wc.pk = None
            wc.worksheet = worksheet_copy
            wc.save()

        worksheet_plots = worksheet.worksheet_plot_set.all()
        for wp in worksheet_plots:
            worksheet_plot_cohorts = Worksheet_plot_cohort.objects.filter(plot=wp)
            wp.pk = None
            wp.worksheet = worksheet_copy
            wp.save()

            for wpc in worksheet_plot_cohorts: #should be the pre-existing plot cohorts
                wpc.pk = None
                wpc.plot = wp
                wpc.cohort = Worksheet_cohort.objects.filter(worksheet_id=worksheet_copy.id).filter(cohort_id=wpc.cohort.cohort_id).first()
                wpc.save()

        return worksheet_copy

    @classmethod
    def edit(cls, id, name, description):
        worksheet_model = cls.objects.get(id=id)
        worksheet_model.name = name
        worksheet_model.description = description
        worksheet_model.save()
        return worksheet_model

    def get_comments(self):
        return self.worksheet_comment_set.filter(worksheet=self)

    def get_variables(self):
        return self.worksheet_variable_set.filter(worksheet=self)

    def remove_variable(self, id):
        Worksheet_variable.objects.get(id=id).delete()

    def get_genes(self):
        return self.worksheet_gene_set.filter(worksheet=self)

    def remove_gene(self, id):
        Worksheet_gene.objects.get(id=id).delete()

    def get_cohorts(self):
        return self.worksheet_cohort_set.filter(worksheet=self)

    def add_cohort(self, cohort):
        existing_w_cohorts = self.worksheet_cohort_set.all()
        existing_cohort_ids = []
        for wc in existing_w_cohorts :
            existing_cohort_ids.append(wc.cohort_id)

        if cohort.id not in existing_cohort_ids :
            Worksheet_cohort.create(self.id, cohort)

    def remove_cohort(self, cohort):
        self.worksheet_cohort_set.get(cohort=cohort).destroy()

    def get_active_plot(self):
        active_set_list = list(self.worksheet_plot_set.filter(active=True).values())
        if len(active_set_list) > 0 :
            return Worksheet_plot.get_deep_plot(id=active_set_list[0]['id'])
        return None

    def get_plot(self):
        return self.worksheet_plot_set.filter(worksheet=self)[0]

    def set_plot(self, type):
        #currently there is only of each plot type in a worksheet
        for p in self.worksheet_plot_set.filter(worksheet=self, type=type) :
            p.delete()

        for p in self.worksheet_plot_set.filter(worksheet=self, active=True):
            p.active = False
            p.save()

        plot = Worksheet_plot(type=type, worksheet=self, active=True)
        plot.save()

class Worksheet_Cohort_Manager(models.Manager):
    content = None

class Worksheet_cohort(models.Model):
    id              = models.AutoField(primary_key=True)
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False, on_delete=models.CASCADE)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    cohort          = models.ForeignKey(Cohort, on_delete=models.CASCADE)
    objects         = Worksheet_Cohort_Manager()

    @classmethod
    def edit_list(cls, workbook_id, worksheet_id, cohort_list, user):
        workbook_owner = Workbook.objects.get(id=workbook_id).get_owner()
        if workbook_owner.id == user.id :
            worksheet_model = Worksheet.objects.get(id=worksheet_id)
            #TODO delete all then resave not the most efficient
            cohorts = Worksheet_cohort.objects.filter(worksheet=worksheet_model)
            for co in cohorts :
                co.destroy();

            results = []
            for co in cohort_list :
                results.append(Worksheet_cohort.create(worksheet_id, co))

            return_obj = {
                'variables' : results,
            }
        else :
            return_obj = {
                'error'     : "you do not have access to update this worksheet",
            }
        return return_obj

    @classmethod
    def create(cls, worksheet_id, cohort):
        model = cls.objects.create(worksheet_id = worksheet_id, cohort = cohort)
        model.save()

        return_obj = {
            'id'            : model.id,
            'cohort_id'     : model.cohort.id,
            'date_created'  : formats.date_format(model.date_created, 'DATETIME_FORMAT')
        }
        return return_obj

    @classmethod
    def destroy(cls, workbook_id, worksheet_id, id, user):
        workbook_owner = Workbook.get_owner(id)
        if workbook_owner.id == user.id :
            model = cls.objects.get(id=id)
            model.destroy()
            return_obj = {
                'result'     : "Success",
            }
        else :
            return_obj = {
                'error'     : "you do not have access to update this worksheet",
            }
            return return_obj

    def toJSON(self):
        j = {'id'        : self.id,
             'cohort'    : {'id' : self.cohort.id, 'name' : self.cohort.name},
             'worksheet' : self.worksheet_id
             }
        return j

    def destroy(self):
        self.delete()

class Worksheet_Gene_Manager(models.Manager):
    content = None

class Worksheet_gene(models.Model):
    id              = models.AutoField(primary_key=True)
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False, on_delete=models.CASCADE)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    gene            = models.CharField(max_length=2024, blank=False)
    type            = models.CharField(max_length=16, blank=False, default='gene')
    objects         = Worksheet_Gene_Manager()

    @classmethod
    def edit_list(cls, workbook_id, worksheet_id, gene_list, user):
        workbook_owner = Workbook.objects.get(id=workbook_id).get_owner()
        if workbook_owner.id == user.id:
            worksheet_model = Worksheet.objects.get(id=worksheet_id)

            genes = Worksheet_gene.objects.filter(worksheet=worksheet_model)
            for gene in genes :
                gene.destroy();

            results = []
            for gene in gene_list:
                results.append(Worksheet_gene.create(worksheet_id=worksheet_model.id, gene=gene))

            return_obj = {
                'variables': results,
            }
        else:
            return_obj = {
                'error': "You do not have access to update this worksheet.",
            }
        return return_obj

    @classmethod
    def create(cls, worksheet_id, gene):
        gene_type = GeneSymbol.get_type(gene) or 'gene'
        worksheet_gene_model = cls.objects.create(worksheet_id = worksheet_id, gene = gene, type=gene_type)
        worksheet_gene_model.save()

        return_obj = {
            'id'            : worksheet_gene_model.id,
            'gene'          : worksheet_gene_model.gene,
            'type'          : worksheet_gene_model.type,
            'date_created'  : formats.date_format(worksheet_gene_model.date_created, 'DATETIME_FORMAT')
        }
        return return_obj

    @classmethod
    def destroy(cls, workbook_id, worksheet_id, id, user):
        workbook_owner = Workbook.get_owner(id)
        if workbook_owner.id == user.id :
            model = cls.objects.get(id=id)
            model.destroy()
            return_obj = {
                'result'     : "Success",
            }
        else :
            return_obj = {
                'error'     : "you do not have access to update this worksheet",
            }
        return return_obj

    def destroy(self):
        self.delete()

class Worksheet_Variable_Manager(models.Manager):
    content = None

class Worksheet_variable(models.Model):
    id              = models.AutoField(primary_key=True)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False, on_delete=models.CASCADE)
    name            = models.CharField(max_length=2024, blank=False)
    type            = models.CharField(max_length=1024, blank=True, null=True)
    url_code        = models.CharField(max_length=2024, blank=False)
    feature         = models.ForeignKey(User_Feature_Definitions, null=True, blank=True, on_delete=models.CASCADE) #only used for user generated variable
    objects         = Worksheet_Variable_Manager()

    @classmethod
    def edit_list(cls, workbook_id, worksheet_id, variable_list, user):
        workbook_owner = Workbook.objects.get(id=workbook_id).get_owner()
        if workbook_owner.id == user.id:
            worksheet_model = Worksheet.objects.get(id=worksheet_id)

            #TODO delete all then resave not the most efficient
            variables = Worksheet_variable.objects.filter(worksheet=worksheet_model)
            for var in variables:
                var.delete()

            results = []
            for variable in variable_list:
                results.append(Worksheet_variable.create(worksheet=worksheet_model, variable=variable))

            return_obj = {
                'variables': results,
            }
        else :
            return_obj = {
                'error'     : "you do not have access to update this worksheet",
            }
        return return_obj

    @classmethod
    def create(cls, worksheet, variable):
        if type(variable) is not dict :
            dict_variable = {'feature_id': variable.feature_id, 'name': variable.name, 'code': variable.code, 'type': variable.type}
            variable = dict_variable

        worksheet_variable_model = cls.objects.create(worksheet_id = worksheet.id,
                                                      name = variable['name'],
                                                      url_code = variable['code'],
                                                      type = variable['type'])

        return_obj = {
            'id'            : worksheet_variable_model.id,
            'name'          : worksheet_variable_model.name,
            'code'          : worksheet_variable_model.url_code,
            'type'          : worksheet_variable_model.type,
            'date_created'  : formats.date_format(worksheet_variable_model.date_created, 'DATETIME_FORMAT')
        }

        if variable['feature_id'] is not None:
            worksheet_variable_model.feature_id = variable['feature_id']
            return_obj['feature_id'] = worksheet_variable_model.feature_id

        worksheet_variable_model.save()

        return return_obj

    @classmethod
    def destroy(cls, workbook_id, worksheet_id, id, user):
        workbook_owner = Workbook.get_owner(id)
        if workbook_owner.id == user.id :
            model = cls.objects.get(id=id)
            model.destroy()
            return_obj = {
                'result'     : "Success",
            }
        else :
            return_obj = {
                'error'     : "you do not have access to update this worksheet",
            }
        return return_obj


    def toJSON(self):
        j = {'id'       : self.id,
             'name'     : self.name,
             'type'     : self.type,
             'url_code' : self.url_code,
             'feature'  : self.feature_id,
             }
        return j


class Worksheet_Comment_Manager(models.Manager):
    content = None

class Worksheet_comment(models.Model):
    id              = models.AutoField(primary_key=True)
    worksheet       = models.ForeignKey(Worksheet, blank=False, on_delete=models.CASCADE)
    user            = models.ForeignKey(User, null=False, blank=False, on_delete=models.CASCADE)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    content         = models.CharField(max_length=2024, null=False)
    objects         = Worksheet_Comment_Manager()

    @classmethod
    def create(cls, worksheet_id, content, user):
        comment_model = cls.objects.create(worksheet_id = worksheet_id,
                                           content = content,
                                           user = user)

        comment_model.save()
        return_obj = {
            'first_name'    : user.first_name,
            'last_name'     : user.last_name,
            'date_created'  : formats.date_format(comment_model.date_created, 'DATETIME_FORMAT'),
            'content'       : escape(comment_model.content)
        }
        return return_obj

class Worksheet_Plot_Manager(models.Manager):
    content = None

class Worksheet_plot(models.Model):
    id              = models.AutoField(primary_key=True)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    type            = models.CharField(max_length=1024, null=True)
    worksheet       = models.ForeignKey(Worksheet, blank=False, null=True, on_delete=models.CASCADE)
    active          = models.BooleanField(default=True)
    settings_json   = models.TextField(blank=True, null=True)

    objects         = Worksheet_Plot_Manager()

    @classmethod
    def get_deep_plot(cls, id):
        model = Worksheet_plot.objects.get(id=id)
        return model

    #return the actual cohort models from a plot
    def get_cohorts(self):
        wpc = Worksheet_plot_cohort.objects.filter(plot=self)
        cohorts = []
        for c in wpc:
            cohorts.append(c.cohort.cohort)
        return cohorts

    def toJSON(self):
        j = {}
        if self.settings_json :
            j = ast.literal_eval(self.settings_json)
        j['id']         = self.id,
        j['type']       = self.type,
        j['worksheet']  = self.worksheet_id,
        j['active']     = self.active,
        j['cohort']     = []
        cohorts = Worksheet_plot_cohort.objects.filter(plot=self)
        for c in cohorts :
            j['cohort'].append(c.toJSON())

        return j

class Worksheet_Plot_Cohort_Manager(models.Manager):
    content = None

class Worksheet_plot_cohort(models.Model):
    id              = models.AutoField(primary_key=True)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    plot            = models.ForeignKey(Worksheet_plot, blank=True, null=True, related_name="worksheet_plot", on_delete=models.CASCADE)
    cohort          = models.ForeignKey(Worksheet_cohort, blank=True, null=True, related_name="worksheet_plot_cohorts", on_delete=models.CASCADE)
    objects         = Worksheet_Plot_Cohort_Manager()

    def toJSON(self):
        j = {'id'        : self.id,
             'plot'      : self.plot.id,
             'cohort'    : self.cohort.toJSON(),
             }

        return j

@admin.register(Workbook)
class WorkbookAdmin(admin.ModelAdmin):
    list_display = ('id','name','description','date_created','last_date_saved', 'is_public')
    exclude = ('shared',)

@admin.register(Worksheet)
class WorksheetAdmin(admin.ModelAdmin):
    list_display = ('id','name','description','date_created','last_date_saved','workbook')