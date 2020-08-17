from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
import json
from cohorts.models import Cohort
from comparison.models import Comparison, Dashboard

# @login_required
def compare_cohorts(request, cohort_id_1=1, cohort_id_2=2):
    return render(request, 'comparison/compare_dashboard.html')


# @login_required
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

# SEND
# id1: id for first cohort
# id2: id for second cohort
# user: session user id
#
# RECEIVE
# comparison_id: id of recently added cohort
def new_comparison(request):
    cohort1 = request.POST.get('id1')
    cohort2 = request.POST.get('id2')

    dashboard = Dashboard.objects.get(user=request.user)
    #TODO if no dashboard is found?

    # probably only want to interact with the dashboard here
    comp = dashboard.new_comparison(cohort_1=cohort1, cohort_2=cohort2)

    result = { 'comparison_id': comp.id }

    return HttpResponse(json.dumps(result), status=200)

# SEND
# comparison_id: id of comparison to be deleted
#
# RECEIVE
# none
def delete_comparison(request):
    comp_id = request.POST.get('comparison_id')

    dashboard = Dashboard.objects.get(user=request.user)
    #TODO if no dashboard is found?

    dashboard.remove_comparison(comp_id)

    return HttpResponse(status=200)

# SEND
# comparison_id: id of comparison to be deleted
#
# RECEIVE
# none
def get_compares(request):
    dashboard = Dashboard.objects.get(user=request.user)
    # TODO if no dashboard is found?

    result = dashboard.compares.all()

    JsonResponse(result);