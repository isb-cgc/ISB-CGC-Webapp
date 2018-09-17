from django.conf import settings # import the settings file

def additional_context(request):

    return {
            'SITE_GOOGLE_TAG_MANAGER_ID': settings.SITE_GOOGLE_TAG_MANAGER_ID,
            'SITE_GOOGLE_ANALYTICS': settings.SITE_GOOGLE_ANALYTICS,
            'USER_DATA_ON': settings.USER_DATA_ON,
            'BASE_URL': settings.BASE_URL,
            'BASE_API_URL': settings.BASE_API_URL,
            'STATIC_FILES_URL': settings.STATIC_URL,
            'GCP_REG_CLIENT_EMAIL': settings.GCP_REG_CLIENT_EMAIL,
            'DCF_MONITORING_SA': settings.DCF_MONITORING_SA,
            'DCF_TEST': settings.DCF_TEST,
            'FILE_SIZE_UPLOAD_MAX': settings.FILE_SIZE_UPLOAD_MAX
    }
