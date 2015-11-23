import operator

from django.db import models
from django.contrib.auth.models import User
from cohorts.models import Cohort

#project
# class Project(models.Model):
#     id = models.AutoField(primary_key=True)
#     name = models.TextField(null=False, blank=False)
#     description = models.CharField(max_length=2024, null=False)
#     owner = models.ForeignKey(User, null=False, blank=False)
#     date_created = models.DateTimeField(auto_now_add=True)
#     modified_date = models.DateTimeField(auto_now=True)
#
# #study
# class Study(models.Model):
#     id = models.AutoField(primary_key=True)
#     name = models.TextField(null=False, blank=False)
#     description = models.CharField(max_length=2024, null=False)
#     project = models.ForeignKey(Project, null=False, blank=False)
#     date_created = models.DateTimeField(auto_now_add=True)
#     modified_date = models.DateTimeField(auto_now=True)

#this is a temporary solution until we work out the Gene Master list and feature def
# class Gene(models.Model):
#     id = models.AutoField(primary_key=True)
#     name = models.TextField(null=False, blank=False)
#
# class Variable(models.Model):
#     id = models.AutoField(primary_key=True)
#     name = models.TextField(null=False, blank=False)
#     project = models.ForeignKey(Project, null=False, blank=False)
#     feature_col_name = models.TextField(null=False, blank=False)
#     feature_table_name = models.TextField(null=False, blank=False)

# Create your models here.
class Workbook(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False)
    description = models.CharField(max_length=2024, null=False)
    owner = models.ForeignKey(User)
    date_created = models.DateTimeField(auto_now_add=True)
    last_date_saved = models.DateTimeField(auto_now_add=True)

class Worksheet(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False, blank=False)
    description = models.CharField(max_length=2024, null=False)
    owner = models.ForeignKey(User, null=False, blank=False)
    workbook = models.ForeignKey(Workbook, null=False, blank=False)
    last_date_saved = models.DateTimeField(auto_now_add=True)
    date_created = models.DateTimeField(auto_now_add=True)

class cohorts(models.Model):
    worksheet = models.ForeignKey(Worksheet, null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    cohort    = models.ForeignKey(Cohort, null=False, blank=False)

class gene_list(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    worksheet = models.ForeignKey(Worksheet, null=False, blank=False)
    genes = models.ManyToManyField(Gene)

class variable_list(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    worksheet = models.ForeignKey(Worksheet, null=False, blank=False)
    variables = models.ManyToManyField(Variable)

class Comment(models.Model):
    id = models.AutoField(primary_key=True)
    worksheet = models.ForeignKey(Cohort, blank=False, related_name='worksheet_comment')
    user = models.ForeignKey(User, null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    modified_date = models.DateTimeField(auto_now=True)
    content = models.CharField(max_length=2024, null=False)


