import string

from django.template.defaulttags import register
from projects.models import Project

@register.simple_tag
def public_project_count():
    return Project.objects.filter(active=True,is_public=True).count()

@register.simple_tag(takes_context=True)
def user_project_count(context):
    user = context['user']

    userProjects = user.project_set.all().filter(active=True)
    sharedProjects = Project.objects.filter(shared__matched_user=user, shared__active=True, active=True)
    projects = userProjects | sharedProjects

    return projects.distinct().count()
