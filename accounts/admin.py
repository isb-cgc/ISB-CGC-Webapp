from django.contrib import admin
from django.contrib.auth.models import User

from accounts.models import NIH_User, Bucket


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


admin.site.register(NIH_User, NIH_UserAdmin)
admin.site.register(Bucket, BucketAdmin)