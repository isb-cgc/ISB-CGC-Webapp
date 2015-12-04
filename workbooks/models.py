import operator

from django.db import models
from django.contrib.auth.models import User
from cohorts.models import Cohort
from variables.models import Variable
from genes.models import Gene
from projects.models import Project, Study
from cohorts.models import Cohort


# Create your models here.
class Workbook(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False)
    description = models.CharField(max_length=2024, null=False)
    owner = models.ForeignKey(User)
    date_created = models.DateTimeField(auto_now_add=True)
    last_date_saved = models.DateTimeField(auto_now_add=True)

    '''
    Sets the last viewed time for a cohort
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

    # '''
    # Adds a worksheet to a workbook
    # '''
    # def add_worksheet(self, request, user=None):
    #     if user is None:
    #         user = request.user
    #     if request.worksheet_name and request.worksheet_description:
    #          worksheet = Worksheet(name=request.worksheet_name, description=request.worksheet_description)
    #
    # '''
    # remove a worksheet to a workbook
    # '''
    # def remove_worksheet(self, request, user=None):
    #     if user is None:
    #         user = request.user
    #     if request.worksheet_name and request.worksheet_description:
    #          worksheet = Worksheet(name=request.worksheet_name, description=request.worksheet_description)


class Worksheet(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False, blank=False)
    description = models.CharField(max_length=2024, null=False)
    owner = models.ForeignKey(User, null=False, blank=False)
    workbook = models.ForeignKey(Workbook, null=False, blank=False)
    last_date_saved = models.DateTimeField(auto_now_add=True)
    date_created = models.DateTimeField(auto_now_add=True)

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
    worksheet = models.ForeignKey(Worksheet, null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    cohort    = models.ForeignKey(Cohort, null=False, blank=False)

class Worksheet_gene_list(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    worksheet = models.ForeignKey(Worksheet, null=False, blank=False)
    genes = models.ManyToManyField(Gene)

class Worksheet_variable_list(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    worksheet = models.ForeignKey(Worksheet, null=False, blank=False)
    variables = models.ManyToManyField(Variable)

class Worksheet_comment(models.Model):
    id = models.AutoField(primary_key=True)
    worksheet = models.ForeignKey(Cohort, blank=False, related_name='worksheet_comment')
    user = models.ForeignKey(User, null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    content = models.CharField(max_length=2024, null=False)

class Workbook_Last_View(models.Model):
    workbook = models.ForeignKey(Workbook, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    test = models.DateTimeField(auto_now_add=True, null=True)
    last_view = models.DateTimeField(auto_now_add=True, auto_now=True)
