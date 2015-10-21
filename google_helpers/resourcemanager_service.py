from oauth2client.client import GoogleCredentials
from googleapiclient.discovery import build

def get_crm_resource():
    """Returns a Cloud Resource Manaager service client for calling the API.
    """
    credentials = GoogleCredentials.get_application_default()
    return build('cloudresourcemanager', 'v1beta1', credentials=credentials)
