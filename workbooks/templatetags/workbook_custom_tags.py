import string

from django.template.defaulttags import register
from workbooks.models import Workbook

@register.simple_tag
def public_workbook_count():
    return Workbook.objects.filter(active=True,is_public=True).count()

@register.simple_tag(takes_context=True)
def user_workbook_count(context):
    user = context['user']

    userWorkbooks = user.workbook_set.filter(active=True)
    sharedWorkbooks = Workbook.objects.filter(shared__matched_user=user, shared__active=True, active=True)
    workbooks = userWorkbooks | sharedWorkbooks

    return workbooks.distinct().count()

@register.filter
def shared_active_count(shares):
    count = 0
    for share in shares:
        if share.active:
            count += 1
    return count