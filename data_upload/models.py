from django.db import models
from django.contrib import admin
from django.contrib.auth.models import User
from google_helpers import cloud_file_storage
from django.core.files.storage import FileSystemStorage
from django.core.exceptions import ValidationError
from django.conf import settings

storage_system = FileSystemStorage()
if settings.USE_CLOUD_STORAGE is not 'False':
    storage_system = cloud_file_storage.CloudFileStorage()

class UserUpload(models.Model):
    id = models.AutoField(primary_key=True)
    owner = models.ForeignKey(User, null=False, blank=False)
    status = models.CharField(max_length=50,default="Pending")
    jobURL = models.CharField(max_length=250,null=True)

class UserUploadedFile(models.Model):
    id = models.AutoField(primary_key=True)
    upload = models.ForeignKey(UserUpload)
    file = models.FileField(storage=storage_system)

class FieldDataType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=120)
    dbString = models.CharField(max_length=64)

    def __str__(self):
        return self.name

class ControlledFileField(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=120)
    type = models.ForeignKey(FieldDataType)

class FileDataType(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200)
    fields = models.ManyToManyField(ControlledFileField)

@admin.register(ControlledFileField)
class ControlledFileFieldAdmin(admin.ModelAdmin):
    list_display = ('name','type')

@admin.register(FieldDataType)
class FieldDataTypeAdmin(admin.ModelAdmin):
    list_display = ('name',)