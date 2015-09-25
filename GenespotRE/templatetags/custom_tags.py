# from django import template
import string

from django.template.defaulttags import register
import re


# register = template.Library()

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)

@register.filter
def get_readable_name(csv_name):

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
        'icd_o_3_histology': 'ICD-O-3 Site',
        'icd_o_3_site': 'ICD-O-3 Histology'
    }
    if translation_dictionary.get(csv_name):
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