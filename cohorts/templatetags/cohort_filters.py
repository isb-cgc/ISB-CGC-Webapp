from django.template.defaulttags import register
from cohorts.models import Cohort_Perms

@register.filter
def cohort_owner_permission(list):
    return list.filter(perm=Cohort_Perms.OWNER)