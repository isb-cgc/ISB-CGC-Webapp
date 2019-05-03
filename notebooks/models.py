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
    def deep_get(cls, id):
        notebook_model            = cls.objects.get(id=id)
        notebook_model.owner      = notebook_model.get_owner()

        return notebook_model

    @classmethod
    def create(cls, name, file_path, description, keywords, user):

        notebook_model = cls.objects.create(name=name, file_path=file_path, description=description, keywords=keywords, owner=user)
        notebook_model.save()

        return notebook_model

    # @classmethod
    # def createDefault(cls, name, description, keywords, user):
    #     notebook_model = cls.create(name, description, keywords, user)
    #
    #     return notebook_model

    @classmethod
    def edit(cls, id, name, description, keywords, file_path):
        notebook_model = cls.objects.get(id=id)
        notebook_model.name = name
        notebook_model.description = description
        notebook_model.keywords = keywords
        notebook_model.file_path = file_path
        notebook_model.save()
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

    def get_owner(self):
        return self.owner


# class Notebook_Last_View(models.Model):
#     notebook = models.ForeignKey(Notebook, blank=False)
#     user = models.ForeignKey(User, null=False, blank=False)
#     test = models.DateTimeField(auto_now_add=True, null=True)
#     last_view = models.DateTimeField(auto_now=True)


# @admin.register(Notebook)
# class NotebookAdmin(admin.ModelAdmin):
#     list_display = ('id','name','description','date_created','last_date_saved', 'is_public')
