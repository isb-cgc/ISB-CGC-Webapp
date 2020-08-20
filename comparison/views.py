from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.contrib.auth.decorators import login_required
import json
from cohorts.models import Cohort, Samples
from cohorts import file_helpers, views
from accounts import sa_utils
from comparison.models import Comparison, Dashboard

@login_required()
def compare_cohorts(request, cohort_id_1, cohort_id_2):
    dashboard = Dashboard.start(user=request.user)
    comp = Comparison.new_comparison(cohort_id1=cohort_id_1, cohort_id2=cohort_id_2)
    comp.save()

    dashboard.compares.add(comp)
    dashboard.current_compare = comp
    dashboard.save()

    get_gender(cohort_id_1, cohort_id_2, request.user)

    return render(request, 'comparison/compare_dashboard.html')

@login_required()
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

    dashboard = Dashboard.start(user=request.user)

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
    dashboard = Dashboard.start(user=request.user)

    compares = dashboard.compares.all()

    result = []

    for compare in compares:
        comp = {
            'label' : compare.comparison_title,
            'id' : compare.id,
            'cohort_id1' : compare.id1,
            'cohort_id2' : compare.id2
        }

        result.append(json.dumps(comp))

    print(result)

    return JsonResponse(json.dumps(result), safe=False)

def get_gender(id1, id2, user_id):
    cohort1 = Cohort.objects.get(id=id1, active=True)
    cohort2 = Cohort.objects.get(id=id2, active=True)

    # cohort1_gender = Samples.objects.filter(cohort_id__in=id1).values_list('gender', flat=True)

    # cases = cohort1.get_cohort_cases()
    # for case in cases:
    #     print(case.gender)
    # gender_type, gender_vector = data_access.get_feature_vector('gender', id1)

    # cases = file_helpers.cohort_files(cohort_id=2, user=user_id)

    # print(cohort1.get_programs()[0].id)
    #
    # cases = views.get_sample_case_list(user=user_id, inc_filters={'gender' : ['Female']}, cohort_id=id1, program_id=3)

    items = file_helpers.cohort_files(id1, user=user_id, access=sa_utils.auth_dataset_whitelists_for_user(user_id))

    print(items)
    return