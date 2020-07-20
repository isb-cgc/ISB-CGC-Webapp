# Create your views here.
from django.http import HttpResponse, JsonResponse
from django.template.loader import get_template

#@login_required
def compare_command(request):
    template = get_template('cohortcompare/cohort_dashboard.html')
    return HttpResponse(template.render({}, request))