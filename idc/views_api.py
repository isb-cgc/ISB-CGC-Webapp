###
# Copyright 2015-2020, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

import json
from json import JSONEncoder
import logging
import sys


from django.conf import settings
from django.contrib.auth.models import User
from allauth.socialaccount.models import SocialAccount
from django.http import HttpResponse, JsonResponse

debug = settings.DEBUG
logger = logging.getLogger(__name__)
from datetime import datetime

from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from cohorts.decorators import api_auth


class DateTimeEncoder(JSONEncoder):
    # Override the default method
    def default(self, obj):
        if isinstance(obj, datetime):
            encoded_object = obj.strftime('%s')
        else:
            encoded_object = super(self, obj)
        return encoded_object
        # if isinstance(obj, (datetime.date, datetime.datetime)):
        #     return obj.isoformat()

# class JsonResponse(HttpResponse):
#     def __init__(self, content, mimetype='application/json', status=None, content_type='application/json'):
#         json_text = json.dumps(content, cls=DateTimeEncoder)
#         super(JsonResponse, self).__init__(
#             content=json_text,
#             status=status,
#             content_type=content_type)

@csrf_exempt
@api_auth
@require_http_methods(["GET"])
def user_detail(request):
    if debug: logger.debug('Called ' + sys._getframe().f_code.co_name)

    try:
        user = User.objects.get(email=request.GET.get('email', ''))
    except Exception as e:
        logger.error("[ERROR] {} is not a registered IDC web app user".format(request.GET.get('email', '')))
        logger.exception(e)
        user_details = {
            "message": "Not a registered IDC web app user",
            "code": 404
        }
        return JsonResponse(user_details)

    try:
        social_account = SocialAccount.objects.get(user=user, provider='google')
    except Exception as e:
        # This is a local account
        social_account = None
    user_details = {
        'date_joined':  user.date_joined,
        'email':        user.email,
        'id':           user.id,
        'last_login':   user.last_login
    }

    if social_account:
        user_details['extra_data'] = social_account.extra_data if social_account else None
        user_details['first_name'] = user.first_name
        user_details['last_name'] = user.last_name
    else:
        user_details['username'] = user.username

    results = {"user_details": user_details}

    return JsonResponse(results, encoder=DateTimeEncoder)



