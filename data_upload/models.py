import operator

from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q
from google_helpers import cloud_file_storage
from django.core.files.storage import FileSystemStorage
from django.conf import settings

storage_system = FileSystemStorage()
if settings.USE_CLOUD_STORAGE is not 'False':
    storage_system = cloud_file_storage.CloudFileStorage()

class UserUpload(models.Model):
    id = models.AutoField(primary_key=True)
    owner = models.ForeignKey(User, null=False, blank=False)
    status = models.TextField(default="Pending")

class UserUploadedFile(models.Model):
    id = models.AutoField(primary_key=True)
    upload = models.ForeignKey(UserUpload)
    file = models.FileField(storage=storage_system)
