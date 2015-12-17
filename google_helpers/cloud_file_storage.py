"""
Cloud file storage is a custom file storage object to store files on GCS
"""

import uuid
import random
import string
from datetime import datetime
from django.conf import settings
from django.core.files.storage import Storage
from google_helpers import storage_service
from googleapiclient import http


class CloudFileStorage(Storage):

    def __init__(self):
        self.storage = storage_service.get_storage_resource()

    def _open(self, name, mode):
        filepath = name.split('/')
        bucket = filepath.pop(0)
        name = '/'.join(filepath)
        return self.storage.objects().get(bucket=bucket, object=name).execute()

    def _save(self, name, content):
        media = http.MediaInMemoryUpload(content.read())
        filepath = name.split('/')
        bucket = filepath.pop(0)
        name = '/'.join(filepath)
        self.storage.objects().insert(
            bucket=bucket,
            name=name,
            media_body=media
        ).execute()
        return bucket + '/' + name

    def get_available_name(self, name):
        name = name.replace("./", "")
        filepath = name.split('/')
        bucket = filepath.pop(0)
        name = '/'.join(filepath)
        time = datetime.now().strftime('%Y%m%d-%H%M%S%f')
        random_str = ''.join(random.SystemRandom().choice(string.ascii_letters) for _ in range(8))
        name = time + '-' + random_str + '-' + name
        name = settings.MEDIA_FOLDER + name
        return bucket + '/' + name

    def deconstruct(self):
        return ('google_helpers.cloud_file_storage.CloudFileStorage', [], {})