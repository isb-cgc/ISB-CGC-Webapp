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
            'FILE_SIZE_UPLOAD_MAX': settings.FILE_SIZE_UPLOAD_MAX,
            'RESTRICTED_ACCESS': settings.RESTRICT_ACCESS,
            'RESTRICTED_ACCESS_GROUPS': settings.RESTRICTED_ACCESS_GROUPS,
            'DICOM_STORE_PATH': settings.DICOM_STORE_PATH,
            'SLIM_VIEWER_PATH': settings.SLIM_VIEWER_PATH,
            'APP_VERSION': settings.APP_VERSION,
            'DEV_TIER': settings.DEV_TIER,
            'CRAZY_EGG': settings.CRAZY_EGG
    }
