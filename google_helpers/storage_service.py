from oauth2client.client import GoogleCredentials
from googleapiclient import discovery
from django.conf import settings

STORAGE_SCOPES = [
    'https://www.googleapis.com/auth/devstorage.read_only',
    'https://www.googleapis.com/auth/devstorage.read_write',
    'https://www.googleapis.com/auth/devstorage.full_control'
]


def get_storage_resource(perms=None):
    credentials = GoogleCredentials.get_application_default()
    # todo: if perms == 'r', STORAGE_SCOPES[:1]
    # if perms == 'rw', STORAGE_SCOPES[:2]
    #
    # credentials = GoogleCredentials.from_stream(
    #     settings.GOOGLE_APPLICATION_CREDENTIALS).create_scoped(STORAGE_SCOPES)
    return discovery.build('storage', 'v1', credentials=credentials)
