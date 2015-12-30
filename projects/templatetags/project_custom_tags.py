import string

from django.template.defaulttags import register
from projects.models import Project

@register.simple_tag
def public_project_count():
    return Project.objects.filter(active=True,is_public=True).count()
