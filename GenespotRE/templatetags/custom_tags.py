"""

Copyright 2016, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""

# from django import template
import sys
import string
import json
import re
import textwrap

from django.template.defaulttags import register
from cohorts.models import Cohort, Cohort_Perms
from django.contrib.auth.models import User
from projects.models import Program
from workbooks.models import Workbook


# If an attribute's values should be alphanumerically sorted, list them here
ALPHANUM_SORT = [

]

simple_number_sort = [
    '0 to 200', '200.01 to 400', '400.01 to 600', '600.01 to 800', '800.01 to 1000', '1000.01 to 1200', '1200.01 to 1400', '1400.01+',
    '0 to 4', '5 to 9', '10 to 14', '15 to 19', '20 to 24', '25 to 29', '30 to 34', '35 to 39', 'Over 40',
    '10 to 39', '40 to 49', '50 to 59', '60 to 69', '70 to 79', 'Over 80',
    '1 to 500','501 to 1000','1001 to 1500','1501 to 2000','2001 to 2500','2501 to 3000', '3001 to 3500',
    '3501 to 4000', '4001 to 4500', '4501 to 5000', '5001 to 5500', '5501 to 6000', '0 to -5000', 
    '-5001 to -10000', '-10001 to -15000', '-15001 to -20000', '-20001 to -25000', '-25001 to -30000', 
    '-30001 to -35000', 'None', 'NA',]

# If an attribute has a specific order, list it here; these should be the *values* not the display strings
VALUE_SPECIFIC_ORDERS = {
    'bmi': ['underweight', 'normal weight', 'overweight', 'obese', 'None', ],
    'hpv_status': ['Positive', 'Negative', 'None', ],
    'age_at_diagnosis': simple_number_sort,
    'year_of_diagnosis': ['1976 to 1980', '1981 to 1985', '1986 to 1990', '1991 to 1995', '1996 to 2000', '2001 to 2005', '2006 to 2010', '2011 to 2015', 'None',],
    'overall_survival': simple_number_sort,
    'event_free_survival': simple_number_sort,
    'days_to_death': simple_number_sort,
    'days_to_last_followp': simple_number_sort,
    'days_to_last_known_alive': simple_number_sort,
    'wbc_at_diagnosis': simple_number_sort,
    'pathologic_stage': ['Stage 0','Stage I','Stage IA','Stage IB','Stage II','Stage IIA','Stage IIB','Stage IIC',
                         'Stage III','Stage IIIA','Stage IIIB','Stage IIIC','Stage IS','Stage IV','Stage IVA',
                         'Stage IVB','Stage IVC','Stage X','I or II NOS','None',],
    'residual_tumor': ['R0','R1','R2','RX','None',],
}

ATTR_SPECIFIC_ORDERS = [
    'program_name',
    'project_short_name',
    'user_program',
    'user_project',
    'disease_code',
    'vital_status',
    'gender',
    'age_at_diagnosis',
    'sample_type',
    'tumor_tissue_site',
    'histological_type',
    'pathologic_stage',
    'person_neoplasm_cancer_status',
    'neoplasm_histologic_grade',
    'bmi',
    'hpv_status',
    'residual_tumor',
    'tobacco_smoking_history',
    'race',
    'ethnicity',
]


def quick_js_bracket_replace(matchobj):
    if matchobj.group(0) == '<':
        return '\u003C'
    else:
        return '\u003E'


@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)


@register.filter
def check_for_order(items, attr):
    if attr in VALUE_SPECIFIC_ORDERS:
        # If they have a specific order defined in the dict
        item_order = VALUE_SPECIFIC_ORDERS[attr]
        ordered_items = []
        for ordinal in item_order:
            for item in items:
                if item['value'] == ordinal:
                    ordered_items.append(item)
        return ordered_items
    elif attr in ALPHANUM_SORT:
        # If they should be sorted alphanumerically based on the value
        return sorted(items, key=lambda k: k['value'])
    else:
        # Otherwise, sort them by count, descending
        return sorted(items, key=lambda k: k['count'], reverse=True)


# A specific filter for producing readable token names in cohort filter displays
@register.filter
def get_feat_displ_name(name):
    return get_readable_name(name)


@register.filter
def get_readable_name(csv_name, attr=None):

    is_mutation = False
    is_data_type = False
    is_user_data = False

    if 'MUT:' in csv_name or (attr and 'MUT:' in attr):
        is_mutation = True

    if 'user_' in csv_name:
        is_user_data = True

    csv_name = csv_name.replace('CLIN:', '').replace('MUT:', '').replace('SAMP:', '')

    if attr:
        attr = attr.replace('CLIN:', '').replace('MUT:', '').replace('SAMP:', '')

    # Mutation Filter case
    if is_mutation:
        if not attr:
            gene = csv_name.split(':')[0].upper()
            type = string.capwords(csv_name.split(':')[1])
            return gene + ' [' + type
        else:
            return string.capwords(csv_name) + ']'
    # Data type filters
    elif is_data_type and attr:
        if csv_name == '1':
            return 'True'
        elif csv_name == '0':
            return 'False'
        else:
            return 'None'
    # Clinical filters
    elif attr == 'Project' or attr == 'Program Name':
        return csv_name.upper()
    else:
        return csv_name


@register.filter
def remove_whitespace(str):
    return str.replace(' ', '')


@register.filter
def replace_whitespace(str, chr):
    result = re.sub(re.compile(r'\s+'), chr, str)
    return result


@register.filter
def get_data_attr_id(value, attr):
    return attr + '-' + value


@register.filter
def has_user_data(programs):
    for prog in programs:
        if prog['type'] == 'user-data':
            print >> sys.stdout, "is user data!"
            return True
    return False


@register.filter
def is_superuser(this_user):
    isb_superuser = User.objects.get(username='isb')
    return this_user.id == isb_superuser.id


@register.filter
def get_cohorts_this_user(this_user, is_active=True):
    isb_superuser = User.objects.get(username='isb')
    public_cohorts = Cohort_Perms.objects.filter(user=isb_superuser,perm=Cohort_Perms.OWNER).values_list('cohort', flat=True)
    cohort_perms = list(set(Cohort_Perms.objects.filter(user=this_user).values_list('cohort', flat=True).exclude(cohort__id__in=public_cohorts)))
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=is_active).order_by('-last_date_saved')
    return cohorts


@register.filter
def get_programs_this_user(this_user, is_active=True):
    ownedPrograms = this_user.program_set.all().filter(active=True)
    sharedPrograms = Program.objects.filter(shared__matched_user=this_user, shared__active=True, active=is_active)
    programs = ownedPrograms | sharedPrograms
    programs = programs.distinct().order_by('-last_date_saved')
    return programs


@register.filter
def get_workbooks_this_user(this_user, is_active=True):
    userWorkbooks = this_user.workbook_set.all().filter(active=is_active)
    sharedWorkbooks = Workbook.objects.filter(shared__matched_user=this_user, shared__active=True, active=is_active)
    workbooks = userWorkbooks | sharedWorkbooks
    workbooks = workbooks.distinct().order_by('-last_date_saved')
    return workbooks


@register.filter
def get_barcodes_length(barcodes):
    codes = barcodes.replace('[','').replace(']','').split(',')
    codes = filter(None, codes)
    return len(codes)


@register.filter
def wrap_text(text, length=60):

    if len(text) <= length:
        return text

    line_feed = '\x0A'

    split_text = textwrap.wrap(text, length, )

    return (line_feed.join(split_text) if len(split_text) > 1 else text)


@register.filter
def how_many_more(attr_list, num):
    return len(attr_list) - num


@register.filter
def active(list, key=None):
    if not key:
        return list.filter(active=True)
    return list.filter(**{key + '__active':True})


@register.filter
def active_and_v2(list, key=None):
    if not key:
        return list.filter(active=True, version='v2')
    return list.filter(**{key + '__active':True, key+'__version':'v2'})


@register.filter
def workbook_matches_varfave(workbook, var_fave):
    return (((workbook.build is None or workbook.build == 'Legacy') and var_fave.version == 'v1')
        or ((workbook.build is not None and workbook.build != 'Legacy') and var_fave.version == 'v2'))


@register.filter
def is_public(list, key=None):
    if not key:
        return list.filter(is_public=True)
    return list.filter(**{key + '__is_public':True})


@register.filter
def sort_last_view(list, key=''):
    return list.order_by('-' + key + '_last_view__last_view')


@register.filter
def sort_last_save(list):
    return list.order_by('-last_date_saved')


@register.filter
def tojson(obj, esacpe_html=True):
    output = json.dumps(obj)
    if esacpe_html:
        output = re.sub(re.compile(r'(<|>)'), quick_js_bracket_replace, output)
    return output


@register.filter
def get_prog_col_size(programs):
    return (12/len(programs))


@register.filter
def program_is_in_cohort(prog, cohort_progs):
    return (prog in cohort_progs)


@register.filter
def program_is_first_in_cohort(prog, cohort_progs):
    return (prog.id == cohort_progs[0].id)


@register.filter
def get_prog_attr(prog, prog_attr):
    if prog in prog_attr:
        return [prog_attr[prog][x] for x in prog_attr[prog]]
    return None


@register.filter
def list_contains_name(list, value):
    for item in list:
        if item['name'] == value:
            return True
    return False


@register.filter
def get_named_item(list, value):
    for item in list:
        if item['name'] == value:
            return item
    return None


@register.filter
def check_special_casing(attr):
    if 'miRNA' in attr or 'mRNA' in attr:
        return attr.upper().replace('MIRNA','miRNA').replace('MRNA','mRNA')
    return attr


@register.filter
def get_sorted_items(attr_set):
    sorted_list = []

    if type(attr_set) is list:
        tmp_set = attr_set
        attr_set = {x['name']: x for x in tmp_set}

    # First load in the ordered attributes, if they exist in the provided set
    for attr in ATTR_SPECIFIC_ORDERS:
        if attr in attr_set:
            sorted_list.append(attr_set[attr])

    # ...then load in anything else which is in the set but not in the ordering list
    for attr in attr_set:
        if attr not in ATTR_SPECIFIC_ORDERS:
            sorted_list.append(attr_set[attr])

    return sorted_list
