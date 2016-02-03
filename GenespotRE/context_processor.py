from django.conf import settings # import the settings file

def additional_context(request):
    return {'SITE_GOOGLE_TAG_MANAGER_ID': settings.SITE_GOOGLE_TAG_MANAGER_ID}