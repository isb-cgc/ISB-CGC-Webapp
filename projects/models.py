import operator

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q
from data_upload.models import UserUpload
from accounts.models import GoogleProject, Bucket

class ProjectManager(models.Manager):
    def search(self, search_terms):
        terms = [term.strip() for term in search_terms.split()]
        q_objects = []
        for term in terms:
            q_objects.append(Q(name__icontains=term))

        # Start with a bare QuerySet
        qs = self.get_queryset()

        # Use operator's or_ to string together all of your Q objects.
        return qs.filter(reduce(operator.and_, [reduce(operator.or_, q_objects), Q(active=True)]))

class Project(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255,null=True)
    description = models.TextField(null=True, blank=True)
    active = models.BooleanField(default=True)
    last_date_saved = models.DateTimeField(auto_now_add=True)
    objects = ProjectManager()
    owner = models.ForeignKey(User)
    is_public = models.BooleanField(default=False)

    '''
    Sets the last viewed time for a cohort
    '''
    def mark_viewed (self, request, user=None):
        if user is None:
            user = request.user

        last_view = self.project_last_view_set.filter(user=user)
        if last_view is None or len(last_view) is 0:
            last_view = self.project_last_view_set.create(user=user)
        else:
            last_view = last_view[0]

        last_view.save(False, True)

        return last_view

    def __str__(self):
        return self.name

class Project_Last_View(models.Model):
    project = models.ForeignKey(Project, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    last_view = models.DateTimeField(auto_now_add=True, auto_now=True)

class Study(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    active = models.BooleanField(default=True)
    last_date_saved = models.DateTimeField(auto_now_add=True)
    owner = models.ForeignKey(User)
    project = models.ForeignKey(Project)
    extends = models.ForeignKey("self", null=True, blank=True)

    '''
    Sets the last viewed time for a cohort
    '''
    def mark_viewed (self, request, user=None):
        if user is None:
            user = request.user

        last_view = self.study_last_view_set.filter(user=user)
        if last_view is None or len(last_view) is 0:
            last_view = self.study_last_view_set.create(user=user)
        else:
            last_view = last_view[0]

        last_view.save(False, True)

        return last_view

    def get_status (self):
        status = 'Complete'
        for datatable in self.user_data_tables_set.all():
            if datatable.data_upload is not None and datatable.data_upload.status is not 'Complete':
                status = datatable.data_upload.status
        return status

    def get_file_count(self):
        count = 0
        for datatable in self.user_data_tables_set.all():
            if datatable.data_upload is not None:
                count += datatable.data_upload.useruploadedfile_set.count()
        return count

    def __str__(self):
        return self.name

class Study_Last_View(models.Model):
    study = models.ForeignKey(Study, blank=False)
    user = models.ForeignKey(User, null=False, blank=False)
    last_view = models.DateTimeField(auto_now_add=True, auto_now=True)

class User_Data_Tables(models.Model):
    metadata_data_table = models.CharField(max_length=200)
    metadata_samples_table = models.CharField(max_length=200)
    user = models.ForeignKey(User, null=False)
    study = models.ForeignKey(Study, null=False)
    data_upload = models.ForeignKey(UserUpload, null=True, blank=True)
    google_project = models.ForeignKey(GoogleProject)
    google_bucket = models.ForeignKey(Bucket)


class User_Feature_Definitions(models.Model):
    study = models.ForeignKey(Study, null=False)
    feature_name = models.CharField(max_length=200)
    bq_map_id = models.CharField(max_length=200)
    is_numeric = models.BooleanField(default=False)
