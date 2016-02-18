"""
Data Upload Service

Uploads user or other data to either the cloud or the local environment
depending on the environment.
"""

from google_helpers import storage_service
from googleapiclient import http
from django.conf import settings

class CloudUploadService():

    def __init__(self):
        self.storage = storage_service.get_storage_resource()

    def upload(self, file, filename=None):
        media = http.MediaInMemoryUpload(file)
        self.storage.objects().insert(
            bucket=settings.GCLOUD_BUCKET,
            name=filename,
            media_body=media
        ).execute()

class LocalUploadService():

    def __init__(self):
        pass

    def upload(self, file, filename=None):
        pass


class UploadService():

    def __init__(self):
        if settings.GCLOUD_BUCKET is not None:
            self.service = CloudUploadService()
        else:
            self.service = LocalUploadService()

    def upload(self, file, filename=None):
        return self.service.upload