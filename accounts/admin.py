from django.contrib import admin
from django.contrib.auth.models import User

from accounts.models import NIH_User, Bucket


class NIH_UserAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'NIH_username',
        'NIH_assertion',
        'NIH_assertion_expiration',
        'dbGaP_authorized',
        'google_email'
    )

    def google_email(self, obj):
        return User.objects.get(pk=obj.user_id).email


class BucketAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'bucket_name',
        'bucket_permissions'
    )


admin.site.register(NIH_User, NIH_UserAdmin)
admin.site.register(Bucket, BucketAdmin)