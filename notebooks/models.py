"""
Copyright 2019, Institute for Systems Biology

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

from django.contrib import admin
from django.contrib.auth.models import User
from django.db import models

import logging
from accounts.models import GoogleProject
logger = logging.getLogger('main_logger')

# Create your models here.
class NotebookManager(models.Manager):
    content = None

class Notebook(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=2024,null=False)
    file_path = models.CharField(max_length=1024, null=False)
    description = models.CharField(max_length=2024, null=False)
    keywords = models.CharField(max_length=2024, null=False)
    date_created = models.DateTimeField(auto_now_add=True)
    last_date_saved = models.DateTimeField(auto_now=True)
    active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=False)
    owner = models.ForeignKey(User)
    objects = NotebookManager()

    @classmethod
    def create(cls, name, file_path, description, keywords, user):

        notebook_model = cls.objects.create(name=name, file_path=file_path, description=description, keywords=keywords, owner=user, active=True, is_public=False)
        notebook_model.save()

        return notebook_model

    @classmethod
    def edit(cls, id, name, description, keywords, file_path):
        notebook_model = cls.objects.get(id=id)
        notebook_model.name = name
        notebook_model.description = description
        notebook_model.keywords = keywords
        notebook_model.file_path = file_path
        print('edit: file_path: '+file_path)
        notebook_model.save()
        return notebook_model

    @classmethod
    def add(cls, id, user):
        notebook_model = cls.objects.get(id=id)
        if not notebook_model.isin_notebooklist(user=user):
            obj = Notebook_Added.objects.create(notebook=notebook_model, user=user)
            obj.save()
        return notebook_model

    @classmethod
    def remove(cls, id, user):
        notebook_model = cls.objects.get(id=id)
        if notebook_model.isin_notebooklist(user=user):
            obj = Notebook_Added.objects.filter(notebook=notebook_model, user=user)
            obj.delete()
        return notebook_model

    @classmethod
    def copy(cls, id, user):
        notebook_model = cls.objects.get(id=id)
        notebook_copy  = cls.create(notebook_model.name + " [copy]", notebook_model.file_path, notebook_model.description,  notebook_model.keywords, user)
        return notebook_copy


    @classmethod
    def destroy(cls, id):
        notebook_model = cls.objects.get(id=id)
        notebook_model.delete()
        return notebook_model

    @classmethod
    def get_owner(cls, id):
        notebook_model = cls.objects.get(id=id)
        return notebook_model.owner


    # checks if notebook is in my notebook list
    def isin_notebooklist(self, user):
        return user == self.owner or Notebook_Added.objects.filter(notebook=self, user=user)


class Notebook_Added(models.Model):
    notebook = models.ForeignKey(Notebook, null=False, blank=False)
    user = models.ForeignKey(User, null=False, blank=True)

class InstanceManager(models.Manager):
    content = None

class Instance(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=2024, null=False)
    user = models.ForeignKey(User)
    vm_username = models.CharField(max_length=20, null=False)
    gcp = models.ForeignKey(GoogleProject)
    zone = models.CharField(max_length=20, null=False)
    active = models.BooleanField(default=True)
    objects = InstanceManager()

    @classmethod
    def create(cls, name, user, vm_username, project_id, zone):
        gcp = GoogleProject.objects.get(project_id=project_id, active=True)
        instance_model = cls.objects.create(name=name, user=user, vm_username=vm_username, gcp=gcp, zone=zone, active=True)
        instance_model.save()
        return instance_model

    @classmethod
    def delete(cls, name, user, vm_username, project_id, zone):
        instance_model = cls.objects.filter(name=name, user=user, vm_username=vm_username, zone=zone,
                                            active=True)
        instance_model.delete()
        return instance_model
