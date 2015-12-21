import operator

from django.db import models
from django.contrib.auth.models import User
from django.contrib import admin
from cohorts.models import Cohort
from variables.models import Variable
from genes.models import Gene
from projects.models import Project, Study
from cohorts.models import Cohort
from django.utils import formats

from django.conf import settings
debug = settings.DEBUG
if settings.DEBUG :
    import sys

# Create your models here.
class WorkbookManager(models.Manager):
    content = None

class Workbook(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=2024,null=False)
    description = models.CharField(max_length=2024, null=False)
    date_created = models.DateTimeField(auto_now_add=True)
    last_date_saved = models.DateTimeField(auto_now_add=True)
    objects = WorkbookManager()

    @classmethod
    def create(cls, name, description, user):
        workbook_model = cls.objects.create(name=name, description=description)
        workbook_model.save()

        #create permissions for that workbook
        workbook_perm_model = Workbook_Perms.objects.create(workbook = workbook_model,
                                                      user = user,
                                                      perm = Workbook_Perms.OWNER)
        workbook_perm_model.save()
        return workbook_model

    @classmethod
    def createDefault(cls, name, description, user):
        workbook_model = cls.create(name, description, user)
        worksheet_model = Worksheet.objects.create(name="default worksheet",
                                                   description="this is a default description",
                                                   workbook=workbook_model)

        return workbook_model

    @classmethod
    def edit(cls, id, name, description):
        workbook_model = cls.objects.get(id=id)
        workbook_model.name = name
        workbook_model.description = description
        workbook_model.save()
        return workbook_model

    @classmethod
    def copy(cls, id, user):
        workbook_model = cls.objects.get(id=id)
        workbook_copy  = cls.create(workbook_model.name + " copy", workbook_model.description, user)

        worksheets = workbook_model.get_worksheets()
        for worksheet in worksheets:
            copy = Worksheet.copy(id=worksheet.id)
            copy.workbook = workbook_copy;
            copy.save();

        return workbook_copy

    @classmethod
    def destroy(cls, id):
        workbook_model = cls.objects.get(id=id)

        worksheets = workbook_model.get_worksheets()
        for worksheet in worksheets:
            worksheet.destroy()

        workbook_model.delete()
        return workbook_model

    @classmethod
    def share(cls, id, user_array):
        workbook_model = cls.objects.get(id=id)
        #validate user array
        #if the user does nto exist then send an email
        return workbook_model

    @classmethod
    def get_owner(cls, id):
        workbook_model = cls.objects.get(id=id)
        return workbook_model.get_owner()

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
        return self.workbook_perms_set.filter(perm=Workbook_Perms.OWNER)[0].user

    def get_worksheets(self):
        return self.worksheet_set.filter(workbook=self)

    def get_shares(self):
        return self.workbook_perms_set.filter(perm=Workbook_Perms.READER)

class Workbook_Last_View(models.Model):
    workbook = models.ForeignKey(Workbook, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    test = models.DateTimeField(auto_now_add=True, null=True)
    last_view = models.DateTimeField(auto_now_add=True, auto_now=True)

class Workbook_Perms(models.Model):
    READER = 'READER'
    OWNER = 'OWNER'
    PERMISSIONS = (
        (READER, 'Reader'),
        (OWNER, 'Owner')
    )

    workbook = models.ForeignKey(Workbook, null=False, blank=False)
    user = models.ForeignKey(User, null=False, blank=True)
    perm = models.CharField(max_length=10, choices=PERMISSIONS, default=READER)

class WorksheetManager(models.Manager):
    content = None

class Worksheet(models.Model):
    id              = models.AutoField(primary_key=True)
    name            = models.CharField(max_length=2024, blank=False)
    description     = models.CharField(max_length=2024, null=False)
    workbook        = models.ForeignKey(Workbook, null=False, blank=False)
    last_date_saved = models.DateTimeField(auto_now_add=True)
    date_created    = models.DateTimeField(auto_now_add=True)
    objects         = WorksheetManager()

    @classmethod
    def destroy(cls, id):
        worksheet_model = cls.objects.get(id=id)
        worksheet_model.destroy()
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

    def get_genes(self):
        return self.worksheet_gene_set.filter(worksheet=self)

    def get_cohorts(self):
        return  [Cohort.objects.get_all_tcga_cohort()]
        #return self.worksheet_cohort_set.filter(worksheet=self)

    def destroy(self):
        self.delete()

class Worksheet_cohort(models.Model):
    id              = models.AutoField(primary_key=True)
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    cohort          = models.ForeignKey(Cohort)

    @classmethod
    def edit_list(cls, worksheet_id, cohort_list, user):
        worksheet_model = Worksheet.objects.get(id=worksheet_id)
        if worksheet_model.owner.id == user.id :
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
    #TODO
    def destroy(cls, id):
        worksheet_model = cls.objects.get(id=id)
        worksheet_model.destroy()
        return worksheet_model

    def destroy(self):
        self.delete()

class Worksheet_gene(models.Model):
    id              = models.AutoField(primary_key=True)
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    gene            = models.CharField(max_length=2024, blank=False)

    @classmethod
    def edit_list(cls, worksheet_id, gene_list, user):
        worksheet_model = Worksheet.objects.get(id=worksheet_id)
        if worksheet_model.owner.id == user.id :
            #TODO delete all then resave not the most efficient
            genes = Worksheet_variable.objects.filter(worksheet=worksheet_model)
            for gene in genes :
                gene.destroy();

            results = []
            for gene in gene_list :
                results.append(Worksheet_gene.create(worksheet_id, gene))

            return_obj = {
                'variables' : results,
            }
        else :
            return_obj = {
                'error'     : "you do not have access to update this worksheet",
            }
        return return_obj

    @classmethod
    def create(cls, worksheet_id, gene):
        worksheet_gene_model = cls.objects.create(worksheet_id = worksheet_id, gene = gene)
        worksheet_gene_model.save()

        return_obj = {
            'id'            : worksheet_gene_model.id,
            'gene'          : worksheet_gene_model.gene,
            'date_created'  : formats.date_format(worksheet_gene_model.date_created, 'DATETIME_FORMAT')
        }
        return return_obj

    @classmethod
    def destroy(cls, id):
        model = cls.objects.get(id=id)
        model.destroy()
        return model

    def destroy(self):
        self.delete()

class Worksheet_Variable_Manager(models.Manager):
    content = None

class Worksheet_variable(models.Model):
    id              = models.AutoField(primary_key=True)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False)
    name            = models.CharField(max_length=2024, blank=False)
    project         = models.ForeignKey(Project, null=True, blank=True)
    study           = models.ForeignKey(Study, null=True, blank=True)
    objects         = Worksheet_Variable_Manager()

    @classmethod
    def edit_list(cls, workbook_id, worksheet_id, variable_list, user):
        workbook_owner = Workbook.objects.get(id=workbook_id).get_owner()
        if workbook_owner.id == user.id :
            worksheet_model = Worksheet.objects.get(id=worksheet_id
                                                    )
            #TODO delete all then resave not the most efficient
            variables = Worksheet_variable.objects.filter(worksheet=worksheet_model)
            for var in variables :
                var.destroy();

            results = []
            for variable in variable_list :
                results.append(Worksheet_variable.create(worksheet=worksheet_model, variable=variable))

            return_obj = {
                'variables' : results,
            }
        else :
            return_obj = {
                'error'     : "you do not have access to update this worksheet",
            }
        return return_obj

    @classmethod
    def create(cls, worksheet, variable):
        if variable['project_id'] == '-1' and variable['study_id'] == '-1' :
            worksheet_variable_model = cls.objects.create(worksheet_id = worksheet.id,
                                                          name = variable['name'])
            worksheet_variable_model.save()

            return_obj = {
                'id'            : worksheet_variable_model.id,
                'name'          : worksheet_variable_model.name,
                'date_created'  : formats.date_format(worksheet_variable_model.date_created, 'DATETIME_FORMAT')
            }
        else:
            project_model = Project.objects.get(id=variable['project_id'])
            study_model = Study.objects.get(id=variable['study_id'])
            worksheet_variable_model = cls.objects.create(worksheet_id = worksheet.id,
                                                      name          = variable.name,
                                                      project       = project_model,
                                                      study         = study_model)
            worksheet_variable_model.save()

            return_obj = {
                'id'            : worksheet_variable_model.id,
                'name'          : worksheet_variable_model.name,
                'project'       : worksheet_variable_model.project.id,
                'study'         : worksheet_variable_model.study.id,
                'date_created'  : formats.date_format(worksheet_variable_model.date_created, 'DATETIME_FORMAT')
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

class Worksheet_Comment_Manager(models.Manager):
    content = None

class Worksheet_comment(models.Model):
    id              = models.AutoField(primary_key=True)
    worksheet       = models.ForeignKey(Worksheet, blank=False)
    user            = models.ForeignKey(User, null=False, blank=False)
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
            'content'       : comment_model.content
        }
        return return_obj

# DESIGN COMMENTARY :
# visualizations are currently coupled to worksheets via 1:many.  This could be incorrect as there is potential for useing
# plots eventually outside worksheets. For the current design, this is not possible as worksheets contain the variables,
# genes, and cohorts for the plot.  A future design might be to refactor the variables, genes and plots to be coupled to
# plot instances rather than worksheets
class Worksheet_Plot_Manager(models.Manager):
    content = None

class Worksheet_plot(models.Model):
    id              = models.AutoField(primary_key=True)
    worksheet       = models.ForeignKey(Worksheet, blank=False)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    title           = models.CharField(max_length=100, null=False)
    color_by        = models.CharField(max_length=1024, null=True)
    plot_type       = models.CharField(max_length=1024, null=True)
    objects         = Worksheet_Plot_Manager()

# This is storage of variable selection on dimensions of a plot.  A plot can have N number of dimensions
# However only certain variable types can be added to specific plots
class Plot_dimension(models.Model):
    id              = models.AutoField(primary_key=True)
    name            = models.CharField(max_length=100, null=False)
    plot            = models.ForeignKey(Worksheet_plot, blank=False)
    variable        = models.ForeignKey(Worksheet_variable, blank=False)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)


@admin.register(Workbook)
class WorkbookAdmin(admin.ModelAdmin):
    list_display = ('id','name','description','date_created','last_date_saved')

@admin.register(Workbook_Perms)
class WorkbookPermAdmin(admin.ModelAdmin):
    list_display = ('id','workbook', 'perm','user')

@admin.register(Worksheet)
class WorksheetAdmin(admin.ModelAdmin):
    list_display = ('id','name','description','date_created','last_date_saved','workbook')