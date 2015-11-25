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

storage = storage_service.get_storage_resource()

class CloudFileStorage(Storage):

    def __init__(self):
        pass

    def _open(self, name, mode):
        return storage.objects().get(bucket=settings.GCLOUD_BUCKET, object=name).execute()

    def _save(self, name, content):
        media = http.MediaInMemoryUpload(content)
        storage.objects().insert(
            bucket=settings.GCLOUD_BUCKET,
            name=name,
            media_body=media
        ).execute()
        return name

    def get_available_name(self, name):
        name = name.replace("./", "")
        time = datetime.now().strftime('%Y%m%d-%H%M%S%f')
        random_str = ''.join(random.SystemRandom().choice(string.ascii_letters) for _ in range(8))
        name = time + '-' + random_str + '-' + name
        name = settings.MEDIA_FOLDER + name
        return name
