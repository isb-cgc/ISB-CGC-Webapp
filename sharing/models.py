import operator

from django.db import models
from django.contrib.auth.models import User

import random
import string

def generate_key():
    return ''.join(random.SystemRandom().choice(string.ascii_letters + string.digits) for _ in range(32))

class Shared_Resource(models.Model):
    id = models.AutoField(primary_key=True)
    email = models.EmailField()
    share_key = models.CharField(default=generate_key, max_length=150)
    matched_user = models.ForeignKey(User, null=True, blank=True)
    redeemed = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

# For users opting out of getting any email from sharing (to prevent spamming)
class Blocked_Emails(models.Model):
    email = models.EmailField()
    created = models.DateTimeField(auto_now_add=True)
    active = models.BooleanField(default=True)
