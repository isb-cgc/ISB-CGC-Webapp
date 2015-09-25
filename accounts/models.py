from django.db import models
from django.contrib.auth.models import User


class NIH_User(models.Model):
    user = models.ForeignKey(User, null=False)
    NIH_username = models.TextField(null=True)
    NIH_assertion = models.TextField(null=True)
    NIH_assertion_expiration = models.DateTimeField(null=True)
    dbGaP_authorized = models.BooleanField(default=False)

    class Meta:
        verbose_name = "NIH User"
        verbose_name_plural = "NIH Users"

    def get_google_email(self):
        return User.objects.get(pk=self.user_id).email


class Bucket(models.Model):
    user = models.ForeignKey(User, null=False)
    bucket_name = models.TextField(null=True)
    bucket_permissions = models.TextField(null=True)
