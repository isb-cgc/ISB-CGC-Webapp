from django.conf import settings # import the settings file

def additional_context(request):
    return {'SITE_GOOGLE_TAG_MANAGER_ID': settings.SITE_GOOGLE_TAG_MANAGER_ID,
            'SITE_GOOGLE_ANALYTICS': settings.SITE_GOOGLE_ANALYTICS,
            'USER_DATA_ON': settings.USER_DATA_ON,
            'BASE_URL': settings.BASE_URL,
            'BASE_API_URL': settings.BASE_API_URL}