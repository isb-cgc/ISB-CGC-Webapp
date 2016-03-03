"""

Copyright 2015, Institute for Systems Biology

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

from django.template.defaulttags import register
import json
import re


# register = template.Library()

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)

@register.filter
def get_readable_name(csv_name, attr=None):
    # if csv_name.startswith('user_') and csv_name != 'user_project' and csv_name != 'user_study':
    #     csv_name = csv_name[5:]

    attr_specific_translation = {
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
        }
    }

    translation_dictionary = {
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
        'SampleTypeCode': 'Sample Type Code',
        'Project': 'Public Projects',
        'Study': 'Public Studies',
        'user_projects': 'Your Projects',
        'user_studys': 'Your Studies'

    }

    if attr in attr_specific_translation.keys():
        return attr_specific_translation[attr][csv_name]
    elif translation_dictionary.get(csv_name):
        return translation_dictionary.get(csv_name)
    else:
        csv_name = csv_name.replace('_', ' ')
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
    data_attr_dictionary = {
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
    if data_attr_dictionary.get(display_str):
        return data_attr_dictionary[display_str]
    else:
        return display_str

@register.filter
def get_disease_name(disease_code):
    disease_dictionary = {
        "ACC": 'Adrenocortical carcinoma',
        "BLCA": "Bladder Urothelial Carcinoma",
        "BRCA": "Breast invasive carcinoma",
        "CESC": 'Cervical squamous cell carcinoma and endocervical adenocarcinoma',
        "COAD": "Colon adenocarcinoma",
        "DLBC": 'Lymphoid Neoplasm Diffuse Large B-cell Lymphoma',
        "ESCA": 'Esophageal carcinoma',
        "FPPP": '',
        "GBM": "Glioblastoma Multiforme",
        "HNSC": "Head and Neck squamous cell carcinoma",
        "KICH": 'Kidney Chromophobe',
        "KIRC": "Kidney renal clear cell carcinoma",
        "KIRP": 'Kidney renal papillary cell carcinoma',
        "LAML": 'Acute Myeloid Leukemia',
        "LGG": 'Brain Lower Grade Glioma',
        "LIHC": 'Liver hepatocellular carcinoma',
        "LUAD": "Lung adenocarcinoma",
        "LUSC": "Lung squamous cell carcinoma",
        "MESO": 'Mesothelioma',
        "OV": "Ovarian serous cystadenocarcinoma",
        "PAAD": 'Pancreatic adenocarcinoma',
        "PRAD": 'Prostate adenocarcinoma',
        "READ": "Rectum adenocarcinoma",
        "SARC": 'Sarcoma',
        "SKCM": 'Skin Cutaneous Melanoma',
        "STAD": "Stomach adenocarcinoma",
        "THCA": 'Thyroid carcinoma',
        "UCEC": "Uterine Corpus Endometrial Carcinoma",
        "UCS": 'Uterine Carcinosarcoma',
        "UVM": 'Uveal Melanoma'
    }

    if disease_dictionary.get(disease_code):
        return disease_dictionary.get(disease_code)
    else:
        return ''

@register.filter
def get_barcodes_length(barcodes):
    codes = barcodes.replace('[','').replace(']','').split(',')
    codes = filter(None, codes)
    return len(codes)

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

def quick_js_bracket_replace(matchobj):
    if matchobj.group(0) == '<':
        return '\u003C'
    else:
        return '\u003E'

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
