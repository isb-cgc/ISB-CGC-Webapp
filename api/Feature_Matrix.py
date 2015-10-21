import json
import time

import endpoints
from google.appengine.ext import ndb
from protorpc import messages
from protorpc import message_types
from protorpc import remote
from django.contrib.auth.models import User

from api_helpers import *



#################################################################
#  BEGINNING OF FEATURE MATRIX ENDPOINTS
#################################################################

IMPORTANT_FEATURES = [
    'tumor_tissue_site',
    'gender',
    'vital_status',
    'country',
    'disease_code',
    'age_at_initial_pathologic_diagnosis',
    'TP53',
    'RB1',
    'NF1',
    'APC',
    'CTNNB1',
    'PIK3CA',
    'PTEN',
    'FBXW7',
    'NRAS',
    'ARID1A',
    'CDKN2A',
    'SMAD4',
    'BRAF',
    'NFE2L2',
    'IDH1',
    'PIK3R1',
    'HRAS',
    'EGFR',
    'BAP1',
    'KRAS',
    'DNAseq_data',
    'mirnPlatform',
    'cnvrPlatform',
    'methPlatform',
    'gexpPlatform',
    'rppaPlatform'
]

class ReturnJSON(messages.Message):
    msg = messages.StringField(1)

class tcga_data_file(ndb.Expando):
    pass


class ExtraUserData(messages.Message):
    id = messages.StringField(1)
    name = messages.StringField(2)
    given_name = messages.StringField(3)
    family_name = messages.StringField(4)
    email = messages.StringField(5)
    picture = messages.StringField(6)
    link = messages.StringField(7)
    verified_email = messages.BooleanField(8)
    locale = messages.StringField(9)


class User(messages.Message):
    id=messages.StringField(1)
    last_login=messages.StringField(2)
    is_superuser=messages.StringField(3)
    username=messages.StringField(4)
    first_name=messages.StringField(5)
    last_name=messages.StringField(6)
    email=messages.StringField(7)
    is_staff=messages.StringField(8)
    is_active=messages.StringField(9)
    date_joined=messages.StringField(10)
    NIH_username=messages.StringField(11)
    dbGaP_authorized=messages.StringField(12)
    extra_data=messages.MessageField(ExtraUserData, 13)


class UserList(messages.Message):
    items = messages.MessageField(User, 1, repeated=True)

class SavedSearch(messages.Message):
    id = messages.StringField(1)
    search_url = messages.StringField(2)
    barcodes = messages.StringField(3)
    datatypes = messages.StringField(4)
    last_date_saved = messages.StringField(5)
    user_id = messages.StringField(6)
    name = messages.StringField(7)
    parent_id = messages.StringField(8)
    active = messages.StringField(9)

class SavedSearchList(messages.Message):
    items = messages.MessageField(SavedSearch, 1, repeated=True)

class IdList(messages.Message):
    ids = messages.IntegerField(1, repeated=True)

class ReturnPlot(messages.Message):
    title = messages.StringField(1)
    cohort = messages.MessageField(SavedSearch, 2)
    x_axis = messages.StringField(3)
    y_axis = messages.StringField(4)
    color_by = messages.StringField(5)
    plot_type = messages.StringField(6)

class InputPlot(messages.Message):
    title = messages.StringField(1)
    cohort = messages.IntegerField(2)
    x_axis = messages.StringField(3)
    y_axis = messages.StringField(4)
    color_by = messages.StringField(5)
    plot_type = messages.StringField(6)

class ReturnSavedViz(messages.Message):
    id = messages.StringField(1)
    user_id = messages.StringField(2)
    name = messages.StringField(3)
    date_saved = messages.StringField(4)
    plots = messages.MessageField(ReturnPlot, 5, repeated=True)

class InputSavedViz(messages.Message):
    id = messages.StringField(1)
    user_id = messages.StringField(2)
    name = messages.StringField(3)
    plots = messages.MessageField(InputPlot, 4, repeated=True)


class SavedVizList(messages.Message):
    items = messages.MessageField(ReturnSavedViz, 1, repeated=True)

class FMAttr(messages.Message):
    attribute = messages.StringField(1)
    code = messages.StringField(2)
    spec = messages.StringField(3)

class FMAttrList(messages.Message):
    items = messages.MessageField(FMAttr, 1, repeated=True)

class FMItem(messages.Message):
    sample                               = messages.StringField(1)
    percent_lymphocyte_infiltration      = messages.StringField(2)
    percent_monocyte_infiltration        = messages.StringField(3)
    percent_necrosis                     = messages.StringField(4)
    percent_neutrophil_infiltration      = messages.StringField(5)
    percent_normal_cells                 = messages.StringField(6)
    percent_stromal_cells                = messages.StringField(7)
    percent_tumor_cells                  = messages.StringField(8)
    percent_tumor_nuclei                 = messages.StringField(9)
    gender                               = messages.StringField(10)
    history_of_neoadjuvant_treatment     = messages.StringField(11)
    icd_o_3_histology                    = messages.StringField(12)
    prior_dx                             = messages.StringField(13)
    vital_status                         = messages.StringField(14)
    country                              = messages.StringField(15)
    disease_code                         = messages.StringField(16)
    histological_type                    = messages.StringField(17)
    icd_10                               = messages.StringField(18)
    icd_o_3_site                         = messages.StringField(19)
    tumor_tissue_site                    = messages.StringField(20)
    tumor_type                           = messages.StringField(21)
    age_at_initial_pathologic_diagnosis  = messages.StringField(22)
    days_to_birth                        = messages.StringField(23)
    days_to_initial_pathologic_diagnosis = messages.StringField(24)
    year_of_initial_pathologic_diagnosis = messages.StringField(25)
    days_to_last_known_alive             = messages.StringField(26)
    tumor_necrosis_percent               = messages.StringField(27)
    tumor_nuclei_percent                 = messages.StringField(28)
    tumor_weight                         = messages.StringField(29)
    person_neoplasm_cancer_status        = messages.StringField(30)
    pathologic_N                         = messages.StringField(31)
    radiation_therapy                    = messages.StringField(32)
    pathologic_T                         = messages.StringField(33)
    race                                 = messages.StringField(34)
    days_to_last_followup                = messages.StringField(35)
    ethnicity                            = messages.StringField(36)
    TP53                                 = messages.StringField(37)
    RB1                                  = messages.StringField(38)
    NF1                                  = messages.StringField(39)
    APC                                  = messages.StringField(40)
    CTNNB1                               = messages.StringField(41)
    PIK3CA                               = messages.StringField(42)
    PTEN                                 = messages.StringField(43)
    FBXW7                                = messages.StringField(44)
    NRAS                                 = messages.StringField(45)
    ARID1A                               = messages.StringField(46)
    CDKN2A                               = messages.StringField(47)
    SMAD4                                = messages.StringField(48)
    BRAF                                 = messages.StringField(49)
    NFE2L2                               = messages.StringField(50)
    IDH1                                 = messages.StringField(51)
    PIK3R1                               = messages.StringField(52)
    HRAS                                 = messages.StringField(53)
    EGFR                                 = messages.StringField(54)
    BAP1                                 = messages.StringField(55)
    KRAS                                 = messages.StringField(56)
    sampleType                           = messages.StringField(57)
    DNAseq_data                          = messages.StringField(58)
    mirnPlatform                         = messages.StringField(59)
    cnvrPlatform                         = messages.StringField(60)
    methPlatform                         = messages.StringField(61)
    gexpPlatform                         = messages.StringField(62)
    rppaPlatform                         = messages.StringField(63)

def create_FMItem(record, selector_list):
    if len(selector_list):
        item = FMItem()
        for attr in selector_list:
            item.__setattr__(str(attr), str(record[str(attr)]))
        return item
    return FMItem(  sample                               = str(record['sample']),
                    percent_lymphocyte_infiltration      = str(record['percent_lymphocyte_infiltration']),
                    percent_monocyte_infiltration        = str(record['percent_monocyte_infiltration']),
                    percent_necrosis                     = str(record['percent_necrosis']),
                    percent_neutrophil_infiltration      = str(record['percent_neutrophil_infiltration']),
                    percent_normal_cells                 = str(record['percent_normal_cells']),
                    percent_stromal_cells                = str(record['percent_stromal_cells']),
                    percent_tumor_cells                  = str(record['percent_tumor_cells']),
                    percent_tumor_nuclei                 = str(record['percent_tumor_nuclei']),
                    gender                               = str(record['gender']),
                    history_of_neoadjuvant_treatment     = str(record['history_of_neoadjuvant_treatment']),
                    icd_o_3_histology                    = str(record['icd_o_3_histology']),
                    prior_dx                             = str(record['prior_dx']),
                    vital_status                         = str(record['vital_status']),
                    country                              = str(record['country']),
                    disease_code                         = str(record['disease_code']),
                    histological_type                    = str(record['histological_type']),
                    icd_10                               = str(record['icd_10']),
                    icd_o_3_site                         = str(record['icd_o_3_site']),
                    tumor_tissue_site                    = str(record['tumor_tissue_site']),
                    tumor_type                           = str(record['tumor_type']),
                    age_at_initial_pathologic_diagnosis  = str(record['age_at_initial_pathologic_diagnosis']),
                    days_to_birth                        = str(record['days_to_birth']),
                    days_to_initial_pathologic_diagnosis = str(record['days_to_initial_pathologic_diagnosis']),
                    year_of_initial_pathologic_diagnosis = str(record['year_of_initial_pathologic_diagnosis']),
                    days_to_last_known_alive             = str(record['days_to_last_known_alive']),
                    tumor_necrosis_percent               = str(record['tumor_necrosis_percent']),
                    tumor_nuclei_percent                 = str(record['tumor_nuclei_percent']),
                    tumor_weight                         = str(record['tumor_weight']),
                    person_neoplasm_cancer_status        = str(record['person_neoplasm_cancer_status']),
                    pathologic_N                         = str(record['pathologic_N']),
                    radiation_therapy                    = str(record['radiation_therapy']),
                    pathologic_T                         = str(record['pathologic_T']),
                    race                                 = str(record['race']),
                    days_to_last_followup                = str(record['days_to_last_followup']),
                    ethnicity                            = str(record['ethnicity']),
                    TP53                                 = str(record['TP53']),
                    RB1                                  = str(record['RB1']),
                    NF1                                  = str(record['NF1']),
                    APC                                  = str(record['APC']),
                    CTNNB1                               = str(record['CTNNB1']),
                    PIK3CA                               = str(record['PIK3CA']),
                    PTEN                                 = str(record['PTEN']),
                    FBXW7                                = str(record['FBXW7']),
                    NRAS                                 = str(record['NRAS']),
                    ARID1A                               = str(record['ARID1A']),
                    CDKN2A                               = str(record['CDKN2A']),
                    SMAD4                                = str(record['SMAD4']),
                    BRAF                                 = str(record['BRAF']),
                    NFE2L2                               = str(record['NFE2L2']),
                    IDH1                                 = str(record['IDH1']),
                    PIK3R1                               = str(record['PIK3R1']),
                    HRAS                                 = str(record['HRAS']),
                    EGFR                                 = str(record['EGFR']),
                    BAP1                                 = str(record['BAP1']),
                    KRAS                                 = str(record['KRAS']),
                    sampleType                           = str(record['sampleType']),
                    DNAseq_data                          = str(record['DNAseq_data']),
                    mirnPlatform                         = str(record['mirnPlatform']),
                    cnvrPlatform                         = str(record['cnvrPlatform']),
                    methPlatform                         = str(record['methPlatform']),
                    gexpPlatform                         = str(record['gexpPlatform']),
                    rppaPlatform                         = str(record['rppaPlatform']),
                    )

class FMAttrValue(messages.Message):
    value = messages.StringField(1)

class FMValueListCount(messages.Message):
    value = messages.StringField(1)
    count = messages.IntegerField(2)

class FMAttrValuesList(messages.Message):
    # sample                               = messages.MessageField(ValueListCount, 1, repeated=True)
    percent_lymphocyte_infiltration      = messages.MessageField(FMValueListCount, 2, repeated=True)
    percent_monocyte_infiltration        = messages.MessageField(FMValueListCount, 3, repeated=True)
    percent_necrosis                     = messages.MessageField(FMValueListCount, 4, repeated=True)
    percent_neutrophil_infiltration      = messages.MessageField(FMValueListCount, 5, repeated=True)
    percent_normal_cells                 = messages.MessageField(FMValueListCount, 6, repeated=True)
    percent_stromal_cells                = messages.MessageField(FMValueListCount, 7, repeated=True)
    percent_tumor_cells                  = messages.MessageField(FMValueListCount, 8, repeated=True)
    percent_tumor_nuclei                 = messages.MessageField(FMValueListCount, 9, repeated=True)
    gender                               = messages.MessageField(FMValueListCount, 10, repeated=True)
    history_of_neoadjuvant_treatment     = messages.MessageField(FMValueListCount, 11, repeated=True)
    icd_o_3_histology                    = messages.MessageField(FMValueListCount, 12, repeated=True)
    prior_dx                             = messages.MessageField(FMValueListCount, 13, repeated=True)
    vital_status                         = messages.MessageField(FMValueListCount, 14, repeated=True)
    country                              = messages.MessageField(FMValueListCount, 15, repeated=True)
    disease_code                         = messages.MessageField(FMValueListCount, 16, repeated=True)
    histological_type                    = messages.MessageField(FMValueListCount, 17, repeated=True)
    icd_10                               = messages.MessageField(FMValueListCount, 18, repeated=True)
    icd_o_3_site                         = messages.MessageField(FMValueListCount, 19, repeated=True)
    tumor_tissue_site                    = messages.MessageField(FMValueListCount, 20, repeated=True)
    tumor_type                           = messages.MessageField(FMValueListCount, 21, repeated=True)
    age_at_initial_pathologic_diagnosis  = messages.MessageField(FMValueListCount, 22, repeated=True)
    days_to_birth                        = messages.MessageField(FMValueListCount, 23, repeated=True)
    days_to_initial_pathologic_diagnosis = messages.MessageField(FMValueListCount, 24, repeated=True)
    year_of_initial_pathologic_diagnosis = messages.MessageField(FMValueListCount, 25, repeated=True)
    days_to_last_known_alive             = messages.MessageField(FMValueListCount, 26, repeated=True)
    tumor_necrosis_percent               = messages.MessageField(FMValueListCount, 27, repeated=True)
    tumor_nuclei_percent                 = messages.MessageField(FMValueListCount, 28, repeated=True)
    tumor_weight                         = messages.MessageField(FMValueListCount, 29, repeated=True)
    person_neoplasm_cancer_status        = messages.MessageField(FMValueListCount, 30, repeated=True)
    pathologic_N                         = messages.MessageField(FMValueListCount, 31, repeated=True)
    radiation_therapy                    = messages.MessageField(FMValueListCount, 32, repeated=True)
    pathologic_T                         = messages.MessageField(FMValueListCount, 33, repeated=True)
    race                                 = messages.MessageField(FMValueListCount, 34, repeated=True)
    days_to_last_followup                = messages.MessageField(FMValueListCount, 35, repeated=True)
    ethnicity                            = messages.MessageField(FMValueListCount, 36, repeated=True)
    TP53                                 = messages.MessageField(FMValueListCount, 37, repeated=True)
    RB1                                  = messages.MessageField(FMValueListCount, 38, repeated=True)
    NF1                                  = messages.MessageField(FMValueListCount, 39, repeated=True)
    APC                                  = messages.MessageField(FMValueListCount, 40, repeated=True)
    CTNNB1                               = messages.MessageField(FMValueListCount, 41, repeated=True)
    PIK3CA                               = messages.MessageField(FMValueListCount, 42, repeated=True)
    PTEN                                 = messages.MessageField(FMValueListCount, 43, repeated=True)
    FBXW7                                = messages.MessageField(FMValueListCount, 44, repeated=True)
    NRAS                                 = messages.MessageField(FMValueListCount, 45, repeated=True)
    ARID1A                               = messages.MessageField(FMValueListCount, 46, repeated=True)
    CDKN2A                               = messages.MessageField(FMValueListCount, 47, repeated=True)
    SMAD4                                = messages.MessageField(FMValueListCount, 48, repeated=True)
    BRAF                                 = messages.MessageField(FMValueListCount, 49, repeated=True)
    NFE2L2                               = messages.MessageField(FMValueListCount, 50, repeated=True)
    IDH1                                 = messages.MessageField(FMValueListCount, 51, repeated=True)
    PIK3R1                               = messages.MessageField(FMValueListCount, 52, repeated=True)
    HRAS                                 = messages.MessageField(FMValueListCount, 53, repeated=True)
    EGFR                                 = messages.MessageField(FMValueListCount, 54, repeated=True)
    BAP1                                 = messages.MessageField(FMValueListCount, 55, repeated=True)
    KRAS                                 = messages.MessageField(FMValueListCount, 56, repeated=True)
    sampleType                           = messages.MessageField(FMValueListCount, 57, repeated=True)
    DNAseq_data                          = messages.MessageField(FMValueListCount, 58, repeated=True)
    mirnPlatform                         = messages.MessageField(FMValueListCount, 59, repeated=True)
    cnvrPlatform                         = messages.MessageField(FMValueListCount, 60, repeated=True)
    methPlatform                         = messages.MessageField(FMValueListCount, 61, repeated=True)
    gexpPlatform                         = messages.MessageField(FMValueListCount, 62, repeated=True)
    rppaPlatform                         = messages.MessageField(FMValueListCount, 63, repeated=True)


# same as FMItemList
# class FMSampleData(messages.Message):
#     attribute_list = messages.MessageField(FMAttrValuesList, 1)
#     total_samples = messages.IntegerField(2)

class FMItemList(messages.Message):
    items = messages.MessageField(FMItem, 1, repeated=True)
    counts = messages.MessageField(FMAttrValuesList, 2)
    total = messages.IntegerField(3)

class FMLandingData(messages.Message):
    value = messages.StringField(1)
    count = messages.IntegerField(2)

class FMLandingGroup(messages.Message):
    name = messages.StringField(1)
    items = messages.MessageField(FMLandingData, 2, repeated=True)

class FMLandingDataList(messages.Message):
    items = messages.MessageField(FMLandingData, 1, repeated=True)

# class FMAttrDomain(messages.Message):
#     attribute = messages.StringField(1)
#     domain = messages.StringField(2, repeated=True)

class FMDomainsList(messages.Message):
    gender                              = messages.StringField(1, repeated=True)
    history_of_neoadjuvant_treatment    = messages.StringField(2, repeated=True)
    icd_o_3_histology                   = messages.StringField(3, repeated=True)
    prior_dx                            = messages.StringField(4, repeated=True)
    vital_status                        = messages.StringField(5, repeated=True)
    country                             = messages.StringField(6, repeated=True)
    disease_code                        = messages.StringField(7, repeated=True)
    histological_type                   = messages.StringField(8, repeated=True)
    icd_10                              = messages.StringField(9, repeated=True)
    icd_o_3_site                        = messages.StringField(10, repeated=True)
    tumor_tissue_site                   = messages.StringField(11, repeated=True)
    tumor_type                          = messages.StringField(12, repeated=True)
    person_neoplasm_cancer_status       = messages.StringField(13, repeated=True)
    pathologic_N                        = messages.StringField(14, repeated=True)
    radiation_therapy                   = messages.StringField(15, repeated=True)
    pathologic_T                        = messages.StringField(16, repeated=True)
    race                                = messages.StringField(17, repeated=True)
    ethnicity                           = messages.StringField(18, repeated=True)
    sampleType                          = messages.StringField(19, repeated=True)
    DNAseq_data                         = messages.StringField(20, repeated=True)
    mirnPlatform                        = messages.StringField(21, repeated=True)
    cnvrPlatform                        = messages.StringField(22, repeated=True)
    methPlatform                        = messages.StringField(23, repeated=True)
    gexpPlatform                        = messages.StringField(24, repeated=True)
    rppaPlatform                        = messages.StringField(25, repeated=True)
    #
    #
    # percent_lymphocyte_infiltration      = messages.StringField(2, repeated=True)
    # percent_monocyte_infiltration        = messages.StringField(3, repeated=True)
    # percent_necrosis                     = messages.StringField(4, repeated=True)
    # percent_neutrophil_infiltration      = messages.StringField(5, repeated=True)
    # percent_normal_cells                 = messages.StringField(6, repeated=True)
    # percent_stromal_cells                = messages.StringField(7, repeated=True)
    # percent_tumor_cells                  = messages.StringField(8, repeated=True)
    # percent_tumor_nuclei                 = messages.StringField(9, repeated=True)
    # gender                               = messages.StringField(10, repeated=True)
    # history_of_neoadjuvant_treatment     = messages.StringField(11, repeated=True)
    # icd_o_3_histology                    = messages.StringField(12, repeated=True)
    # prior_dx                             = messages.StringField(13, repeated=True)
    # vital_status                         = messages.StringField(14, repeated=True)
    # country                              = messages.StringField(15, repeated=True)
    # disease_code                         = messages.StringField(16, repeated=True)
    # histological_type                    = messages.StringField(17, repeated=True)
    # icd_10                               = messages.StringField(18, repeated=True)
    # icd_o_3_site                         = messages.StringField(19, repeated=True)
    # tumor_tissue_site                    = messages.StringField(20, repeated=True)
    # tumor_type                           = messages.StringField(21, repeated=True)
    # age_at_initial_pathologic_diagnosis  = messages.StringField(22, repeated=True)
    # days_to_birth                        = messages.StringField(23, repeated=True)
    # days_to_initial_pathologic_diagnosis = messages.StringField(24, repeated=True)
    # year_of_initial_pathologic_diagnosis = messages.StringField(25, repeated=True)
    # days_to_last_known_alive             = messages.StringField(26, repeated=True)
    # tumor_necrosis_percent               = messages.StringField(27, repeated=True)
    # tumor_nuclei_percent                 = messages.StringField(28, repeated=True)
    # tumor_weight                         = messages.StringField(29, repeated=True)
    # person_neoplasm_cancer_status        = messages.StringField(30, repeated=True)
    # pathologic_N                         = messages.StringField(31, repeated=True)
    # radiation_therapy                    = messages.StringField(32, repeated=True)
    # pathologic_T                         = messages.StringField(33, repeated=True)
    # race                                 = messages.StringField(34, repeated=True)
    # days_to_last_followup                = messages.StringField(35, repeated=True)
    # ethnicity                            = messages.StringField(36, repeated=True)
    # TP53                                 = messages.StringField(37, repeated=True)
    # RB1                                  = messages.StringField(38, repeated=True)
    # NF1                                  = messages.StringField(39, repeated=True)
    # APC                                  = messages.StringField(40, repeated=True)
    # CTNNB1                               = messages.StringField(41, repeated=True)
    # PIK3CA                               = messages.StringField(42, repeated=True)
    # PTEN                                 = messages.StringField(43, repeated=True)
    # FBXW7                                = messages.StringField(44, repeated=True)
    # NRAS                                 = messages.StringField(45, repeated=True)
    # ARID1A                               = messages.StringField(46, repeated=True)
    # CDKN2A                               = messages.StringField(47, repeated=True)
    # SMAD4                                = messages.StringField(48, repeated=True)
    # BRAF                                 = messages.StringField(49, repeated=True)
    # NFE2L2                               = messages.StringField(50, repeated=True)
    # IDH1                                 = messages.StringField(51, repeated=True)
    # PIK3R1                               = messages.StringField(52, repeated=True)
    # HRAS                                 = messages.StringField(53, repeated=True)
    # EGFR                                 = messages.StringField(54, repeated=True)
    # BAP1                                 = messages.StringField(55, repeated=True)
    # KRAS                                 = messages.StringField(56, repeated=True)
    # sampleType                           = messages.StringField(57, repeated=True)
    # DNAseq_data                          = messages.StringField(58, repeated=True)
    # mirnPlatform                         = messages.StringField(59, repeated=True)
    # cnvrPlatform                         = messages.StringField(60, repeated=True)
    # methPlatform                         = messages.StringField(61, repeated=True)
    # gexpPlatform                         = messages.StringField(62, repeated=True)
    # rppaPlatform                         = messages.StringField(63, repeated=True)

def createFMDomainsList(items):
    return FMDomainsList(
        # percent_lymphocyte_infiltration      = items['percent_lymphocyte_infiltration'],
        # percent_monocyte_infiltration        = items['percent_monocyte_infiltration'],
        # percent_necrosis                     = items['percent_necrosis'],
        # percent_neutrophil_infiltration      = items['percent_neutrophil_infiltration'],
        # percent_normal_cells                 = items['percent_normal_cells'],
        # percent_stromal_cells                = items['percent_stromal_cells'],
        # percent_tumor_cells                  = items['percent_tumor_cells'],
        # percent_tumor_nuclei                 = items['percent_tumor_nuclei'],
        gender                               = items['gender'],
        history_of_neoadjuvant_treatment     = items['history_of_neoadjuvant_treatment'],
        icd_o_3_histology                    = items['icd_o_3_histology'],
        prior_dx                             = items['prior_dx'],
        vital_status                         = items['vital_status'],
        country                              = items['country'],
        disease_code                         = items['disease_code'],
        histological_type                    = items['histological_type'],
        icd_10                               = items['icd_10'],
        icd_o_3_site                         = items['icd_o_3_site'],
        tumor_tissue_site                    = items['tumor_tissue_site'],
        tumor_type                           = items['tumor_type'],
        # age_at_initial_pathologic_diagnosis  = items['age_at_initial_pathologic_diagnosis'],
        # days_to_birth                        = items['days_to_birth'],
        # days_to_initial_pathologic_diagnosis = items['days_to_initial_pathologic_diagnosis'],
        # year_of_initial_pathologic_diagnosis = items['year_of_initial_pathologic_diagnosis'],
        # days_to_last_known_alive             = items['days_to_last_known_alive'],
        # tumor_necrosis_percent               = items['tumor_necrosis_percent'],
        # tumor_nuclei_percent                 = items['tumor_nuclei_percent'],
        # tumor_weight                         = items['tumor_weight'],
        person_neoplasm_cancer_status        = items['person_neoplasm_cancer_status'],
        pathologic_N                         = items['pathologic_N'],
        radiation_therapy                    = items['radiation_therapy'],
        pathologic_T                         = items['pathologic_T'],
        race                                 = items['race'],
        # days_to_last_followup                = items['days_to_last_followup'],
        ethnicity                            = items['ethnicity'],
        # TP53                                 = items['TP53'],
        # RB1                                  = items['RB1'],
        # NF1                                  = items['NF1'],
        # APC                                  = items['APC'],
        # CTNNB1                               = items['CTNNB1'],
        # PIK3CA                               = items['PIK3CA'],
        # PTEN                                 = items['PTEN'],
        # FBXW7                                = items['FBXW7'],
        # NRAS                                 = items['NRAS'],
        # ARID1A                               = items['ARID1A'],
        # CDKN2A                               = items['CDKN2A'],
        # SMAD4                                = items['SMAD4'],
        # BRAF                                 = items['BRAF'],
        # NFE2L2                               = items['NFE2L2'],
        # IDH1                                 = items['IDH1'],
        # PIK3R1                               = items['PIK3R1'],
        # HRAS                                 = items['HRAS'],
        # EGFR                                 = items['EGFR'],
        # BAP1                                 = items['BAP1'],
        # KRAS                                 = items['KRAS'],
        sampleType                           = items['sampleType'],
        DNAseq_data                          = items['DNAseq_data'],
        mirnPlatform                         = items['mirnPlatform'],
        cnvrPlatform                         = items['cnvrPlatform'],
        methPlatform                         = items['methPlatform'],
        gexpPlatform                         = items['gexpPlatform'],
        rppaPlatform                         = items['rppaPlatform'],
    )

FM_Endpoints = endpoints.api(name='fm_api', version='v1')

@FM_Endpoints.api_class(resource_name='fm_endpoints')
class FM_Endpoints_API(remote.Service):


    GET_RESOURCE = endpoints.ResourceContainer(User)
    @endpoints.method(GET_RESOURCE, UserList,
                      path='users', http_method='GET', name='test.getUsers')
    def users_list(self, request):
        query_dict = {}
        for key, value in User.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    if key == 'id':
                        query_dict['auth_user.id'] = request.__getattribute__(key)
                    else:
                        query_dict[key] = request.__getattribute__(key)

        query_str = 'SELECT * FROM auth_user ' \
                    'left join socialaccount_socialaccount on auth_user.id=socialaccount_socialaccount.user_id ' \
                    'left join accounts_nih_user on auth_user.id=accounts_nih_user.user_id'
        query_tuple = ()
        if len(query_dict) > 0:
            query_str += ' where '
            first = True

            for key, value in query_dict.items():
                if first:
                    query_str += key + '=%s'
                    first = False
                else:
                    query_str += ' and ' + key + '=%s'
                query_tuple += (value,)

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, query_tuple)
            data = []
            eud = None
            for row in cursor.fetchall():
                if row['extra_data'] is not None:
                    extra_json = json.loads(row['extra_data'], encoding='latin-1')
                    eud = ExtraUserData(
                        id=extra_json.get('id'),
                        name=extra_json.get('name').encode('utf-8').decode('utf-8'),
                        given_name=extra_json.get('given_name').encode('utf-8').decode('utf-8'),
                        family_name=extra_json.get('family_name').encode('utf-8').decode('utf-8'),
                        email=extra_json.get('email'),
                        picture=extra_json.get('picture'),
                        link=extra_json.get('link'),
                        verified_email=extra_json.get('verified_email'),
                        locale=extra_json.get('locale')
                    )
                else:
                    eud = ExtraUserData(
                        id='',
                        name='',
                        given_name='',
                        family_name='',
                        email='',
                        picture='',
                        link='',
                        verified_email=False,
                        locale=''
                    )
                data.append(User(id=str(row['id']),
                                 username=str(row['username']),
                                 first_name= row['first_name'].decode('latin-1').encode('utf-8').decode('utf-8'),
                                 last_name= row['last_name'].decode('latin-1').encode('utf-8').decode('utf-8'),
                                 email=str(row['email']),
                                 is_staff=str(row['is_staff']),
                                 is_active=str(row['is_active']),
                                 is_superuser=str(row['is_superuser']),
                                 last_login=str(row['last_login']),
                                 date_joined=str(row['date_joined']),
                                 NIH_username=str(row['NIH_username']),
                                 dbGaP_authorized=str(row['dbGaP_authorized']),
                                 extra_data=eud
                ))

            cursor.close()
            db.close()
            return UserList(items=data)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('User %s not found.' % (request.id,))

    GET_RESOURCE = endpoints.ResourceContainer(SavedSearch)
    @endpoints.method(GET_RESOURCE, SavedSearchList,
                      path='savedsearches', http_method='GET', name='search.list')
    def saved_searches_list(self, request):
        query_dict = {}
        value_tuple = ()
        for key, value in SavedSearch.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    query_dict[key] = request.__getattribute__(key)

        query_str = 'SELECT * FROM search_savedsearch'
        if len(query_dict) > 0:
            query_str += ' where '
            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            data = []
            for row in cursor.fetchall():
                 data.append(SavedSearch(
                     id                 =str(row['id']),
                     search_url         =str(row['search_url']),
                     barcodes           =str(row['barcodes']),
                     datatypes          =str(row['datatypes']),
                     last_date_saved    =str(row['last_date_saved']),
                     user_id            =str(row['user_id']),
                     name               =str(row['name']),
                     active             =str(row['active']),
                     parent_id          =str(row['parent_id'])
                     ))
            cursor.close()
            db.close()
            return SavedSearchList(items=data)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('Saved Search %s not found.' % (request.id,))


    POST_RESOURCE = endpoints.ResourceContainer(
        SavedSearch)
    @endpoints.method(POST_RESOURCE, SavedSearchList,
                      path='savedsearch', http_method='POST', name='search.save')
    def save_search(self, request):
        search_url = request.search_url
        datatypes = request.datatypes
        search_name = request.name
        barcodes = request.barcodes
        last_inserted = []
        user_id = request.user_id
        parent_id = request.parent_id

        db = sql_connection()
        query_dict = {}
        value_tuple = ()
        query_str = ''
        query_select_str = 'SELECT sample'
        if not barcodes:
            # get barcodes based on search_url

            if search_url:
                tmp = search_url.replace('#', '')[:-1]
                key_vals = tmp.split('&')
                for item in key_vals:
                    key, vals = item.split('=')
                    query_dict[key] = vals

                # Build SQL statement
                if len(query_dict) == 0:                        # If there are no parameters passed in selected everything
                    query_str = ' FROM fmdata'

                else:                                           # If there are parameters passed in
                    query_str = ' FROM fmdata where'
                    where_clause = build_where_clause(query_dict)
                    query_str += where_clause['query_str']
                    value_tuple = where_clause['value_tuple']

            if parent_id:
                search_str = 'SELECT barcodes FROM search_savedsearch WHERE id=%s;'
                try:

                    cursor = db.cursor(MySQLdb.cursors.DictCursor)
                    cursor.execute(search_str, (parent_id,))
                    row = cursor.fetchone()
                    if row['barcodes']:
                        barcodes = row['barcodes'].replace('[', '').replace(']', '').replace('\'', '').replace(' ', '').split(',')
                        if query_str.rfind('where') >= 0:
                            query_str += ' and sample in ('
                        else:
                            query_str += ' FROM fmdata where sample in ('
                        first = True
                        for code in barcodes:
                            if first:
                                first = False
                                query_str += '%s'
                            else:
                                query_str += ',%s'
                            value_tuple += (code,)
                        query_str += ')'
                except:
                    pass

            if not search_url and not parent_id:
                query_select_str += ' FROM fmdata'

            # print query_select_str, query_str

            try:
                query_str = query_select_str + query_str
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(query_str, value_tuple)
                barcodes = []
                for row in cursor.fetchall():
                    barcodes.append(row['sample'])

            except (IndexError):
                pass
        if not parent_id:
            parent_id = None
        insert_str = 'INSERT INTO search_savedsearch (barcodes, name, datatypes, last_date_saved, search_url, user_id, parent_id, active) VALUES(%s,%s,%s,now(),%s,%s, %s, 1);'
        value_tuple = (str(barcodes), str(search_name), str(datatypes), str(search_url), str(user_id), parent_id)
        query_str = "SELECT * FROM search_savedsearch ORDER BY last_date_saved DESC;"
        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(insert_str, value_tuple)

            db.commit()
            cursor.execute(query_str)
            row = cursor.fetchone()
            last_inserted.append(SavedSearch(
                id              = str(row['id']),
                search_url      = str(row['search_url']),
                barcodes        = str(row['barcodes']),
                datatypes       = str(row['datatypes']),
                last_date_saved = str(row['last_date_saved']),
                user_id         = str(row['user_id']),
                name            = str(row['name']),
                parent_id       = str(row['parent_id'])
            ))
            cursor.close()
            db.close()
            return SavedSearchList(items=last_inserted)
        except (IndexError, TypeError):
            db.rollback()
            db.close()
            raise endpoints.NotFoundException('\n\nnot found')

    POST_RESOURCE = endpoints.ResourceContainer(
        IdList)
    @endpoints.method(POST_RESOURCE, message_types.VoidMessage,
                      path='deletesearch', http_method='POST', name='search.delete')
    def delete_search(self, request):
        ids = request.ids
        update_str = 'UPDATE search_savedsearch SET active=0 WHERE id in ('
        first = True
        tuple = ()
        for id in ids:
            tuple += (id,)
            if first:
                update_str += '%s'
                first = False
            else:
                update_str +=',%s'
        update_str += ');'
        # print update_str
        # print tuple
        db = sql_connection()
        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(update_str, tuple)
            db.commit()
            cursor.close()
            db.close()
        except (IndexError, TypeError):
            db.rollback()
            db.close()
            raise endpoints.NotFoundException('Deletion error')
        return message_types.VoidMessage()

    GET_RESOURCE = endpoints.ResourceContainer(
        FMAttr)
    @endpoints.method(GET_RESOURCE, FMAttrList,
                      path='fmattr', http_method='GET',
                      name='fmdata.getFMAttrList')
    def fmattr_list(self, request):

        query_dict = {}
        value_tuple = ()
        for key, value in FMAttr.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) != None:
                    query_dict[key] = request.__getattribute__(key)

        if len(query_dict) == 0:
            query_str = 'SELECT * FROM fmdata_attr'
        else:
            query_str = 'SELECT * FROM fmdata_attr where'

            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            data = []
            for row in cursor.fetchall():
                data.append(FMAttr(attribute=str(row['attribute']),
                                   code=str(row['code']),
                                   spec=str(row['spec']),
                                   ))

            cursor.close()
            db.close()
            return FMAttrList(items=data)

        except (IndexError, TypeError):
            raise endpoints.NotFoundException('Sample %s not found.' % (request.id,))


    # ID_RESOURCE = endpoints.ResourceContainer(
    #     message_types.VoidMessage,
    #     id=messages.StringField(1))
    # @endpoints.method(ID_RESOURCE, FMItem,
    #                   path='fmdata/{id}', http_method='GET',
    #                   name='fmdata.getFmdata')
    # def fmdata_getone(self, request):
    #     try:
    #         db = sql_connection()
    #         cursor = db.cursor(MySQLdb.cursors.DictCursor)
    #         cursor.execute('SELECT * FROM fmdata where sample=%s;', (request.id,))
    #         row = cursor.fetchone()
    #         cursor.close()
    #         db.close()
    #         return create_FMItem(row)
    #
    #     except (IndexError, TypeError):
    #         raise endpoints.NotFoundException('Sample %s not found.' % (request.id,))

    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem,
        limit=messages.IntegerField(2),
        search_id=messages.IntegerField(3),
        selectors=messages.StringField(4, repeated=True))
    @endpoints.method(GET_RESOURCE, FMItemList,
                      path='fmdata', http_method='GET',
                      name='fmdata.getFmdataList')
    def fmdata_list(self, request):
        select = '*'
        value_tuple = ()
        query_dict = {}
        selector_list = []

        # Check for a limit passed in
        limit = None
        if request.__getattribute__('limit') is not None:
            limit = request.__getattribute__('limit')

        # Get the list of valid parameters from request
        for key, value in FMItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    query_dict[key] = request.__getattribute__(key)

        if request.__getattribute__('selectors') is not None and len(request.__getattribute__('selectors')):
            select = ','.join(request.selectors)
            selector_list = request.selectors

        # print select
        if len(query_dict) == 0:                        # If there are no parameters passed in select everything
            query_str = 'SELECT %s FROM fmdata' % select

        else:                                           # If there are parameters passed in
            query_str = 'SELECT %s FROM fmdata where' % select
            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        if limit is not None:
            query_str += ' LIMIT %d' % limit
        db = sql_connection()

        # Check for passed in saved search id
        search_id = None
        if request.search_id:
            search_id = request.search_id

        if search_id:
            search_url = 'SELECT barcodes FROM search_savedsearch WHERE id=%s;'
            try:

                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(search_url, (search_id,))
                row = cursor.fetchone()
                if row['barcodes']:
                    barcodes = row['barcodes'].replace('[', '').replace(']', '').replace('\'', '').replace(' ', '').split(',')
                    if query_str.rfind('where') >= 0:
                        query_str += ' and sample in ('
                    else:
                        query_str += ' where sample in ('
                    first = True
                    for code in barcodes:
                        if first:
                            first = False
                            query_str += '%s'
                        else:
                            query_str += ',%s'
                        value_tuple += (code,)
                    query_str += ')'
            except:
                pass

        query_str += ';'
        counts = {}
        for feature in IMPORTANT_FEATURES:
            counts[feature] = {}

        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            data = []
            for row in cursor.fetchall():
                item = create_FMItem(row, selector_list)
                data.append(item)

            cursor.close()
            db.close()

            return FMItemList(items=data)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('Sample %s not found.' % (request.id,))

    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem,
        limit=messages.IntegerField(2),
        search_id=messages.IntegerField(3),
        selectors=messages.StringField(4, repeated=True))
    @endpoints.method(GET_RESOURCE, FMItemList,
                      path='fmdata_cohort', http_method='GET',
                      name='fmdata_cohort.getFmdataCohortList')
    def fmdata_cohort_list(self, request):
        select = '*'
        value_tuple = ()
        query_dict = {}
        selector_list = []

        # Check for a limit passed in
        limit = None
        if request.__getattribute__('limit') is not None:
            limit = request.__getattribute__('limit')

        # Get the list of valid parameters from request
        for key, value in FMItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    query_dict[key] = request.__getattribute__(key)

        if request.__getattribute__('selectors') is not None and len(request.__getattribute__('selectors')):
            select = ','.join(request.selectors)
            selector_list = request.selectors

        # print select
        if len(query_dict) == 0:                        # If there are no parameters passed in select everything
            query_str = 'SELECT %s FROM fmdata' % select

        else:                                           # If there are parameters passed in
            query_str = 'SELECT %s FROM fmdata where' % select
            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        if limit is not None:
            query_str += ' LIMIT %d' % limit
        db = sql_connection()

        # Check for passed in saved search id
        search_id = None
        if request.search_id:
            search_id = request.search_id

        if search_id:
            search_url = 'SELECT sample_id FROM cohorts_samples WHERE cohort_id=%s;'
            # print search_url
            try:

                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(search_url, (search_id,))
                if query_str.rfind('where') >= 0:
                    query_str += ' and sample in ('
                else:
                    query_str += ' where sample in ('
                first = True
                i = 0
                for code in cursor.fetchall():
                    i+=1
                    if first:
                        first = False
                        query_str += '%s'
                    else:
                        query_str += ',%s'
                    value_tuple += (str(code['sample_id']),)
                query_str += ')'
            except:
                pass

        query_str += ';'
        counts = {}
        for feature in IMPORTANT_FEATURES:
            counts[feature] = {}

        try:

            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            data = []
            for row in cursor.fetchall():
                item  = create_FMItem(row, selector_list)

                # for feature in IMPORTANT_FEATURES:
                #     value = item.__getattribute__(feature)
                #     if value in counts[feature].keys():
                #         counts[feature][value] += 1
                #     else:
                #         counts[feature][value] = 1
                data.append(item)

            cursor.close()
            db.close()
            # value_list = {}
            # for feature, values in counts.items():
            #     value_list[feature] = []
            #     if values:
            #         for key, count in values.items():
            #             value_list[feature].append(FMValueListCount(value=key, count=count))
            #     else:
            #         value_list[feature].append(FMValueListCount(value='None', count=0))
            # attr_list = FMAttrValuesList(
            #     gender                               = value_list['gender'],
            #     vital_status                         = value_list['vital_status'],
            #     country                              = value_list['country'],
            #     disease_code                         = value_list['disease_code'],
            #     tumor_tissue_site                    = value_list['tumor_tissue_site'],
            #     age_at_initial_pathologic_diagnosis  = value_list['age_at_initial_pathologic_diagnosis'],
            #     TP53                                 = value_list['TP53'],
            #     RB1                                  = value_list['RB1'],
            #     NF1                                  = value_list['NF1'],
            #     APC                                  = value_list['APC'],
            #     CTNNB1                               = value_list['CTNNB1'],
            #     PIK3CA                               = value_list['PIK3CA'],
            #     PTEN                                 = value_list['PTEN'],
            #     FBXW7                                = value_list['FBXW7'],
            #     NRAS                                 = value_list['NRAS'],
            #     ARID1A                               = value_list['ARID1A'],
            #     CDKN2A                               = value_list['CDKN2A'],
            #     SMAD4                                = value_list['SMAD4'],
            #     BRAF                                 = value_list['BRAF'],
            #     NFE2L2                               = value_list['NFE2L2'],
            #     IDH1                                 = value_list['IDH1'],
            #     PIK3R1                               = value_list['PIK3R1'],
            #     HRAS                                 = value_list['HRAS'],
            #     EGFR                                 = value_list['EGFR'],
            #     BAP1                                 = value_list['BAP1'],
            #     KRAS                                 = value_list['KRAS'],
            #     DNAseq_data                          = value_list['DNAseq_data'],
            #     mirnPlatform                         = value_list['mirnPlatform'],
            #     cnvrPlatform                         = value_list['cnvrPlatform'],
            #     methPlatform                         = value_list['methPlatform'],
            #     gexpPlatform                         = value_list['gexpPlatform'],
            #     rppaPlatform                         = value_list['rppaPlatform'],
            #     )
            return FMItemList(items=data)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('Sample %s not found.' % (request.id,))


    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem,
        # limit=messages.IntegerField(2),
        search_id=messages.IntegerField(2))
    @endpoints.method(GET_RESOURCE, FMItemList,
                      path='fmdata_search', http_method='GET',
                      name='fmdata.getFmdataSearchList')
    def fmdata_search_list(self, request):
        t0 = time.clock()
        query_dict = {}
        value_tuple = ()
        # # Check for a limit passed in
        # limit = None
        # if request.__getattribute__('limit') != None:
        #     limit = request.__getattribute__('limit')

        # Get the list of valid parameters from request
        for key, value in FMItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    query_dict[key] = request.__getattribute__(key)

        counts = {}
        for feature in IMPORTANT_FEATURES:
            counts[feature] = {}

        # Build SQL statement
        if len(query_dict) == 0:                        # If there are no parameters passed in selected everything
            query_str = ' FROM fmdata'

        else:                                           # If there are parameters passed in
            query_str = ' FROM fmdata where'
            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        db = sql_connection()

        # Check for passed in saved search id
        search_id = None
        if request.search_id:
            search_id = request.search_id

        if search_id:
            search_url = 'SELECT barcodes FROM search_savedsearch WHERE id=%s;'
            try:

                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(search_url, (search_id,))
                row = cursor.fetchone()
                if row['barcodes']:
                    barcodes = row['barcodes'].replace('[', '').replace(']', '').replace('\'', '').replace(' ', '').split(',')
                    if query_str.rfind('where') >= 0:
                        query_str += ' and sample in ('
                    else:
                        query_str += ' where sample in ('
                    first = True
                    for code in barcodes:
                        if first:
                            first = False
                            query_str += '%s'
                        else:
                            query_str += ',%s'
                        value_tuple += (code,)
                    query_str += ')'
            except:
                pass

        # print query_str
        # print value_tuple
        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            count_query_str = 'SELECT count(*) ' + query_str + ';'

            # print count_query_str
            cursor.execute(count_query_str, value_tuple)
            row = cursor.fetchone()
            total_count =  row['count(*)']

            for feature in IMPORTANT_FEATURES:
                # select distinct disease_code, count(*) from fmdata where group by disease_code;
                start_query_str = 'select distinct %s, count(*) ' % feature
                end_query_str = ' group by %s ' % feature
                combined_query_str = start_query_str + query_str + end_query_str
                cursor.execute(combined_query_str, value_tuple)
                data = []

                for row in cursor.fetchall():
                    value = row[feature]
                    count = row['count(*)']
                    counts[feature][str(value)] = count

            cursor.close()
            db.close()
            value_list = {}
            for feature, values in counts.items():
                value_list[feature] = []
                if values:
                    for key, count in values.items():
                        value_list[feature].append(FMValueListCount(value=key, count=count))
                else:
                    value_list[feature].append(FMValueListCount(value='None', count=0))
            value_list['age_at_initial_pathologic_diagnosis'] = normalize_ages(value_list['age_at_initial_pathologic_diagnosis'])

            attr_list = FMAttrValuesList(
                gender                               = value_list['gender'],
                vital_status                         = value_list['vital_status'],
                country                              = value_list['country'],
                disease_code                         = value_list['disease_code'],
                tumor_tissue_site                    = value_list['tumor_tissue_site'],
                age_at_initial_pathologic_diagnosis  = value_list['age_at_initial_pathologic_diagnosis'],
                TP53                                 = value_list['TP53'],
                RB1                                  = value_list['RB1'],
                NF1                                  = value_list['NF1'],
                APC                                  = value_list['APC'],
                CTNNB1                               = value_list['CTNNB1'],
                PIK3CA                               = value_list['PIK3CA'],
                PTEN                                 = value_list['PTEN'],
                FBXW7                                = value_list['FBXW7'],
                NRAS                                 = value_list['NRAS'],
                ARID1A                               = value_list['ARID1A'],
                CDKN2A                               = value_list['CDKN2A'],
                SMAD4                                = value_list['SMAD4'],
                BRAF                                 = value_list['BRAF'],
                NFE2L2                               = value_list['NFE2L2'],
                IDH1                                 = value_list['IDH1'],
                PIK3R1                               = value_list['PIK3R1'],
                HRAS                                 = value_list['HRAS'],
                EGFR                                 = value_list['EGFR'],
                BAP1                                 = value_list['BAP1'],
                KRAS                                 = value_list['KRAS'],
                DNAseq_data                          = value_list['DNAseq_data'],
                mirnPlatform                         = value_list['mirnPlatform'],
                cnvrPlatform                         = value_list['cnvrPlatform'],
                methPlatform                         = value_list['methPlatform'],
                gexpPlatform                         = value_list['gexpPlatform'],
                rppaPlatform                         = value_list['rppaPlatform'],
                )

            # print time.clock() - t0, ' seconds to query and return'
            return FMItemList(items=data, counts=attr_list, total=total_count)
        except (IndexError, TypeError) as e:
            print '\nerror is'
            print e
            raise endpoints.NotFoundException('Sample %s not found.' % (request.id,))

    # ID_RESOURCE = endpoints.ResourceContainer(
    #     message_types.VoidMessage,
    #     id=messages.StringField(1))
    # @endpoints.method(ID_RESOURCE, FMSampleData,
    #                   path='fmdata_attr', http_method='GET',
    #                   name='fmdata.getFmdata_attr')
    # def fmdata_get(self, request):
    #
    #     try:
    #         db = sql_connection()
    #         cursor = db.cursor()
    #         query_str = 'SELECT COUNT(*) FROM fmdata'
    #         cursor.execute(query_str)
    #         total_samples = cursor.fetchone()[0]
    #
    #         value_list = {}
    #         for key in IMPORTANT_FEATURES:
    #             query_str = 'SELECT %s, count(*) FROM fmdata GROUP BY %s;' % (key, key)
    #             cursor.execute(query_str)
    #
    #             value_list[key] = []
    #             count = 0
    #             for row in cursor.fetchall():
    #                 count += row[1]
    #                 if type(row[0]) == long:
    #                     value_list[key].append(FMValueListCount(value=str(int(row[0])), count=row[1]))
    #                 else:
    #                     value_list[key].append(FMValueListCount(value=str(row[0]), count=row[1]))
    #
    #         value_list['age_at_initial_pathologic_diagnosis'] = normalize_ages(value_list['age_at_initial_pathologic_diagnosis'])
    #         attr_list = FMAttrValuesList(
    #             #                 sample                               = value_list['sample'],
    #             #                 percent_lymphocyte_infiltration      = value_list['percent_lymphocyte_infiltration'],
    #             #                 percent_monocyte_infiltration        = value_list['percent_monocyte_infiltration'],
    #             #                 percent_necrosis                     = value_list['percent_necrosis'],
    #             #                 percent_neutrophil_infiltration      = value_list['percent_neutrophil_infiltration'],
    #             #                 percent_normal_cells                 = value_list['percent_normal_cells'],
    #             #                 percent_stromal_cells                = value_list['percent_stromal_cells'],
    #             #                 percent_tumor_cells                  = value_list['percent_tumor_cells'],
    #             #                 percent_tumor_nuclei                 = value_list['percent_tumor_nuclei'],
    #                             gender                               = value_list['gender'],
    #             #                 history_of_neoadjuvant_treatment     = value_list['history_of_neoadjuvant_treatment'],
    #             #                 icd_o_3_histology                    = value_list['icd_o_3_histology'],
    #             #                 prior_dx                             = value_list['prior_dx'],
    #                             vital_status                         = value_list['vital_status'],
    #                             country                              = value_list['country'],
    #                             disease_code                         = value_list['disease_code'],
    #             #                 histological_type                    = value_list['histological_type'],
    #             #                 icd_10                               = value_list['icd_10'],
    #             #                 icd_o_3_site                         = value_list['icd_o_3_site'],
    #                             tumor_tissue_site                    = value_list['tumor_tissue_site'],
    #             #                 tumor_type                           = value_list['tumor_type'],
    #                             age_at_initial_pathologic_diagnosis  = value_list['age_at_initial_pathologic_diagnosis'],
    #             #                 days_to_birth                        = value_list['days_to_birth'],
    #             #                 days_to_initial_pathologic_diagnosis = value_list['days_to_initial_pathologic_diagnosis'],
    #             #                 year_of_initial_pathologic_diagnosis = value_list['year_of_initial_pathologic_diagnosis'],
    #             #                 days_to_last_known_alive             = value_list['days_to_last_known_alive'],
    #             #                 tumor_necrosis_percent               = value_list['tumor_necrosis_percent'],
    #             #                 tumor_nuclei_percent                 = value_list['tumor_nuclei_percent'],
    #             #                 tumor_weight                         = value_list['tumor_weight'],
    #             #                 person_neoplasm_cancer_status        = value_list['person_neoplasm_cancer_status'],
    #             #                 pathologic_N                         = value_list['pathologic_N'],
    #             #                 radiation_therapy                    = value_list['radiation_therapy'],
    #             #                 pathologic_T                         = value_list['pathologic_T'],
    #             #                 race                                 = value_list['race'],
    #             #                 days_to_last_followup                = value_list['days_to_last_followup'],
    #             #                 ethnicity                            = value_list['ethnicity'],
    #                             TP53                                 = value_list['TP53'],
    #                             RB1                                  = value_list['RB1'],
    #                             NF1                                  = value_list['NF1'],
    #                             APC                                  = value_list['APC'],
    #                             CTNNB1                               = value_list['CTNNB1'],
    #                             PIK3CA                               = value_list['PIK3CA'],
    #                             PTEN                                 = value_list['PTEN'],
    #                             FBXW7                                = value_list['FBXW7'],
    #                             NRAS                                 = value_list['NRAS'],
    #                             ARID1A                               = value_list['ARID1A'],
    #                             CDKN2A                               = value_list['CDKN2A'],
    #                             SMAD4                                = value_list['SMAD4'],
    #                             BRAF                                 = value_list['BRAF'],
    #                             NFE2L2                               = value_list['NFE2L2'],
    #                             IDH1                                 = value_list['IDH1'],
    #                             PIK3R1                               = value_list['PIK3R1'],
    #                             HRAS                                 = value_list['HRAS'],
    #                             EGFR                                 = value_list['EGFR'],
    #                             BAP1                                 = value_list['BAP1'],
    #                             KRAS                                 = value_list['KRAS'],
    #             #                 sampleType                           = value_list['sampleType'],
    #                             DNAseq_data                          = value_list['DNAseq_data'],
    #                             mirnPlatform                         = value_list['mirnPlatform'],
    #                             cnvrPlatform                         = value_list['cnvrPlatform'],
    #                             methPlatform                         = value_list['methPlatform'],
    #                             gexpPlatform                         = value_list['gexpPlatform'],
    #                             rppaPlatform                         = value_list['rppaPlatform'],
    #                             )
    #         cursor.close()
    #         db.close()
    #         return FMSampleData(attribute_list=attr_list, total_samples=total_samples)
    #     except (IndexError, TypeError):
    #         raise endpoints.NotFoundException('Error computing attributes.')

    GET_RESOURCE = endpoints.ResourceContainer(
        message_types.VoidMessage)
    @endpoints.method(GET_RESOURCE, FMLandingDataList,
                      path='fmlanding', http_method='GET',
                      name='fmdata.getFMLandingData')
    def landing_list(self, request):

        try:
            query_str = 'SELECT DISTINCT disease_code, count(*) from fmdata GROUP BY disease_code;'
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str)
            data_list = []
            for row in cursor.fetchall():
                data_list.append(FMLandingData(value=str(row['disease_code']),
                                  count=int(row['count(*)'])))
            cursor.close()
            db.close()
            return FMLandingDataList(items=data_list)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('Landing Data Not found.')

    @endpoints.method(message_types.VoidMessage, FMDomainsList,
                      path='fmdomains', http_method='GET',
                      name='fmdata.getFMDomainsList')
    def domains_list(self, request):
        db = sql_connection()
        cursor = db.cursor()
        items = {}
        feature_list = FMDomainsList.__dict__.keys()
        fm_categorical_attributes = [
            'gender',
            'history_of_neoadjuvant_treatment',
            'icd_o_3_histology',
            'prior_dx',
            'vital_status',
            'country',
            'disease_code',
            'histological_type',
            'icd_10',
            'icd_o_3_site',
            'tumor_tissue_site',
            'tumor_type',
            'person_neoplasm_cancer_status',
            'pathologic_N',
            'radiation_therapy',
            'pathologic_T',
            'race',
            'ethnicity',
            'sampleType',
            'DNAseq_data',
            'mirnPlatform',
            'cnvrPlatform',
            'methPlatform',
            'gexpPlatform',
            'rppaPlatform'
        ]
        try:
            for feature in feature_list:
                if '__' not in feature:
                    query_str = 'SELECT DISTINCT %s from fmdata;' % feature
                    cursor.execute(query_str)
                    item_list = []
                    for item in cursor.fetchall():
                        item_list.append(str(item[0]))
                    items[feature] = item_list
            items['age_at_initial_pathologic_diagnosis'] = ['10 to 39', '40 to 49', '50 to 59', '60 to 69', '70 to 79', 'Over 80', 'None']
            return createFMDomainsList(items)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('Error in fmdomains')

    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem,
        limit=messages.IntegerField(2),
        search_id=messages.IntegerField(3))
    @endpoints.method(GET_RESOURCE, FMItemList,
                      path='fmdata_parsets', http_method='GET',
                      name='fmdata.getFmdataParsets')
    def fmdata_parsets(self, request):
        t0 = time.clock()
        query_dict = {}
        value_tuple = ()

        # Check for a limit passed in
        limit = None
        if request.__getattribute__('limit') != None:
            limit = request.__getattribute__('limit')

        # Check for search_id
        search_id = None
        if request.__getattribute__('search_id') != None:
            search_id = request.search_id

        # Get the list of valid parameters from request
        for key, value in FMItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    query_dict[key] = request.__getattribute__(key)

        counts = {}

        features = ['DNAseq_data'
                    'mirnPlatform'
                    'cnvrPlatform'
                    'methPlatform'
                    'gexpPlatform'
                    'rppaPlatform']

        # Build SQL statement
        if len(query_dict) == 0:                        # If there are no parameters passed in selected everything
            query_str = 'SELECT DNAseq_data, mirnPlatform, cnvrPlatform, methPlatform, gexpPlatform, rppaPlatform FROM fmdata'

        else:                                           # If there are parameters passed in
            query_str = 'SELECT DNAseq_data, mirnPlatform, cnvrPlatform, methPlatform, gexpPlatform, rppaPlatform FROM fmdata where'
            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        if limit is not None:
            query_str += ' LIMIT %d' % limit

        if search_id:
            search_url = 'SELECT barcodes FROM search_savedsearch WHERE id=%s;'
            try:
                db = sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(search_url, (search_id,))
                row = cursor.fetchone()

                if row['barcodes']:
                    barcodes = row['barcodes'][0:-1].replace("'", "").replace(' ','').split(',')

                    # Found barcodes, add to search query
                    if query_str.rfind('where') >= 0:
                        query_str += ' and sample in ('
                    else:
                        query_str += ' where sample in ('
                    first = True
                    for code in barcodes:
                        if first:
                            first = False
                            query_str += '%s'
                        else:
                            query_str += ',%s'
                        value_tuple += (code,)
                    query_str += ')'
            except:
                pass

        query_str += ';'

        try:

            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            list = []
            for row in cursor.fetchall():

                item = FMItem(
                    DNAseq_data                          = str(row['DNAseq_data']),
                    mirnPlatform                         = str(row['mirnPlatform']),
                    cnvrPlatform                         = str(row['cnvrPlatform']),
                    methPlatform                         = str(row['methPlatform']),
                    gexpPlatform                         = str(row['gexpPlatform']),
                    rppaPlatform                         = str(row['rppaPlatform']),
                    )
                list.append(item)

            return FMItemList(items=list, counts=counts)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('Error fetching parallel sets data.')


    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem,
        limit=messages.IntegerField(2),
        search_id=messages.IntegerField(3))
    @endpoints.method(GET_RESOURCE, FMItemList,
                      path='fmdata_latency_test', http_method='GET',
                      name='fmdata.getFmdataLatencyTest')
    def fmdata_latency_test(self, request):
        t0 = time.clock()
        query_dict = {}

        # Check for a limit passed in
        limit = None
        if request.__getattribute__('limit') != None:
            limit = request.__getattribute__('limit')

        # Get the list of valid parameters from request
        for key, value in FMItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    query_dict[key] = request.__getattribute__(key)

        counts = {}
        for feature in IMPORTANT_FEATURES:
            counts[feature] = {}

        # Build SQL statement
        if len(query_dict) == 0:                        # If there are no parameters passed in selected everything
            query_str = ' FROM fmdata'

        else:                                           # If there are parameters passed in
            query_str = ' FROM fmdata where'
            query_str += build_where_clause(query_dict)

        if limit is not None:
            query_str += ' LIMIT %d' % limit

        # Check for passed in saved search id
        search_id = None
        if request.__getattribute__('search_id') != None:
            search_id = request.search_id

        if search_id:
            search_url = 'SELECT barcodes FROM search_savedsearch WHERE id=%d;' % search_id
            try:
                db = sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(search_url)
                row = cursor.fetchone()

                if row['barcodes']:
                    barcodes = row['barcodes'].replace(',', '","')
                    # Found barcodes, add to search query
                    if query_str.rfind('where') >= 0:
                        query_str += ' and sample in ("%s")' % barcodes
                    else:
                        query_str += ' where sample in ("%s")' % barcodes

            except:
                pass

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)

            count_query_str = 'SELECT count(*) ' + query_str
            cursor.execute(count_query_str)
            row = cursor.fetchone()
            total_count =  row['count(*)']

            for feature in IMPORTANT_FEATURES:
                # select distinct disease_code, count(*) from fmdata where group by disease_code;
                start_query_str = 'select distinct %s, count(*) ' % feature

                end_query_str = ' group by %s;' % feature
                combined_query_str = start_query_str + query_str + end_query_str


                cursor.execute(combined_query_str)
                data = []

                for row in cursor.fetchall():
                    value = row[feature]
                    count = row['count(*)']
                    counts[feature][str(value)] = count

            cursor.close()
            db.close()
            value_list = {}
            for feature, values in counts.items():
                value_list[feature] = []
                if values:
                    for key, count in values.items():
                        value_list[feature].append(FMValueListCount(value=key, count=count))
                else:
                    value_list[feature].append(FMValueListCount(value='None', count=0))
            value_list['age_at_initial_pathologic_diagnosis'] = normalize_ages(value_list['age_at_initial_pathologic_diagnosis'])

            attr_list = FMAttrValuesList(
                gender                               = value_list['gender'],
                vital_status                         = value_list['vital_status'],
                country                              = value_list['country'],
                disease_code                         = value_list['disease_code'],
                tumor_tissue_site                    = value_list['tumor_tissue_site'],
                age_at_initial_pathologic_diagnosis  = value_list['age_at_initial_pathologic_diagnosis'],
                TP53                                 = value_list['TP53'],
                RB1                                  = value_list['RB1'],
                NF1                                  = value_list['NF1'],
                APC                                  = value_list['APC'],
                CTNNB1                               = value_list['CTNNB1'],
                PIK3CA                               = value_list['PIK3CA'],
                PTEN                                 = value_list['PTEN'],
                FBXW7                                = value_list['FBXW7'],
                NRAS                                 = value_list['NRAS'],
                ARID1A                               = value_list['ARID1A'],
                CDKN2A                               = value_list['CDKN2A'],
                SMAD4                                = value_list['SMAD4'],
                BRAF                                 = value_list['BRAF'],
                NFE2L2                               = value_list['NFE2L2'],
                IDH1                                 = value_list['IDH1'],
                PIK3R1                               = value_list['PIK3R1'],
                HRAS                                 = value_list['HRAS'],
                EGFR                                 = value_list['EGFR'],
                BAP1                                 = value_list['BAP1'],
                KRAS                                 = value_list['KRAS'],
                DNAseq_data                          = value_list['DNAseq_data'],
                mirnPlatform                         = value_list['mirnPlatform'],
                cnvrPlatform                         = value_list['cnvrPlatform'],
                methPlatform                         = value_list['methPlatform'],
                gexpPlatform                         = value_list['gexpPlatform'],
                rppaPlatform                         = value_list['rppaPlatform'],
                )

            # print time.clock() - t0, ' seconds to query and return'
            return FMItemList(items=[], counts={}, total=0)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('Sample %s not found.' % (request.id,))

    @endpoints.method(message_types.VoidMessage, FMItemList,
                      path='fmdata_latency_test2', http_method='GET',
                      name='fmdata.getFmdataLatencyTest2')
    def fmdata_latency_test2(self, request):
        return FMItemList(items=[], counts={}, total=0)

    GET_RESOURCE = endpoints.ResourceContainer(InputSavedViz)
    @endpoints.method(GET_RESOURCE, SavedVizList,
                      path='saved_viz_list', http_method='GET',
                      name='fmdata.saved_viz_list')
    def saved_viz_list(self, request):
        query_dict = {}

        # Get the list of valid parameters from request
        for key, value in InputSavedViz.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None and len(request.__getattribute__(key)):
                    query_dict[key] = request.__getattribute__(key)

        # Build SQL statement
        value_tuple = ()
        if len(query_dict) == 0:                        # If there are no parameters passed in selected everything
            query_str = 'SELECT * FROM visualizations_savedviz'

        else:                                           # If there are parameters passed in
            query_str = 'SELECT * FROM visualizations_savedviz where'
            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']
        db = sql_connection()
        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            visualizations = cursor.fetchall()
            items = []
            for row in visualizations:
                plots = []
                query_str = 'SELECT * FROM visualizations_plot as vp JOIN search_savedsearch as ss ON vp.cohort_id=ss.id WHERE vp.visualization_id=%s;'
                cursor.execute(query_str, (row['id'],))
                for plot_row in cursor.fetchall():

                    plots.append(ReturnPlot(
                        title=str(plot_row['title']),
                        cohort=SavedSearch(
                            id = str(plot_row['ss.id']),
                            search_url = str(plot_row['search_url']),
                            barcodes = str(plot_row['barcodes']),
                            datatypes = str(plot_row['datatypes']),
                            last_date_saved = str(plot_row['last_date_saved']),
                            user_id = str(plot_row['user_id']),
                            name = str(plot_row['name']),
                        ),
                        x_axis=str(plot_row['x_axis']),
                        y_axis=str(plot_row['y_axis']),
                        color_by=str(plot_row['color_by']),
                        plot_type=str(plot_row['plot_type'])
                    ))
                items.append(ReturnSavedViz(
                    id=str(row['id']),
                    user_id=str(row['user_id']),
                    name=str(row['name']),
                    date_saved=str(row['date_saved']),
                    plots=plots
                ))
            cursor.close()
            db.close()
            return SavedVizList(items=items)
        except (IndexError, TypeError):
            db.close()
            raise endpoints.NotFoundException('Error: Visualizations Not Found')

        # return SavedVizList(items=items)


    GET_RESOURCE = endpoints.ResourceContainer(InputSavedViz)
    @endpoints.method(GET_RESOURCE, ReturnSavedViz,
                      path='save_viz', http_method='POST',
                      name='fmdata.save_viz')
    def save_viz(self, request):
        viz_name = request.name
        user_id = int(request.user_id)
        query_str = "SELECT * FROM visualizations_savedviz ORDER BY date_saved DESC;"
        insert_viz_str = 'INSERT INTO visualizations_savedviz (user_id, name, date_saved) VALUES (%s, %s, now());'
        vals = (user_id, viz_name)

        db = sql_connection()
        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(insert_viz_str, vals)
            db.commit()
            cursor.execute(query_str)
            row = cursor.fetchone()

            request_plots = request.plots

            for plot in request_plots:
                insert_plot_str = 'INSERT INTO visualizations_plot (visualization_id, title, cohort_id, x_axis, y_axis, color_by, plot_type) VALUES (%s, %s, %s, %s, %s, %s, %s);'
                tuple =  (row['id'], plot.title, plot.cohort, plot.x_axis, plot.y_axis, plot.color_by, plot.plot_type)
                cursor.execute(insert_plot_str, tuple)
                db.commit()
            cursor.execute(query_str)
            row = cursor.fetchone()
            cursor.close()
            db.close()
            return ReturnSavedViz(
                id=str(row['id']),
                name=str(row['name']),
                user_id=str(row['user_id']),
                plots=request_plots
                )

        except (IndexError, TypeError):
            db.rollback()
            cursor.close()
            db.close()
            raise endpoints.NotFoundException('Error: Visualization Unsaved')


#################################################################
#  BEGINNING OF FILTERED_LIST_FREEZE PLOT ENDPOINTS
#################################################################

class Filtered_List_Freeze_Item(messages.Message):
    participant        = messages.StringField(1)
    sample             = messages.StringField(2)
    barcode            = messages.StringField(3)
    uuid_aliquot       = messages.StringField(4)
    data_type          = messages.StringField(5)
    platform           = messages.StringField(6)
    data_level         = messages.IntegerField(7)
    batch              = messages.IntegerField(8)
    archive_name       = messages.StringField(9)
    url                = messages.StringField(10)
    date_added         = messages.StringField(11)
    annotation_types   = messages.StringField(12)


class Filtered_List_Freeze_List(messages.Message):
    items = messages.MessageField(Filtered_List_Freeze_Item, 1, repeated=True)
    count = messages.IntegerField(2)

FL_Endpoints = endpoints.api(name='fl_api', version='v1')

@FL_Endpoints.api_class(resource_name='filtered_list_endpoints')
class Filtered_List_Endpoints_API(remote.Service):

    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem,
        limit=messages.StringField(2),
        data_level=messages.StringField(3),
        data_type=messages.StringField(4),
        platform=messages.StringField(5),
        archive_name=messages.StringField(6))
    @endpoints.method(GET_RESOURCE, Filtered_List_Freeze_List,
                      path='filtered_list_search', http_method='GET',
                      name='filtered_list.getFilteredListFreezeList')
    def filtered_list_search_list(self, request):
        FMItem_query_dict = {}
        FLFreezeItem_query_dict = {}

        # Check for a limit passed in
        limit = None
        if request.__getattribute__('limit') is not None:
            limit = request.__getattribute__('limit')

        # Get the list of valid parameters from request
        for key, value in FMItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    try:
                        FMItem_query_dict[key] = request.__getattribute__(key)
                    except AttributeError:
                        raise endpoints.NotFoundException('Feature Matrix item not found.')

        for key in ['data_level', 'data_type', 'platform', 'archive_name']:
            if request.__getattribute__(key) is not None:
                try:
                    FLFreezeItem_query_dict[key] = request.__getattribute__(key)
                except AttributeError:
                    raise endpoints.NotFoundException('Filtered List Freeze item not found.')

        if len(FMItem_query_dict) == 0 and len(FLFreezeItem_query_dict) == 0:
            return Filtered_List_Freeze_List(items=[], count=['select parameters to filter results'])

        file_query_str = 'select fmdata_filtered_list_freeze.participant, ' \
                    'fmdata_filtered_list_freeze.sample, ' \
                    'fmdata_filtered_list_freeze.barcode, ' \
                    'fmdata_filtered_list_freeze.uuid_aliquot, ' \
                    'fmdata_filtered_list_freeze.data_type, ' \
                    'fmdata_filtered_list_freeze.platform, ' \
                    'fmdata_filtered_list_freeze.data_level, ' \
                    'fmdata_filtered_list_freeze.batch, ' \
                    'fmdata_filtered_list_freeze.archive_name, ' \
                    'fmdata_filtered_list_freeze.url, ' \
                    'fmdata_filtered_list_freeze.date_added, ' \
                    'fmdata_filtered_list_freeze.annotation_types ' \
                    'from fmdata, fmdata_filtered_list_freeze ' \
                    'where fmdata_filtered_list_freeze.sample like concat(fmdata.sample, "%") '

        count_query_str = 'select count(*) ' \
                    'from fmdata, fmdata_filtered_list_freeze ' \
                    'where fmdata_filtered_list_freeze.sample like concat(fmdata.sample, "%") '

        query_str = ''
        # to do: fix query_str to only have %s placeholders
        # and make corresponding query_array to contain the placeholder values

        for key, value in FMItem_query_dict.items():
            query_str += ' and'
            if ',' in value:
                value = value.split(',')
            if key == 'age_at_initial_pathologic_diagnosis':
                    query_str += ' (' + sql_age_by_ranges(value) + ') '
                    query_str.replace('age_at_initial_pathologic_diagnosis', 'fmdata.age_at_initial_pathologic_diagnosis')
            elif not isinstance(value, basestring):
                has_null = False
                if 'None' in value:
                    has_null = True
                    query_str += ' (fmdata.%s is null or' % key
                    value.remove('None')
                query_str += ' fmdata.%s in (' % key
                i = 0
                for val in value:
                    if i == 0:
                        query_str += '"%s"' % val
                        i += 1
                    else:
                        query_str += ',"%s"' % val
                query_str += ')'
                if has_null:
                    query_str += ')'
            elif value == 'None':
                    query_str += ' fmdata.%s is null' % key
            else:
                query_str += ' fmdata.%s="%s"' % (key, value)

        for key, value in FLFreezeItem_query_dict.items():
            query_str += ' and'
            if key == 'archive_name':
                if ',' in value:
                    value = value.split(',')
                    query_str += '('
                    for val in value:
                        if value.index(val):
                            query_str += ' or '
                        query_str += 'archive_name like "%' + val + '%"'
                    query_str += ')'
                else:
                    query_str += ' archive_name like  "%' + value + '%"'
            else:
                if ',' in value:
                    value = value.split(',')
                    for val in value:
                        index = value.index(val)
                        val = value.pop(index)
                        val = '"%s"' % val
                        value.insert(index, val)
                    value = ','.join(value)
                    query_str += ' fmdata_filtered_list_freeze.%s in (%s)' % (key, value)
                else:
                    query_str += ' fmdata_filtered_list_freeze.%s="%s"' % (key, value)

        # print '\n\nquery_str: ' + file_query_str + query_str
        # try:
        db = sql_connection()
        cursor = db.cursor()

        cursor.execute(count_query_str + query_str)
        # print '\n\ncount_query_str: ' + count_query_str + query_str
        query_count = cursor.fetchone()[0]

        if limit is not None:
            # query_str += ' LIMIT %s' % limit
            pass

        query_str += ';'
        # print '\n\nquery_str: ' + file_query_str + query_str
        cursor.execute(file_query_str + query_str)

        file_list = []

        for row in cursor.fetchall():
            new_freeze_item = Filtered_List_Freeze_Item(
                participant=row[0],
                sample=row[1],
                barcode=row[2],
                uuid_aliquot=row[3],
                data_type=row[4],
                platform=row[5],
                data_level=row[6],
                batch=row[7],
                archive_name=row[8],
                url=row[9],
                date_added=row[10],
                annotation_types=row[11],
            )

            file_list.append(new_freeze_item)

        return Filtered_List_Freeze_List(items=file_list, count=query_count)

    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem,
        limit=messages.StringField(2),
        data_level=messages.StringField(3),
        data_type=messages.StringField(4),
        platform=messages.StringField(5),
        archive_name=messages.StringField(6))
    @endpoints.method(GET_RESOURCE, Filtered_List_Freeze_List,
                      path='filtered_list_search_sm', http_method='GET',
                      name='filtered_list.getFilteredListFreezeSm')
    def filtered_list_search_sm(self, request):
        FMItem_query_dict = {}
        FLFreezeItem_query_dict = {}

        # Check for a limit passed in
        limit = None
        if request.__getattribute__('limit') is not None:
            limit = request.__getattribute__('limit')

        # Get the list of valid parameters from request
        for key, value in FMItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    try:
                        FMItem_query_dict[key] = request.__getattribute__(key)

                    except AttributeError:
                        raise endpoints.NotFoundException('Feature Matrix item not found.')

        for key in ['data_level', 'data_type', 'platform', 'archive_name']:
            if request.__getattribute__(key) is not None:
                try:
                    FLFreezeItem_query_dict[key] = request.__getattribute__(key)
                except AttributeError:
                    raise endpoints.NotFoundException('Filtered List Freeze item not found.')

        if len(FMItem_query_dict) == 0 and len(FLFreezeItem_query_dict) == 0:
            return Filtered_List_Freeze_List(items=[], count=['select parameters to filter results'])

        file_query_str = 'select fmdata_filtered_list_freeze.participant, ' \
                    'fmdata_filtered_list_freeze.sample, ' \
                    'fmdata_filtered_list_freeze.barcode, ' \
                    'fmdata_filtered_list_freeze.uuid_aliquot, ' \
                    'fmdata_filtered_list_freeze.data_type, ' \
                    'fmdata_filtered_list_freeze.platform, ' \
                    'fmdata_filtered_list_freeze.data_level, ' \
                    'fmdata_filtered_list_freeze.batch, ' \
                    'fmdata_filtered_list_freeze.archive_name, ' \
                    'fmdata_filtered_list_freeze.url, ' \
                    'fmdata_filtered_list_freeze.date_added, ' \
                    'fmdata_filtered_list_freeze.annotation_types ' \
                    'from fmdata, fmdata_filtered_list_freeze ' \
                    'where fmdata_filtered_list_freeze.sample like concat(fmdata.sample, "%") '

        count_query_str = 'select count(*) ' \
                    'from fmdata, fmdata_filtered_list_freeze ' \
                    'where fmdata_filtered_list_freeze.sample like concat(fmdata.sample, "%") '

        query_str = ''
        # to do: fix query_str to only have %s placeholders
        # and make corresponding query_array to contain the placeholder values

        for key, value in FMItem_query_dict.items():
            query_str += ' and'
            if ',' in value:
                value = value.split(',')
            if key == 'age_at_initial_pathologic_diagnosis':
                    query_str += ' (' + sql_age_by_ranges(value) + ') '
                    query_str.replace('age_at_initial_pathologic_diagnosis', 'fmdata.age_at_initial_pathologic_diagnosis')
            elif not isinstance(value, basestring):
                has_null = False
                if 'None' in value:
                    has_null = True
                    query_str += ' (fmdata.%s is null or' % key
                    value.remove('None')
                query_str += ' fmdata.%s in (' % key
                i = 0
                for val in value:
                    if i == 0:
                        query_str += '"%s"' % val
                        i += 1
                    else:
                        query_str += ',"%s"' % val
                query_str += ')'
                if has_null:
                    query_str += ')'
            elif value == 'None':
                    query_str += ' fmdata.%s is null' % key
            else:
                query_str += ' fmdata.%s="%s"' % (key, value)

        for key, value in FLFreezeItem_query_dict.items():
            query_str += ' and'
            if key == 'archive_name':
                if ',' in value:
                    value = value.split(',')
                    query_str += '('
                    for val in value:
                        if value.index(val):
                            query_str += ' or '
                        query_str += 'archive_name like "%' + val + '%"'
                    query_str += ')'
                else:
                    query_str += ' archive_name like  "%' + value + '%"'
            else:
                if ',' in value:
                    value = value.split(',')
                    for val in value:
                        index = value.index(val)
                        val = value.pop(index)
                        val = '"%s"' % val
                        value.insert(index, val)
                    value = ','.join(value)
                    query_str += ' fmdata_filtered_list_freeze.%s in (%s)' % (key, value)
                else:
                    query_str += ' fmdata_filtered_list_freeze.%s="%s"' % (key, value)


        db = sql_connection()
        cursor = db.cursor()

        cursor.execute(count_query_str + query_str)

        query_count = cursor.fetchone()[0]

        if limit is not None:
            # query_str += ' LIMIT %s' % limit
            pass

        query_str += ';'

        cursor.execute(file_query_str + query_str)

        file_list = []

        for row in cursor.fetchall():
            new_freeze_item = Filtered_List_Freeze_Item(
                participant=row[0],
                sample=row[1],
                barcode=row[2],
                uuid_aliquot=row[3],
                data_type=row[4],
                platform=row[5],
                data_level=row[6],
                batch=row[7],
                archive_name=row[8],
                url=row[9],
                date_added=row[10],
                annotation_types=row[11],
            )

            file_list.append(new_freeze_item)

        return Filtered_List_Freeze_List(items=file_list, count=query_count)

    GET_RESOURCE = endpoints.ResourceContainer(
        FMItem)
    @endpoints.method(GET_RESOURCE, Filtered_List_Freeze_List,
                      path='filtered_list_count', http_method='GET',
                      name='filtered_list.getFilteredListCount')
    def filtered_list_count(self, request):
        FMItem_query_dict = {}

        # Get the list of valid parameters from request
        for key, value in FMItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    try:
                        FMItem_query_dict[key] = request.__getattribute__(key)
                    except AttributeError:
                        raise endpoints.NotFoundException('Feature Matrix item not found.')

        if len(FMItem_query_dict) == 0:
            return Filtered_List_Freeze_List(items=[], count=['select parameters to filter results'])

        count_query_str = 'select count(fmdata_filtered_list_freeze.platform="bio"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type in("Protected Mutations","Somatic Mutations") and  fmdata_filtered_list_freeze.archive_name like "%bcgsc.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Protected Mutations" and  fmdata_filtered_list_freeze.archive_name like "%bcgsc.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Somatic Mutations" and  fmdata_filtered_list_freeze.archive_name like "%bcgsc.%"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type in("Protected Mutations","Somatic Mutations") and  fmdata_filtered_list_freeze.archive_name like "%broad.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Protected Mutations" and  fmdata_filtered_list_freeze.archive_name like "%broad.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Somatic Mutations" and  fmdata_filtered_list_freeze.archive_name like "%broad.%"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type in("Protected Mutations","Somatic Mutations") and  fmdata_filtered_list_freeze.archive_name like "%genome.wustl.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Protected Mutations" and  fmdata_filtered_list_freeze.archive_name like "%genome.wustl.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Somatic Mutations" and  fmdata_filtered_list_freeze.archive_name like "%genome.wustl.%"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type in("Protected Mutations","Somatic Mutations") and  fmdata_filtered_list_freeze.archive_name like "%hgsc.bcm.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Protected Mutations" and  fmdata_filtered_list_freeze.archive_name like "%hgsc.bcm.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Somatic Mutations" and  fmdata_filtered_list_freeze.archive_name like "%hgsc.bcm.%"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type in("Protected Mutations","Somatic Mutations") and  fmdata_filtered_list_freeze.archive_name like "%ucsc.edu.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Protected Mutations" and  fmdata_filtered_list_freeze.archive_name like "%ucsc.edu.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Somatic Mutations" and  fmdata_filtered_list_freeze.archive_name like "%ucsc.edu.%"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type in("Protected Mutations","Somatic Mutations") and  fmdata_filtered_list_freeze.archive_name like "%unc.edu.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Protected Mutations" and  fmdata_filtered_list_freeze.archive_name like "%unc.edu.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type="Somatic Mutations" and  fmdata_filtered_list_freeze.archive_name like "%unc.edu.%"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type="CNV (SNP Array)" ), ' \
                           'count(fmdata_filtered_list_freeze.platform="Genome_Wide_SNP_6" ), ' \
                           'count(fmdata_filtered_list_freeze.platform="Genome_Wide_SNP_6" and fmdata_filtered_list_freeze.data_leve="1"), ' \
                           'count(fmdata_filtered_list_freeze.platform="Genome_Wide_SNP_6" and fmdata_filtered_list_freeze.data_leve="3"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type="DNA Methylation" ), ' \
                           'count(fmdata_filtered_list_freeze.platform="HumanMethylation450" ), ' \
                           'count(fmdata_filtered_list_freeze.platform="HumanMethylation27" ), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type in ("RNASeq","TotalRNASeqV2") ), ' \
                           'count(fmdata_filtered_list_freeze.data_type in ("RNASeq","TotalRNASeqV2") fmdata_filtered_list_freeze.archive_name like "%bcgsc.%"), ' \
                           'count(fmdata_filtered_list_freeze.data_type in ("RNASeq","TotalRNASeqV2") fmdata_filtered_list_freeze.archive_name like "%unc.edu.%"), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type="miRNASeq"), ' \
                           'count(fmdata_filtered_list_freeze.platform="IlluminaGA_miRNASeq"), ' \
                           'count(fmdata_filtered_list_freeze.platform="IlluminaHiSeq_miRNASeq" ), '

        count_query_str += 'count(fmdata_filtered_list_freeze.data_type="Expression-Protein"), ' \
                           'count(fmdata_filtered_list_freeze.platform="MDA_RPPA_Core") ' \
                           'from fmdata, fmdata_filtered_list_freeze ' \
                           'where fmdata_filtered_list_freeze.sample like concat(fmdata.sample, "%") '


        # to do: fix query_str to only have %s placeholders
        # and make corresponding query_array to contain the placeholder values

        for key, value in FMItem_query_dict.items():
            count_query_str += ' and'
            if ',' in value:
                value = value.split(',')
            if key == 'age_at_initial_pathologic_diagnosis':
                count_query_str += ' (' + sql_age_by_ranges(value) + ') '
                count_query_str.replace('age_at_initial_pathologic_diagnosis', 'fmdata.age_at_initial_pathologic_diagnosis')
            elif not isinstance(value, basestring):
                has_null = False
                if 'None' in value:
                    has_null = True
                    count_query_str += ' (fmdata.%s is null or' % key
                    value.remove('None')
                count_query_str += ' fmdata.%s in (' % key
                i = 0
                for val in value:
                    if i == 0:
                        count_query_str += '"%s"' % val
                        i += 1
                    else:
                        count_query_str += ',"%s"' % val
                count_query_str += ')'
                if has_null:
                    count_query_str += ')'
            elif value == 'None':
                count_query_str += ' fmdata.%s is null' % key
            else:
                count_query_str += ' fmdata.%s="%s"' % (key, value)


        db = sql_connection()
        cursor = db.cursor(MySQLdb.cursors.DictCursor)
        cursor.execute(count_query_str)


        return Filtered_List_Freeze_List(items=[], count=[])
