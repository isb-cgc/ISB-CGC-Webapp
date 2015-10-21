from oauth2client.client import GoogleCredentials
from googleapiclient.discovery import build

def get_logging_resource():
    """Returns a Cloud Logging service client for calling the API.
    """
    credentials = GoogleCredentials.get_application_default()
    return build('logging', 'v1beta3', credentials=credentials)
