import operator

from django.db import models
from django.contrib.auth.models import User
from django.contrib import admin
from cohorts.models import Cohort
from variables.models import Variable
from genes.models import Gene
from projects.models import Project
from cohorts.models import Cohort
from django.utils import formats

# Create your models here.
class WorkbookManager(models.Manager):
    def search(self, search_terms):
        terms = [term.strip() for term in search_terms.split()]
        q_objects = []
        for term in terms:
            q_objects.append(Q(name__icontains=term))

        # Start with a bare QuerySet
        qs = self.get_queryset()

        # Use operator's or_ to string together all of your Q objects.
        return qs.filter(reduce(operator.and_, [reduce(operator.or_, q_objects), Q(active=True)]))

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
    def search(self, search_terms):
        terms = [term.strip() for term in search_terms.split()]
        q_objects = []
        for term in terms:
            q_objects.append(Q(name__icontains=term))

        # Start with a bare QuerySet
        qs = self.get_queryset()

        # Use operator's or_ to string together all of your Q objects.
        return qs.filter(reduce(operator.and_, [reduce(operator.or_, q_objects), Q(active=True)]))


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

    def destroy(self):
        self.delete()

    # '''
    # add a gene_list to a workbook
    # '''
    # def add_gene_list(self, request, user=None):
    #     if user is None:
    #         user = request.user
    #     if request.worksheet_name and request.worksheet_description:
    #          worksheet = Worksheet(name=request.worksheet_name, description=request.worksheet_description)
    #
    # '''
    # remove a gene_list from a workbook
    # '''
    # def remove_gene_list(self, request, user=None):
    #     if user is None:
    #         user = request.user
    #     if request.worksheet_name and request.worksheet_description:
    #          worksheet = Worksheet(name=request.worksheet_name, description=request.worksheet_description)
    #
    # '''
    # add a variable_list to a workbook
    # '''
    # def add_variable_list(self, request, user=None):
    #     if user is None:
    #         user = request.user
    #     if request.worksheet_name and request.worksheet_description:
    #          worksheet = Worksheet(name=request.worksheet_name, description=request.worksheet_description)
    #
    # '''
    # remove a variable_list from a workbook
    # '''
    # def remove_variable_list(self, request, user=None):
    #     if user is None:
    #         user = request.user
    #     if request.worksheet_name and request.worksheet_description:
    #          worksheet = Worksheet(name=request.worksheet_name, description=request.worksheet_description)
    #
    # '''
    # add a cohort to a workbook
    # '''
    # def add_cohort(self, request, user=None):
    #     if user is None:
    #         user = request.user
    #     if request.worksheet_name and request.worksheet_description:
    #          worksheet = Worksheet(name=request.worksheet_name, description=request.worksheet_description)
    #
    # '''
    # remove a cohort from a workbook
    # '''
    # def remove_cohort(self, request, user=None):
    #     if user is None:
    #         user = request.user
    #     if request.worksheet_name and request.worksheet_description:
    #          worksheet = Worksheet(name=request.worksheet_name, description=request.worksheet_description)


class Worksheet_cohorts(models.Model):
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    cohort          = models.ForeignKey(Cohort, null=False, blank=False)

class Worksheet_gene_list(models.Model):
    id              = models.AutoField(primary_key=True)
    name            = models.TextField(null=False, blank=False)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False)
    genes           = models.ManyToManyField(Gene)

class Worksheet_variable_list(models.Model):
    id              = models.AutoField(primary_key=True)
    name            = models.TextField(null=False, blank=False)
    date_created    = models.DateTimeField(auto_now_add=True)
    modified_date   = models.DateTimeField(auto_now=True)
    worksheet       = models.ForeignKey(Worksheet, null=False, blank=False)
    variables       = models.ManyToManyField(Variable)

class Worksheet_Comment_Manager(models.Manager):
    def search(self, search_terms):
        terms = [term.strip() for term in search_terms.split()]
        q_objects = []
        for term in terms:
            q_objects.append(Q(name__icontains=term))

        # Start with a bare QuerySet
        qs = self.get_queryset()

        # Use operator's or_ to string together all of your Q objects.
        return qs.filter(reduce(operator.and_, [reduce(operator.or_, q_objects), Q(active=True)]))

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

@admin.register(Workbook)
class WorkbookAdmin(admin.ModelAdmin):
    list_display = ('id','name','description','date_created','last_date_saved')

@admin.register(Workbook_Perms)
class WorkbookPermAdmin(admin.ModelAdmin):
    list_display = ('id','workbook', 'perm','user')

@admin.register(Worksheet)
class WorksheetAdmin(admin.ModelAdmin):
    list_display = ('id','name','description','date_created','last_date_saved','workbook')