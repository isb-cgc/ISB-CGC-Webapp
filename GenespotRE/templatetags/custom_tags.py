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
import string
import json
import re
import textwrap

from django.template.defaulttags import register
from cohorts.models import Cohort, Cohort_Perms
from django.contrib.auth.models import User
from projects.models import Project
from workbooks.models import Workbook

DATA_ATTR_DICTIONARY = {
    'DNA_sequencing-True': 'has_Illumina_DNASeq-True',
    'DNA_sequencing-False': 'has_Illumina_DNASeq-False',

    'RNA_sequencing-UNC Illumina HiSeq': 'has_UNC_HiSeq_RNASeq-True',
    'RNA_sequencing-BCGSC Illumina HiSeq': 'has_BCGSC_HiSeq_RNASeq-True',
    'RNA_sequencing-UNC Illumina GA': 'has_UNC_GA_RNASeq-True',
    'RNA_sequencing-BCGSC Illumina GA': 'has_BCGSC_GA_RNASeq-True',

    'miRNA_sequencing-Illumina GA': 'has_GA_miRNASeq-True',
    'miRNA_sequencing-Illumina HiSeq': 'has_HiSeq_miRnaSeq-True',

    'Protein-False': 'has_RPPA-False',
    'Protein-True': 'has_RPPA-True',

    'SNP_CN-True': 'has_SNP6-True',
    'SNP_CN-False': 'has_SNP6-False',

    'DNA_methylation-450k': 'has_450k-True',
    'DNA_methylation-27k': 'has_27k-True'
}

ATTR_SPECIFIC_ORDERS = {
    'bmi': ['underweight', 'normal weight', 'overweight', 'obese', 'None', ],
    'hpv_status': ['Positive', 'Negative', 'None', ],
    'age_at_initial_pathologic_diagnosis': ['10 to 39', '40 to 49', '50 to 59', '60 to 69', '70 to 79', 'Over 80', 'None', ],
    'pathologic_stage': ['Stage 0','Stage I','Stage IA','Stage IB','Stage II','Stage IIA','Stage IIB','Stage IIC',
                           'Stage III','Stage IIIA','Stage IIIB','Stage IIIC','Stage IS','Stage IV','Stage IVA',
                           'Stage IVB','Stage IVC','Stage X','I or II NOS','None',],
    'residual_tumor': ['R0','R1','R2','RX','None',],
}

ALPHANUM_SORT = [
    'neoplasm_histologic_grade',
    'icd_10',
    'icd_o_3_histology',
    'icd_o_3_site'
]

ATTR_SPECIFIC_TRANSLATION = {
    'SampleTypeCode': {
        '01': 'Primary solid Tumor',
        '02': 'Recurrent Solid Tumor',
        '03': 'Primary Blood Derived Cancer - Peripheral Blood',
        '04': 'Recurrent Blood Derived Cancer - Bone Marrow',
        '05': 'Additional - New Primary',
        '06': 'Metastatic',
        '07': 'Additional Metastatic',
        '08': 'Human Tumor Original Cells',
        '09': 'Primary Blood Derived Cancer - Bone Marrow',
        '10': 'Blood Derived Normal',
        '11': 'Solid Tissue Normal',
        '12': 'Buccal Cell Normal',
        '13': 'EBV Immortalized Normal',
        '14': 'Bone Marrow Normal',
        '20': 'Control Analyte',
        '40': 'Recurrent Blood Derived Cancer - Peripheral Blood',
        '50': 'Cell Lines',
        '60': 'Primary Xenograft Tissue',
        '61': 'Cell Line Derived Xenograft Tissue'
    },
    'prior_dx': {
        'Yes': 'Yes',
        'No': 'No',
        'Yes, History of Prior Malignancy': 'Yes, History of Prior Malignancy',
        'Yes, History of Synchronous and or Bilateral Malignancy': 'Yes, History of Synchronous and or Bilateral Malignancy',
        'Yes, History of Synchronous/Bilateral Malignancy': 'Yes, History of Synchronous/Bilateral Malignancy'
    },
    'bmi': {
        'underweight': 'Underweight: BMI less that 18.5',
        'normal weight': 'Normal weight: BMI is 18.5 - 24.9',
        'overweight': 'Overweight: BMI is 25 - 29.9',
        'obese': 'Obese: BMI is 30 or more'
    }
}

TRANSLATION_DICTIONARY = {
    'DNAseq_data': 'DNAseq',
    'Yes': 'GA',
    'No': 'N/A',
    'mirnPlatform': 'microRNA',
    'None': 'N/A',
    'IlluminaHiSeq_miRNASeq': 'HiSeq',
    'IlluminaGA_miRNASeq': 'GA',
    'cnvrPlatform': 'SNP/CN',
    'Genome_Wide_SNP_6': 'SNP6',
    'methPlatform': 'DNAmeth',
    'HumanMethylation27': '27k',
    'HumanMethylation450': '450k',
    'gexpPlatform': 'mRNA',
    'IlluminaHiSeq_RNASeq': 'HiSeq/BCGSC',
    'IlluminaHiSeq_RNASeqV2': 'HiSeq/UNC V2',
    'IlluminaGA_RNASeq': 'GA/BCGSC',
    'IlluminaGA_RNASeqV2': 'GA/UNC V2',
    'rppaPlatform': 'Protein',
    'MDA_RPPA_Core': 'RPPA',
    'FEMALE': 'Female',
    'MALE': 'Male',
    '0': 'Wild Type',
    '1': 'Mutant',
    'age_at_initial_pathologic_diagnosis': 'Age at Diagnosis',
    'prior_dx': 'Prior Diagnosis',
    'person_neoplasm_cancer_status': 'Tumor Status',
    'neoplasm_histologic_grade': 'Histological Grade',
    'icd_10': 'ICD-10',
    'icd_o_3_histology': 'ICD-O-3 Histology',
    'icd_o_3_site': 'ICD-O-3 Site',
    'SampleTypeCode': 'Sample Type',
    'Project': 'Public Projects',
    'Study': 'Public Studies',
    'user_projects': 'Your Projects',
    'user_studys': 'Your Studies',
    'SNP_CN': 'SNP Copy Number',
    'miRNA_sequencing': 'miRNA SEQUENCING'
}

DISEASE_DICTIONARY = {
    'Study': {
        'LAML': 'Acute Myeloid Leukemia',
        'ACC': 'Adrenocortical Carcinoma',
        'BLCA': 'Bladder Urothelial Carcinoma',
        'LGG': 'Brain Lower Grade Glioma',
        'BRCA': 'Breast Invasive Carcinoma',
        'CESC': 'Cervical Squamous Cell Carcinoma and Endocervical Adenocarcinoma',
        'CHOL': 'Cholangiocarcinoma',
        'LCML': 'Chronic Myelogenous Leukemia',
        'COAD': 'Colon Adenocarcinoma',
        'CNTL': 'Controls',
        'ESCA': 'Esophageal Carcinoma',
        'FPPP': 'FFPE Pilot Phase II',
        'GBM': 'Glioblastoma Multiforme',
        'HNSC': 'Head and Neck Squamous Cell Carcinoma',
        'KICH': 'Kidney Chromophobe',
        'KIRC': 'Kidney Renal Clear Cell Carcinoma',
        'KIRP': 'Kidney Renal Papillary Cell Carcinoma',
        'LIHC': 'Liver Hepatocellular Carcinoma',
        'LUAD': 'Lung Adenocarcinoma',
        'LUSC': 'Lung Squamous Cell Carcinoma',
        'DLBC': 'Lymphoid Neoplasm Diffuse Large B-cell Lymphoma',
        'MESO': 'Mesothelioma',
        'MISC': 'Miscellaneous',
        'OV': 'Ovarian Serous Cystadenocarcinoma',
        'PAAD': 'Pancreatic Adenocarcinoma',
        'PCPG': 'Pheochromocytoma and Paraganglioma',
        'PRAD': 'Prostate Adenocarcinoma',
        'READ': 'Rectum Adenocarcinoma',
        'SARC': 'Sarcoma',
        'SKCM': 'Skin Cutaneous Melanoma',
        'STAD': 'Stomach Adenocarcinoma',
        'TGCT': 'Testicular Germ Cell Tumors',
        'THYM': 'Thymoma',
        'THCA': 'Thyroid Carcinoma',
        'UCS': 'Uterine Carcinosarcoma',
        'UCEC': 'Uterine Corpus Endometrial Carcinoma',
        'UVM': 'Uveal Melanoma',
    }
}


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
    elif attr in ATTR_SPECIFIC_ORDERS:
        item_order = ATTR_SPECIFIC_ORDERS[attr]
        ordered_items = []
        for ordinal in item_order:
            for item in items:
                if item['value'] == ordinal:
                    ordered_items.append(item)
        return ordered_items
    else:
        return items


@register.filter
def get_readable_name(csv_name, attr=None):
    # if csv_name.startswith('user_') and csv_name != 'user_project' and csv_name != 'user_study':
    #     csv_name = csv_name[5:]

    if attr in ATTR_SPECIFIC_TRANSLATION.keys():
        return ATTR_SPECIFIC_TRANSLATION[attr][csv_name]
    elif attr == 'Project' or attr == 'Study':
        return csv_name.upper()
    elif TRANSLATION_DICTIONARY.get(csv_name):
        return TRANSLATION_DICTIONARY.get(csv_name)
    else:
        csv_name = csv_name.replace('_', ' ')
        # Do not convert the Roman numerals in the stages
        if attr is not 'pathologic_stage' and attr is not 'residual_tumor':
            csv_name = string.capwords(csv_name)
        csv_name = csv_name.replace(' To ', ' to ')
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
    display_str = attr + '-' + value

    if DATA_ATTR_DICTIONARY.get(display_str):
        return DATA_ATTR_DICTIONARY[display_str]
    else:
        return display_str


@register.filter
def get_tooltip_text(value_id, attr):

    if attr in DISEASE_DICTIONARY:
        if value_id in DISEASE_DICTIONARY[attr]:
            return DISEASE_DICTIONARY[attr][value_id]
        else:
            return ''
    else:
        return ''


@register.filter
def get_cohorts_this_user(this_user, is_active=True):
    isb_superuser = User.objects.get(username='isb')
    public_cohorts = Cohort_Perms.objects.filter(user=isb_superuser,perm=Cohort_Perms.OWNER).values_list('cohort', flat=True)
    cohort_perms = list(set(Cohort_Perms.objects.filter(user=this_user).values_list('cohort', flat=True).exclude(cohort__id__in=public_cohorts)))
    cohorts = Cohort.objects.filter(id__in=cohort_perms, active=is_active).order_by('-last_date_saved')
    return cohorts


@register.filter
def get_projects_this_user(this_user, is_active=True):
    ownedProjects = this_user.project_set.all().filter(active=True)
    sharedProjects = Project.objects.filter(shared__matched_user=this_user, shared__active=True, active=is_active)
    projects = ownedProjects | sharedProjects
    projects = projects.distinct().order_by('-last_date_saved')
    return projects


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
