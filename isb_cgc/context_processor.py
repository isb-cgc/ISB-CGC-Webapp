from django.conf import settings # import the settings file
import sys

def additional_context(request):

    return {
            'SITE_GOOGLE_ANALYTICS_TRACKING_ID': settings.SITE_GOOGLE_ANALYTICS_TRACKING_ID,
            'SITE_GOOGLE_ANALYTICS': settings.SITE_GOOGLE_ANALYTICS,
            'USER_DATA_ON': settings.USER_DATA_ON,
            'BASE_URL': settings.BASE_URL,
            'BASE_API_URL': settings.BASE_API_URL,
            'STATIC_FILES_URL': settings.STATIC_URL,
            'STORAGE_URI': settings.GCS_STORAGE_URI,
            'MONITORING_SA_CLIENT_EMAIL': settings.MONITORING_SA_CLIENT_EMAIL,
            'DCF_MONITORING_SA': settings.DCF_MONITORING_SA,
            'DCF_TEST': settings.DCF_TEST,
            'FILE_SIZE_UPLOAD_MAX': settings.FILE_SIZE_UPLOAD_MAX
    }
