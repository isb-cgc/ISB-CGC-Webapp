###
# Copyright 2015-2019, Institute for Systems Biology
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

from django.conf import settings # import the settings file

def additional_context(request):

    return {
            'SITE_GOOGLE_ANALYTICS_TRACKING_ID': settings.SITE_GOOGLE_ANALYTICS_TRACKING_ID,
            'SITE_GOOGLE_ANALYTICS': settings.SITE_GOOGLE_ANALYTICS,
            'BASE_URL': settings.BASE_URL,
            'BASE_API_URL': settings.BASE_API_URL,
            'STATIC_FILES_URL': settings.STATIC_URL,
            'STORAGE_URI': settings.GCS_STORAGE_URI,
            'FILE_SIZE_UPLOAD_MAX': settings.FILE_SIZE_UPLOAD_MAX,
            'CONTACT_EMAIL': settings.SERVER_EMAIL
    }
