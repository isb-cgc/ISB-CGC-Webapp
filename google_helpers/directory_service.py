from oauth2client.client import SignedJwtAssertionCredentials
from googleapiclient import discovery
from django.conf import settings
from httplib2 import Http


PEM_FILE = settings.PEM_FILE
CLIENT_EMAIL = settings.CLIENT_EMAIL
DIRECTORY_SCOPES = [
    'https://www.googleapis.com/auth/admin.directory.group',
    'https://www.googleapis.com/auth/admin.directory.group.member',
    'https://www.googleapis.com/auth/admin.directory.group.member.readonly',
    'https://www.googleapis.com/auth/admin.directory.group.readonly'
]


def get_directory_resource():

    client_email = CLIENT_EMAIL
    with open(PEM_FILE) as f:
        private_key = f.read()

    credentials = SignedJwtAssertionCredentials(
        client_email,
        private_key,
        DIRECTORY_SCOPES,
        sub='kelly@isb-cgc.org'
        )

    http_auth = credentials.authorize(Http())

    # todo: this has thrown AccessTokenRefreshError at least once
    service = discovery.build('admin', 'directory_v1', http=http_auth)
    return service, http_auth