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

# If an attribute has a specific order, list it here; these should be the *values* not the display strings
VALUE_SPECIFIC_ORDERS = {
    'BMI': ['underweight', 'normal weight', 'overweight', 'obese', 'None', ],
    'hpv_status': ['Positive', 'Negative', 'None', ],
    'age_at_initial_pathologic_diagnosis': ['10 to 39', '40 to 49', '50 to 59', '60 to 69', '70 to 79', 'Over 80', 'None', ],
    'pathologic_stage': ['Stage 0','Stage I','Stage IA','Stage IB','Stage II','Stage IIA','Stage IIB','Stage IIC',
                         'Stage III','Stage IIIA','Stage IIIB','Stage IIIC','Stage IS','Stage IV','Stage IVA',
                         'Stage IVB','Stage IVC','Stage X','I or II NOS','None',],
    'residual_tumor': ['R0','R1','R2','RX','None',],
}

ATTR_SPECIFIC_ORDERS = [
    'project_short_name',
    'disease_code',
    'sample_type',
    'tumor_type',
    'tumor_tissue_site',
    'gender',
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
    if attr in ALPHANUM_SORT:
        return sorted(items, key=lambda k: k['value'])
    elif attr in VALUE_SPECIFIC_ORDERS:
        item_order = VALUE_SPECIFIC_ORDERS[attr]
        ordered_items = []
        for ordinal in item_order:
            for item in items:
                if item['value'] == ordinal:
                    ordered_items.append(item)
        return ordered_items
    else:
        return items


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

    if 'has_' in csv_name or (attr and 'has_' in attr):
        is_data_type = True

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
def get_prog_col_size(prog_filters):
    return (12/len(prog_filters.keys()))

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
def get_sorted_items(attr_set):
    sorted_list = []

    # First load in the ordered attributes, if they exist in the provided set
    for attr in ATTR_SPECIFIC_ORDERS:
        if attr in attr_set:
            sorted_list.append(attr_set[attr])

    # ...then load in anything else which is in the set but not in the ordering list
    for attr in attr_set:
        if attr not in ATTR_SPECIFIC_ORDERS:
            sorted_list.append(attr_set[attr])

    return sorted_list