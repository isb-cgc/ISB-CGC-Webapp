from django.template.defaulttags import register
from django.contrib.auth.models import User
from cohorts.models import Cohort_Perms, Cohort

@register.filter
def cohort_owner_permission(list):
    return list.filter(perm=Cohort_Perms.OWNER)

@register.simple_tag
def public_cohort_count():
    isb_superuser = User.objects.get(username='isb')
    count = Cohort_Perms.objects.filter(user=isb_superuser,perm=Cohort_Perms.OWNER).distinct().count()

    return count
