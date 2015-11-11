import operator

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q

from cohorts.models import Cohort

# Create your models here.
class Workbook(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False)
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

class Worksheet(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.TextField(null=False, blank=False)
    owner = models.ForeignKey(User)
    workbook = models.ForeignKey(Workbook)
    cohort = models.ForeignKey(Cohort, null=False, blank=False)
    # genes = models.ForeignKey(Gene, blank=False, related_name='worksheet_gene')
    # variables = models.ForeignKey(Variable, blank=False, related_name='worksheet_variable')
    # visualizations = models.ForeignKey(Visualization, blank=False, related_name='worksheet_visualization')
    last_date_saved = models.DateTimeField(auto_now_add=True)
    date_created = models.DateTimeField(auto_now_add=True)

class Worksheet_Comment(models.Model):
    id = models.AutoField(primary_key=True)
    worksheet = models.ForeignKey(Cohort, blank=False, related_name='worksheet_comment')
    user = models.ForeignKey(User, null=False, blank=False)
    date_created = models.DateTimeField(auto_now_add=True)
    content = models.CharField(max_length=1024, null=False)

class Workbook_Last_View(models.Model):
    workbook = models.ForeignKey(Workbook, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    last_view = models.DateTimeField(auto_now_add=True, auto_now=True)
