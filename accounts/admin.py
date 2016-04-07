"""

Copyright 2015, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

from django.contrib import admin
from django.contrib.auth.models import User

from accounts.models import NIH_User, Bucket, GoogleProject


class NIH_UserAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'NIH_username',
        'NIH_assertion_truncated',
        'NIH_assertion_expiration',
        'dbGaP_authorized',
        'active',
        'google_email'
    )

    def google_email(self, obj):
        return User.objects.get(pk=obj.user_id).email

    def NIH_assertion_truncated(self, obj):
        return obj.NIH_assertion[:10] + '...'


class BucketAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'bucket_name',
        'bucket_permissions'
    )

class GoogleProjectAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'project_name',
        'project_id'
    )

admin.site.register(NIH_User, NIH_UserAdmin)
admin.site.register(Bucket, BucketAdmin)
admin.site.register(GoogleProject, GoogleProjectAdmin)