from django.shortcuts import render
from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
import json
from cohorts.models import Cohort


@login_required
def compare_cohorts(request, cohort_id_1=1, cohort_id_2=2):
    return render(request, 'comparison/compare_dashboard.html')


@login_required
def compare_validate_cohorts(request):
    body_unicode = request.body.decode('utf-8')
    body = json.loads(body_unicode)
    sel_cohort_ids = body['sel_cohort_ids']
    if len(sel_cohort_ids) == 2:
        cohort1 = Cohort.objects.get(id=sel_cohort_ids[0], active=True)
        cohort2 = Cohort.objects.get(id=sel_cohort_ids[1], active=True)
        if cohort1 is None or cohort2 is None:
            result = {'error': 'parameters are not correct'}
        else:
            result = {'id_1': sel_cohort_ids[0], 'id_2': sel_cohort_ids[1]}
    else:
        result = {'error': 'parameters are not correct'}

    return HttpResponse(json.dumps(result), status=200)


# needs to be implemented
@login_required
def save_venn_res(request):
    return None
