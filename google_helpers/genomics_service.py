from oauth2client.client import SignedJwtAssertionCredentials, GoogleCredentials
from googleapiclient import discovery
from django.conf import settings
from httplib2 import Http


PEM_FILE = settings.PEM_FILE
CLIENT_EMAIL = settings.CLIENT_EMAIL

GENOMICS_SCOPES = [
    'https://www.googleapis.com/auth/genomics',
    'https://www.googleapis.com/auth/genomics.readonly',
    'https://www.googleapis.com/auth/devstorage.read_write'
]


# todo: take out http_auth?
def get_genomics_resource():
    client_email = CLIENT_EMAIL
    with open(PEM_FILE) as f:
        private_key = f.read()

    credentials = SignedJwtAssertionCredentials(
        client_email,
        private_key,
        GENOMICS_SCOPES
        )

    http_auth = credentials.authorize(Http())
    service = discovery.build('genomics', 'v1beta2', http=http_auth)
    return service, http_auth