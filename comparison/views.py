from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
import json
from cohorts.models import Cohort
from comparison.models import Comparison, Dashboard

def compare_cohorts(request):
    return render(request, 'comparison/compare_dashboard.html')


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
@login_required
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
@login_required
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
# json list for each compare exists
# label: title for comparison
# id: id for comparison
# cohort_id1: first cohort id
# cohort_id2: second cohort id
@login_required
def get_compares(request):
    dashboard = Dashboard.start(request.user)
    compares = dashboard.compares.all()

    result = []

    for compare in compares:
        comp = {}
        comp.label = compare.comparison_title
        comp.id = compare.id
        comp.cohort_id1 = compare.id1
        comp.cohort_id2 = compare.id2

        result.append(comp)

    return JsonResponse(json.dumps(result), safe=False)

    # return JsonResponse(result, safe=False);