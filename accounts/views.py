from models import NIH_User
from django.contrib.auth.models import User
from allauth.account import views as account_views
from django.contrib.auth.decorators import login_required
from google_helpers.directory_service import get_directory_resource
from googleapiclient.errors import HttpError
from django.conf import settings
import logging


logger = logging.getLogger(__name__)
ACL_GOOGLE_GROUP = settings.ACL_GOOGLE_GROUP

import urllib2

@login_required
def extended_logout_view(request):
    # delete NIH_username entry if exists
    NIH_User.objects.filter(user_id=request.user.id).delete()

    # remove from isb-cgc-cntl if exists
    directory_service, http_auth = get_directory_resource()
    user_email = User.objects.get(id=request.user.id).email
    try:
        directory_service.members().delete(groupKey=ACL_GOOGLE_GROUP, memberKey=str(user_email)).execute(http=http_auth)
    except HttpError, e:
        logger.info(e)

    # log out of NIH?

    response = account_views.logout(request)
    return response