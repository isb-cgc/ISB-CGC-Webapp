from django.db import models
from django.utils.translation import gettext as _

class Config(models.Model):
    key = models.CharField(_('Key'), max_length=100, unique=True)
    value = models.BooleanField(_('Value'), default=False)
    message = models.TextField(_('Message'))

    def __unicode__(self):
      return self.key
