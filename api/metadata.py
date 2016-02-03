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

import endpoints
from protorpc import messages
from protorpc import message_types
from protorpc import remote
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.contrib.auth.models import User as Django_User
from accounts.models import NIH_User
from cohorts.models import Cohort_Perms,  Cohort as Django_Cohort,Patients, Samples, Filters
from projects.models import Study, User_Feature_Definitions, User_Feature_Counts, User_Data_Tables
import django
import logging
import re
import json
import traceback

from api_helpers import *

logger = logging.getLogger(__name__)

debug = settings.DEBUG

INSTALLED_APP_CLIENT_ID = settings.INSTALLED_APP_CLIENT_ID
OPEN_DATA_BUCKET = settings.OPEN_DATA_BUCKET
#CONTROLLED_DATA_BUCKET = settings.CONTROLLED_DATA_BUCKET

METADATA_SHORTLIST = [
    # 'adenocarcinoma_invasion',
    'age_at_initial_pathologic_diagnosis',
    # 'anatomic_neoplasm_subdivision',
    # 'avg_percent_lymphocyte_infiltration',
    # 'avg_percent_monocyte_infiltration',
    # 'avg_percent_necrosis',
    # 'avg_percent_neutrophil_infiltration',
    # 'avg_percent_normal_cells',
    # 'avg_percent_stromal_cells',
    # 'avg_percent_tumor_cells',
    # 'avg_percent_tumor_nuclei',
    # 'batch_number',
    # 'bcr',
    # 'clinical_M',
    # 'clinical_N',
    # 'clinical_stage',
    # 'clinical_T',
    # 'colorectal_cancer',
    'country',
    # 'country_of_procurement',
    # 'days_to_birth',
    # 'days_to_collection',
    # 'days_to_death',
    # 'days_to_initial_pathologic_diagnosis',
    # 'days_to_last_followup',
    # 'days_to_submitted_specimen_dx',
    'Study',
    'ethnicity',
    # 'frozen_specimen_anatomic_site',
    'gender',
    # 'gleason_score_combined',
    'has_27k',
    'has_450k',
    'has_BCGSC_GA_RNASeq',
    'has_BCGSC_HiSeq_RNASeq',
    'has_GA_miRNASeq',
    'has_HiSeq_miRnaSeq',
    'has_Illumina_DNASeq',
    'has_RPPA',
    'has_SNP6',
    'has_UNC_GA_RNASeq',
    'has_UNC_HiSeq_RNASeq',
    # 'height',
    'histological_type',
    # 'history_of_colon_polyps',
    # 'history_of_neoadjuvant_treatment',
    # 'history_of_prior_malignancy',
    # 'hpv_calls',
    # 'hpv_status',
    'icd_10',
    'icd_o_3_histology',
    'icd_o_3_site',
    # 'lymph_node_examined_count',
    # 'lymphatic_invasion',
    # 'lymphnodes_examined',
    # 'lymphovascular_invasion_present',
    # 'max_percent_lymphocyte_infiltration',
    # 'max_percent_monocyte_infiltration',
    # 'max_percent_necrosis',
    # 'max_percent_neutrophil_infiltration',
    # 'max_percent_normal_cells',
    # 'max_percent_stromal_cells',
    # 'max_percent_tumor_cells',
    # 'max_percent_tumor_nuclei',
    # 'menopause_status',
    # 'min_percent_lymphocyte_infiltration',
    # 'min_percent_monocyte_infiltration',
    # 'min_percent_necrosis',
    # 'min_percent_neutrophil_infiltration',
    # 'min_percent_normal_cells',
    # 'min_percent_stromal_cells',
    # 'min_percent_tumor_cells',
    # 'min_percent_tumor_nuclei',
    # 'mononucleotide_and_dinucleotide_marker_panel_analysis_status',
    # 'mononucleotide_marker_panel_analysis_status',
    'neoplasm_histologic_grade',
    'new_tumor_event_after_initial_treatment',
    # 'number_of_lymphnodes_examined',
    # 'number_of_lymphnodes_positive_by_he',
    # 'number_pack_years_smoked',
    # 'ParticipantBarcode',
    # 'pathologic_M',
    # 'pathologic_N',
    'pathologic_stage',
    # 'pathologic_T',
    'person_neoplasm_cancer_status',
    # 'pregnancies',
    # 'preservation_method',
    # 'primary_neoplasm_melanoma_dx',
    # 'primary_therapy_outcome_success',
    'prior_dx',
    'Project',
    # 'psa_value',
    'race',
    'residual_tumor',
    # 'SampleBarcode',
    'SampleTypeCode',
    # 'Study',
    'tobacco_smoking_history',
    # 'total_number_of_pregnancies',
    # 'tumor_pathology',
    'tumor_tissue_site',
    'tumor_type',
    # 'weiss_venous_invasion',
    'vital_status'
    # 'weight',
    # 'year_of_initial_pathologic_diagnosis',
]

metadata_dict = {
    'age_at_initial_pathologic_diagnosis': 'INTEGER',
    'anatomic_neoplasm_subdivision': 'VARCHAR(63)',
    'avg_percent_lymphocyte_infiltration': 'FLOAT',
    'avg_percent_monocyte_infiltration': 'FLOAT',
    'avg_percent_necrosis': 'FLOAT',
    'avg_percent_neutrophil_infiltration': 'FLOAT',
    'avg_percent_normal_cells': 'FLOAT',
    'avg_percent_stromal_cells': 'FLOAT',
    'avg_percent_tumor_cells': 'FLOAT',
    'avg_percent_tumor_nuclei': 'FLOAT',
    'batch_number': 'INTEGER',
    'bcr': 'VARCHAR(63)',
    'clinical_M': 'VARCHAR(12)',
    'clinical_N': 'VARCHAR(12)',
    'clinical_T': 'VARCHAR(12)',
    'clinical_stage': 'VARCHAR(12)',
    'colorectal_cancer': 'VARCHAR(10)',
    'country': 'VARCHAR(63)',
    'days_to_birth': 'INTEGER',
    'days_to_collection': 'INTEGER',
    'days_to_death': 'INTEGER',
    'days_to_initial_pathologic_diagnosis': 'INTEGER',
    'days_to_last_followup': 'INTEGER',
    'days_to_submitted_specimen_dx': 'INTEGER',
    'Study': 'VARCHAR(4)',
    'ethnicity': 'VARCHAR(20)',
    'frozen_specimen_anatomic_site': 'VARCHAR(63)',
    'gender': 'VARCHAR(15)',
    'gleason_score_combined': 'INTEGER',
    'height': 'INTEGER',
    'histological_type': 'VARCHAR(63)',
    'history_of_colon_polyps': 'VARCHAR(8)',
    'history_of_neoadjuvant_treatment': 'VARCHAR(63)',
    'history_of_prior_malignancy': 'VARCHAR(25)',
    'hpv_calls': 'VARCHAR(20)',
    'hpv_status': 'VARCHAR(20)',
    'icd_10': 'VARCHAR(8)',
    'icd_o_3_histology': 'VARCHAR(10)',
    'icd_o_3_site': 'VARCHAR(8)',
    'lymphatic_invasion': 'VARCHAR(8)',
    'lymphnodes_examined': 'VARCHAR(8)',
    'lymphovascular_invasion_present': 'VARCHAR(63)',
    'max_percent_lymphocyte_infiltration': 'INTEGER',
    'max_percent_monocyte_infiltration': 'INTEGER',
    'max_percent_necrosis': 'INTEGER',
    'max_percent_neutrophil_infiltration': 'INTEGER',
    'max_percent_normal_cells': 'INTEGER',
    'max_percent_stromal_cells': 'INTEGER',
    'max_percent_tumor_cells': 'INTEGER',
    'max_percent_tumor_nuclei': 'INTEGER',
    'menopause_status': 'VARCHAR(30)',
    'min_percent_lymphocyte_infiltration': 'INTEGER',
    'min_percent_monocyte_infiltration': 'INTEGER',
    'min_percent_necrosis': 'INTEGER',
    'min_percent_neutrophil_infiltration': 'INTEGER',
    'min_percent_normal_cells': 'INTEGER',
    'min_percent_stromal_cells': 'INTEGER',
    'min_percent_tumor_cells': 'INTEGER',
    'min_percent_tumor_nuclei': 'INTEGER',
    'mononucleotide_and_dinucleotide_marker_panel_analysis_status': 'VARCHAR(20)',
    'mononucleotide_marker_panel_analysis_status': 'VARCHAR(20)',
    'neoplasm_histologic_grade': 'VARCHAR(15)',
    'new_tumor_event_after_initial_treatment': 'VARCHAR(8)',
    'number_of_lymphnodes_examined': 'INTEGER',
    'number_of_lymphnodes_positive_by_he': 'INTEGER',
    'number_pack_years_smoked': 'INTEGER',
    'ParticipantBarcode': 'VARCHAR(12)',
    'pathologic_M': 'VARCHAR(5)',
    'pathologic_N': 'VARCHAR(5)',
    'pathologic_T': 'VARCHAR(5)',
    'pathologic_stage': 'VARCHAR(10)',
    'person_neoplasm_cancer_status': 'VARCHAR(15)',
    'pregnancies': 'VARCHAR(35)',
    'primary_neoplasm_melanoma_dx': 'VARCHAR(10)',
    'primary_therapy_outcome_success': 'VARCHAR(35)',
    'prior_dx': 'VARCHAR(50)',
    'Project': 'VARCHAR(4)',
    'psa_value': 'FLOAT',
    'race': 'VARCHAR(30)',
    'residual_tumor': 'VARCHAR(5)',
    'SampleBarcode': 'VARCHAR(16)',
    'Study': 'VARCHAR(4)',
    'tobacco_smoking_history': 'VARCHAR(30)',
    'tumor_tissue_site': 'VARCHAR(20)',
    'tumor_type': 'VARCHAR(4)',
    'weiss_venous_invasion': 'VARCHAR(63)',
    'vital_status': 'VARCHAR(63)',
    'weight': 'VARCHAR(63)',
    'year_of_initialPY_pathologic_diagnosis': 'VARCHAR(63)',
    'SampleTypeCode': 'VARCHAR(3)',
    'has_Illumina_DNASeq': 'TINYINT',
    'has_BCGSC_HiSeq_RNASeq': 'TINYINT',
    'has_UNC_HiSeq_RNASeq': 'TINYINT',
    'has_BCGSC_GA_RNASeq': 'TINYINT',
    'has_UNC_GA_RNASeq': 'TINYINT',
    'has_HiSeq_miRnaSeq': 'TINYINT',
    'has_GA_miRNASeq': 'TINYINT',
    'has_RPPA': 'TINYINT',
    'has_SNP6': 'TINYINT',
    'has_27k': 'TINYINT',
    'has_450k': 'TINYINT'

}


class MetaValueListCount(messages.Message):
    value = messages.StringField(1)  # note: this means converting booleans to strings
    count = messages.IntegerField(2)


class MetaAttrValuesList(messages.Message):
    adenocarcinoma_invasion                             = messages.MessageField(MetaValueListCount, 1, repeated=True)
    age_at_initial_pathologic_diagnosis                 = messages.MessageField(MetaValueListCount, 2, repeated=True)
    anatomic_neoplasm_subdivision                       = messages.MessageField(MetaValueListCount, 3, repeated=True)
    avg_percent_lymphocyte_infiltration                 = messages.FloatField(4, repeated=True)
    avg_percent_monocyte_infiltration                   = messages.FloatField(5, repeated=True)
    avg_percent_necrosis                                = messages.FloatField(6, repeated=True)
    avg_percent_neutrophil_infiltration                 = messages.FloatField(7, repeated=True)
    avg_percent_normal_cells                            = messages.FloatField(8, repeated=True)
    avg_percent_stromal_cells                           = messages.FloatField(9, repeated=True)
    avg_percent_tumor_cells                             = messages.FloatField(10, repeated=True)
    avg_percent_tumor_nuclei                            = messages.FloatField(11, repeated=True)
    batch_number                                        = messages.MessageField(MetaValueListCount, 12, repeated=True)
    bcr                                                 = messages.MessageField(MetaValueListCount, 13, repeated=True)
    clinical_M                                          = messages.MessageField(MetaValueListCount, 14, repeated=True)
    clinical_N                                          = messages.MessageField(MetaValueListCount, 15, repeated=True)
    clinical_stage                                      = messages.MessageField(MetaValueListCount, 16, repeated=True)
    clinical_T                                          = messages.MessageField(MetaValueListCount, 17, repeated=True)
    colorectal_cancer                                   = messages.MessageField(MetaValueListCount, 18, repeated=True)
    country                                             = messages.MessageField(MetaValueListCount, 19, repeated=True)
    country_of_procurement                              = messages.MessageField(MetaValueListCount, 20, repeated=True)
    days_to_birth                                       = messages.MessageField(MetaValueListCount, 21, repeated=True)
    days_to_collection                                  = messages.MessageField(MetaValueListCount, 22, repeated=True)
    days_to_death                                       = messages.MessageField(MetaValueListCount, 23, repeated=True)
    days_to_initial_pathologic_diagnosis                = messages.MessageField(MetaValueListCount, 24, repeated=True)
    days_to_last_followup                               = messages.MessageField(MetaValueListCount, 25, repeated=True)
    days_to_submitted_specimen_dx                       = messages.MessageField(MetaValueListCount, 26, repeated=True)
    Study                                               = messages.MessageField(MetaValueListCount, 27, repeated=True)
    ethnicity                                           = messages.MessageField(MetaValueListCount, 28, repeated=True)
    frozen_specimen_anatomic_site                       = messages.MessageField(MetaValueListCount, 29, repeated=True)
    gender                                              = messages.MessageField(MetaValueListCount, 30, repeated=True)
    height                                              = messages.MessageField(MetaValueListCount, 31, repeated=True)
    histological_type                                   = messages.MessageField(MetaValueListCount, 32, repeated=True)
    history_of_colon_polyps                             = messages.MessageField(MetaValueListCount, 33, repeated=True)
    history_of_neoadjuvant_treatment                    = messages.MessageField(MetaValueListCount, 34, repeated=True)
    history_of_prior_malignancy                         = messages.MessageField(MetaValueListCount, 35, repeated=True)
    hpv_calls                                           = messages.MessageField(MetaValueListCount, 36, repeated=True)
    hpv_status                                          = messages.MessageField(MetaValueListCount, 37, repeated=True)
    icd_10                                              = messages.MessageField(MetaValueListCount, 38, repeated=True)
    icd_o_3_histology                                   = messages.MessageField(MetaValueListCount, 39, repeated=True)
    icd_o_3_site                                        = messages.MessageField(MetaValueListCount, 40, repeated=True)
    lymph_node_examined_count                           = messages.MessageField(MetaValueListCount, 41, repeated=True)
    lymphatic_invasion                                  = messages.MessageField(MetaValueListCount, 42, repeated=True)
    lymphnodes_examined                                 = messages.MessageField(MetaValueListCount, 43, repeated=True)
    lymphovascular_invasion_present                     = messages.MessageField(MetaValueListCount, 44, repeated=True)
    max_percent_lymphocyte_infiltration                 = messages.MessageField(MetaValueListCount, 45, repeated=True)
    max_percent_monocyte_infiltration                   = messages.MessageField(MetaValueListCount, 46, repeated=True)
    max_percent_necrosis                                = messages.MessageField(MetaValueListCount, 47, repeated=True)
    max_percent_neutrophil_infiltration                 = messages.MessageField(MetaValueListCount, 48, repeated=True)
    max_percent_normal_cells                            = messages.MessageField(MetaValueListCount, 49, repeated=True)
    max_percent_stromal_cells                           = messages.MessageField(MetaValueListCount, 50, repeated=True)
    max_percent_tumor_cells                             = messages.MessageField(MetaValueListCount, 51, repeated=True)
    max_percent_tumor_nuclei                            = messages.MessageField(MetaValueListCount, 52, repeated=True)
    menopause_status                                    = messages.MessageField(MetaValueListCount, 53, repeated=True)
    min_percent_lymphocyte_infiltration                 = messages.MessageField(MetaValueListCount, 54, repeated=True)
    min_percent_monocyte_infiltration                   = messages.MessageField(MetaValueListCount, 55, repeated=True)
    min_percent_necrosis                                = messages.MessageField(MetaValueListCount, 56, repeated=True)
    min_percent_neutrophil_infiltration                 = messages.MessageField(MetaValueListCount, 57, repeated=True)
    min_percent_normal_cells                            = messages.MessageField(MetaValueListCount, 58, repeated=True)
    min_percent_stromal_cells                           = messages.MessageField(MetaValueListCount, 59, repeated=True)
    min_percent_tumor_cells                             = messages.MessageField(MetaValueListCount, 60, repeated=True)
    min_percent_tumor_nuclei                            = messages.MessageField(MetaValueListCount, 61, repeated=True)
    mononucleotide_and_dinucleotide_marker_panel_analysis_status = messages.MessageField(MetaValueListCount, 62, repeated=True)
    mononucleotide_marker_panel_analysis_status         = messages.MessageField(MetaValueListCount, 63, repeated=True)
    neoplasm_histologic_grade                           = messages.MessageField(MetaValueListCount, 64, repeated=True)
    new_tumor_event_after_initial_treatment             = messages.MessageField(MetaValueListCount, 65, repeated=True)
    number_of_lymphnodes_examined                       = messages.MessageField(MetaValueListCount, 66, repeated=True)
    number_of_lymphnodes_positive_by_he                 = messages.MessageField(MetaValueListCount, 67, repeated=True)
    ParticipantBarcode                                  = messages.MessageField(MetaValueListCount, 68, repeated=True)
    pathologic_M                                        = messages.MessageField(MetaValueListCount, 69, repeated=True)
    pathologic_N                                        = messages.MessageField(MetaValueListCount, 70, repeated=True)
    pathologic_stage                                    = messages.MessageField(MetaValueListCount, 71, repeated=True)
    pathologic_T                                        = messages.MessageField(MetaValueListCount, 72, repeated=True)
    person_neoplasm_cancer_status                       = messages.MessageField(MetaValueListCount, 73, repeated=True)
    pregnancies                                         = messages.MessageField(MetaValueListCount, 74, repeated=True)
    preservation_method                                 = messages.MessageField(MetaValueListCount, 75, repeated=True)
    primary_neoplasm_melanoma_dx                        = messages.MessageField(MetaValueListCount, 76, repeated=True)
    primary_therapy_outcome_success                     = messages.MessageField(MetaValueListCount, 77, repeated=True)
    prior_dx                                            = messages.MessageField(MetaValueListCount, 78, repeated=True)
    Project                                             = messages.MessageField(MetaValueListCount, 79, repeated=True)
    psa_value                                           = messages.FloatField(80, repeated=True)
    race                                                = messages.MessageField(MetaValueListCount, 81, repeated=True)
    residual_tumor                                      = messages.MessageField(MetaValueListCount, 82, repeated=True)
    SampleBarcode                                       = messages.MessageField(MetaValueListCount, 83, repeated=True)
    tobacco_smoking_history                             = messages.MessageField(MetaValueListCount, 86, repeated=True)
    total_number_of_pregnancies                         = messages.MessageField(MetaValueListCount, 87, repeated=True)
    tumor_tissue_site                                   = messages.MessageField(MetaValueListCount, 88, repeated=True)
    tumor_pathology                                     = messages.MessageField(MetaValueListCount, 89, repeated=True)
    tumor_type                                          = messages.MessageField(MetaValueListCount, 90, repeated=True)
    weiss_venous_invasion                                     = messages.MessageField(MetaValueListCount, 91, repeated=True)
    vital_status                                        = messages.MessageField(MetaValueListCount, 92, repeated=True)
    weight                                              = messages.MessageField(MetaValueListCount, 93, repeated=True)
    year_of_initial_pathologic_diagnosis                = messages.MessageField(MetaValueListCount, 94, repeated=True)
    SampleTypeCode                                      = messages.MessageField(MetaValueListCount, 95, repeated=True)
    has_Illumina_DNASeq                                 = messages.MessageField(MetaValueListCount, 96, repeated=True)
    has_BCGSC_HiSeq_RNASeq                              = messages.MessageField(MetaValueListCount, 97, repeated=True)
    has_UNC_HiSeq_RNASeq                                = messages.MessageField(MetaValueListCount, 98, repeated=True)
    has_BCGSC_GA_RNASeq                                 = messages.MessageField(MetaValueListCount, 99, repeated=True)
    has_UNC_GA_RNASeq                                   = messages.MessageField(MetaValueListCount, 100, repeated=True)
    has_HiSeq_miRnaSeq                                  = messages.MessageField(MetaValueListCount, 101, repeated=True)
    has_GA_miRNASeq                                     = messages.MessageField(MetaValueListCount, 102, repeated=True)
    has_RPPA                                            = messages.MessageField(MetaValueListCount, 103, repeated=True)
    has_SNP6                                            = messages.MessageField(MetaValueListCount, 104, repeated=True)
    has_27k                                             = messages.MessageField(MetaValueListCount, 105, repeated=True)
    has_450k                                            = messages.MessageField(MetaValueListCount, 106, repeated=True)


class MetadataItem(messages.Message):
    adenocarcinoma_invasion                                         = messages.StringField(1)
    age_at_initial_pathologic_diagnosis                             = messages.IntegerField(2)
    anatomic_neoplasm_subdivision                                   = messages.StringField(3)
    avg_percent_lymphocyte_infiltration                             = messages.FloatField(4)
    avg_percent_monocyte_infiltration                               = messages.FloatField(5)
    avg_percent_necrosis                                            = messages.FloatField(6)
    avg_percent_neutrophil_infiltration                             = messages.FloatField(7)
    avg_percent_normal_cells                                        = messages.FloatField(8)
    avg_percent_stromal_cells                                       = messages.FloatField(9)
    avg_percent_tumor_cells                                         = messages.FloatField(10)
    avg_percent_tumor_nuclei                                        = messages.FloatField(11)
    batch_number                                                    = messages.IntegerField(12)
    bcr                                                             = messages.StringField(13)
    clinical_M                                                      = messages.StringField(14)
    clinical_N                                                      = messages.StringField(15)
    clinical_stage                                                  = messages.StringField(16)
    clinical_T                                                      = messages.StringField(17)
    colorectal_cancer                                               = messages.StringField(18)
    country                                                         = messages.StringField(19)
    country_of_procurement                                          = messages.StringField(20)
    days_to_birth                                                   = messages.IntegerField(21)
    days_to_collection                                              = messages.IntegerField(22)
    days_to_death                                                   = messages.IntegerField(23)
    days_to_initial_pathologic_diagnosis                            = messages.IntegerField(24)
    days_to_last_followup                                           = messages.IntegerField(25)
    days_to_submitted_specimen_dx                                   = messages.IntegerField(26)
    Study                                                           = messages.StringField(27)
    ethnicity                                                       = messages.StringField(28)
    frozen_specimen_anatomic_site                                   = messages.StringField(29)
    gender                                                          = messages.StringField(30)
    height                                                          = messages.IntegerField(31)
    histological_type                                               = messages.StringField(32)
    history_of_colon_polyps                                         = messages.StringField(33)
    history_of_neoadjuvant_treatment                                = messages.StringField(34)
    history_of_prior_malignancy                                     = messages.StringField(35)
    hpv_calls                                                       = messages.StringField(36)
    hpv_status                                                      = messages.StringField(37)
    icd_10                                                          = messages.StringField(38)
    icd_o_3_histology                                               = messages.StringField(39)
    icd_o_3_site                                                    = messages.StringField(40)
    lymph_node_examined_count                                       = messages.IntegerField(41)
    lymphatic_invasion                                              = messages.StringField(42)
    lymphnodes_examined                                             = messages.StringField(43)
    lymphovascular_invasion_present                                 = messages.StringField(44)
    max_percent_lymphocyte_infiltration                             = messages.IntegerField(45)
    max_percent_monocyte_infiltration                               = messages.IntegerField(46)
    max_percent_necrosis                                            = messages.IntegerField(47)
    max_percent_neutrophil_infiltration                             = messages.IntegerField(48)
    max_percent_normal_cells                                        = messages.IntegerField(49)
    max_percent_stromal_cells                                       = messages.IntegerField(50)
    max_percent_tumor_cells                                         = messages.IntegerField(51)
    max_percent_tumor_nuclei                                        = messages.IntegerField(52)
    menopause_status                                                = messages.StringField(53)
    min_percent_lymphocyte_infiltration                             = messages.IntegerField(54)
    min_percent_monocyte_infiltration                               = messages.IntegerField(55)
    min_percent_necrosis                                            = messages.IntegerField(56)
    min_percent_neutrophil_infiltration                             = messages.IntegerField(57)
    min_percent_normal_cells                                        = messages.IntegerField(58)
    min_percent_stromal_cells                                       = messages.IntegerField(59)
    min_percent_tumor_cells                                         = messages.IntegerField(60)
    min_percent_tumor_nuclei                                        = messages.IntegerField(61)
    mononucleotide_and_dinucleotide_marker_panel_analysis_status    = messages.StringField(62)
    mononucleotide_marker_panel_analysis_status                     = messages.StringField(63)
    neoplasm_histologic_grade                                       = messages.StringField(64)
    new_tumor_event_after_initial_treatment                         = messages.StringField(65)
    number_of_lymphnodes_examined                                   = messages.IntegerField(66)
    number_of_lymphnodes_positive_by_he                             = messages.IntegerField(67)
    ParticipantBarcode                                              = messages.StringField(68)
    pathologic_M                                                    = messages.StringField(69)
    pathologic_N                                                    = messages.StringField(70)
    pathologic_stage                                                = messages.StringField(71)
    pathologic_T                                                    = messages.StringField(72)
    person_neoplasm_cancer_status                                   = messages.StringField(73)
    pregnancies                                                     = messages.StringField(74)
    preservation_method                                             = messages.StringField(75)
    primary_neoplasm_melanoma_dx                                    = messages.StringField(76)
    primary_therapy_outcome_success                                 = messages.StringField(77)
    prior_dx                                                        = messages.StringField(78)
    Project                                                         = messages.StringField(79)
    psa_value                                                       = messages.FloatField(80)
    race                                                            = messages.StringField(81)
    residual_tumor                                                  = messages.StringField(82)
    SampleBarcode                                                   = messages.StringField(83)
    tobacco_smoking_history                                         = messages.StringField(86)
    total_number_of_pregnancies                                     = messages.IntegerField(87)
    tumor_tissue_site                                               = messages.StringField(88)
    tumor_pathology                                                 = messages.StringField(89)
    tumor_type                                                      = messages.StringField(90)
    weiss_venous_invasion                                           = messages.StringField(91)
    vital_status                                                    = messages.StringField(92)
    weight                                                          = messages.IntegerField(93)
    year_of_initial_pathologic_diagnosis                            = messages.StringField(94)
    SampleTypeCode                                                  = messages.StringField(95)
    has_Illumina_DNASeq                                             = messages.StringField(96)
    has_BCGSC_HiSeq_RNASeq                                          = messages.StringField(97)
    has_UNC_HiSeq_RNASeq                                            = messages.StringField(98)
    has_BCGSC_GA_RNASeq                                             = messages.StringField(99)
    has_UNC_GA_RNASeq                                               = messages.StringField(100)
    has_HiSeq_miRnaSeq                                              = messages.StringField(101)
    has_GA_miRNASeq                                                 = messages.StringField(102)
    has_RPPA                                                        = messages.StringField(103)
    has_SNP6                                                        = messages.StringField(104)
    has_27k                                                         = messages.StringField(105)
    has_450k                                                        = messages.StringField(106)

'''
Incoming object needs to use age that's a string (eg. 10_to_39)
'''
class IncomingMetadataItem(messages.Message):
    adenocarcinoma_invasion                                         = messages.StringField(1)
    age_at_initial_pathologic_diagnosis                             = messages.StringField(2)
    anatomic_neoplasm_subdivision                                   = messages.StringField(3)
    avg_percent_lymphocyte_infiltration                             = messages.FloatField(4)
    avg_percent_monocyte_infiltration                               = messages.FloatField(5)
    avg_percent_necrosis                                            = messages.FloatField(6)
    avg_percent_neutrophil_infiltration                             = messages.FloatField(7)
    avg_percent_normal_cells                                        = messages.FloatField(8)
    avg_percent_stromal_cells                                       = messages.FloatField(9)
    avg_percent_tumor_cells                                         = messages.FloatField(10)
    avg_percent_tumor_nuclei                                        = messages.FloatField(11)
    batch_number                                                    = messages.IntegerField(12)
    bcr                                                             = messages.StringField(13)
    clinical_M                                                      = messages.StringField(14)
    clinical_N                                                      = messages.StringField(15)
    clinical_stage                                                  = messages.StringField(16)
    clinical_T                                                      = messages.StringField(17)
    colorectal_cancer                                               = messages.StringField(18)
    country                                                         = messages.StringField(19)
    country_of_procurement                                          = messages.StringField(20)
    days_to_birth                                                   = messages.IntegerField(21)
    days_to_collection                                              = messages.IntegerField(22)
    # days_to_sample_procurement                                    = messages.IntegerField(23)
    days_to_death                                                   = messages.IntegerField(23)
    days_to_initial_pathologic_diagnosis                            = messages.IntegerField(24)
    days_to_last_followup                                           = messages.IntegerField(25)
    days_to_submitted_specimen_dx                                   = messages.IntegerField(26)
    Study                                                           = messages.StringField(27)
    ethnicity                                                       = messages.StringField(28)
    frozen_specimen_anatomic_site                                   = messages.StringField(29)
    gender                                                          = messages.StringField(30)
    height                                                          = messages.IntegerField(31)
    histological_type                                               = messages.StringField(32)
    history_of_colon_polyps                                         = messages.StringField(33)
    history_of_neoadjuvant_treatment                                = messages.StringField(34)
    history_of_prior_malignancy                                     = messages.StringField(35)
    hpv_calls                                                       = messages.StringField(36)
    hpv_status                                                      = messages.StringField(37)
    icd_10                                                          = messages.StringField(38)
    icd_o_3_histology                                               = messages.StringField(39)
    icd_o_3_site                                                    = messages.StringField(40)
    lymph_node_examined_count                                       = messages.IntegerField(41)
    lymphatic_invasion                                              = messages.StringField(42)
    lymphnodes_examined                                             = messages.StringField(43)
    lymphovascular_invasion_present                                 = messages.StringField(44)
    max_percent_lymphocyte_infiltration                             = messages.IntegerField(45)
    max_percent_monocyte_infiltration                               = messages.IntegerField(46)
    max_percent_necrosis                                            = messages.IntegerField(47)
    max_percent_neutrophil_infiltration                             = messages.IntegerField(48)
    max_percent_normal_cells                                        = messages.IntegerField(49)
    max_percent_stromal_cells                                       = messages.IntegerField(50)
    max_percent_tumor_cells                                         = messages.IntegerField(51)
    max_percent_tumor_nuclei                                        = messages.IntegerField(52)
    menopause_status                                                = messages.StringField(53)
    min_percent_lymphocyte_infiltration                             = messages.IntegerField(54)
    min_percent_monocyte_infiltration                               = messages.IntegerField(55)
    min_percent_necrosis                                            = messages.IntegerField(56)
    min_percent_neutrophil_infiltration                             = messages.IntegerField(57)
    min_percent_normal_cells                                        = messages.IntegerField(58)
    min_percent_stromal_cells                                       = messages.IntegerField(59)
    min_percent_tumor_cells                                         = messages.IntegerField(60)
    min_percent_tumor_nuclei                                        = messages.IntegerField(61)
    mononucleotide_and_dinucleotide_marker_panel_analysis_status    = messages.StringField(62)
    mononucleotide_marker_panel_analysis_status                     = messages.StringField(63)
    neoplasm_histologic_grade                                       = messages.StringField(64)
    new_tumor_event_after_initial_treatment                         = messages.StringField(65)
    number_of_lymphnodes_examined                                   = messages.IntegerField(66)
    number_of_lymphnodes_positive_by_he                             = messages.IntegerField(67)
    ParticipantBarcode                                              = messages.StringField(68)
    pathologic_M                                                    = messages.StringField(69)
    pathologic_N                                                    = messages.StringField(70)
    pathologic_stage                                                = messages.StringField(71)
    pathologic_T                                                    = messages.StringField(72)
    person_neoplasm_cancer_status                                   = messages.StringField(73)
    pregnancies                                                     = messages.StringField(74)
    preservation_method                                             = messages.StringField(75)
    primary_neoplasm_melanoma_dx                                    = messages.StringField(76)
    primary_therapy_outcome_success                                 = messages.StringField(77)
    prior_dx                                                        = messages.StringField(78)
    Project                                                         = messages.StringField(79)
    psa_value                                                       = messages.FloatField(80)
    race                                                            = messages.StringField(81)
    residual_tumor                                                  = messages.StringField(82)
    SampleBarcode                                                   = messages.StringField(83)
    tobacco_smoking_history                                         = messages.StringField(86)
    total_number_of_pregnancies                                     = messages.IntegerField(87)
    tumor_tissue_site                                               = messages.StringField(88)
    tumor_pathology                                                 = messages.StringField(89)
    tumor_type                                                      = messages.StringField(90)
    weiss_venous_invasion                                                 = messages.StringField(91)
    vital_status                                                    = messages.StringField(92)
    weight                                                          = messages.IntegerField(93)
    year_of_initial_pathologic_diagnosis                            = messages.StringField(94)
    SampleTypeCode                                                  = messages.StringField(95)
    has_Illumina_DNASeq                                             = messages.StringField(96)
    has_BCGSC_HiSeq_RNASeq                                          = messages.StringField(97)
    has_UNC_HiSeq_RNASeq                                            = messages.StringField(98)
    has_BCGSC_GA_RNASeq                                             = messages.StringField(99)
    has_UNC_GA_RNASeq                                               = messages.StringField(100)
    has_HiSeq_miRnaSeq                                              = messages.StringField(101)
    has_GA_miRNASeq                                                 = messages.StringField(102)
    has_RPPA                                                        = messages.StringField(103)
    has_SNP6                                                        = messages.StringField(104)
    has_27k                                                         = messages.StringField(105)
    has_450k                                                        = messages.StringField(106)

class MetadataAttributeValues(messages.Message):
    name = messages.StringField(1)
    id = messages.StringField(2)
    values = messages.MessageField(MetaValueListCount, 3, repeated=True)
    total = messages.IntegerField(4)

class MetadataItemList(messages.Message):
    items = messages.MessageField(MetadataItem, 1, repeated=True)
    count = messages.MessageField(MetaAttrValuesList, 2)
    total = messages.IntegerField(3)

class MetadataCountsItem(messages.Message):
    count = messages.MessageField(MetadataAttributeValues, 1, repeated=True)
    total = messages.IntegerField(2)

class MetaDomainsList(messages.Message):
    gender                                      = messages.StringField(1, repeated=True)
    history_of_neoadjuvant_treatment            = messages.StringField(2, repeated=True)
    country                                     = messages.StringField(3, repeated=True)
    Study                                       = messages.StringField(4, repeated=True)
    ethnicity                                   = messages.StringField(5, repeated=True)
    histological_type                           = messages.StringField(6, repeated=True)
    icd_10                                      = messages.StringField(7, repeated=True)
    icd_o_3_histology                           = messages.StringField(8, repeated=True)
    icd_o_3_site                                = messages.StringField(9, repeated=True)
    new_tumor_event_after_initial_treatment     = messages.StringField(10, repeated=True)
    neoplasm_histologic_grade                   = messages.StringField(11, repeated=True)
    pathologic_N                                = messages.StringField(12, repeated=True)
    pathologic_T                                = messages.StringField(13, repeated=True)
    pathologic_stage                            = messages.StringField(14, repeated=True)
    person_neoplasm_cancer_status               = messages.StringField(15, repeated=True)
    prior_dx                                    = messages.StringField(16, repeated=True)
    Project                                     = messages.StringField(17, repeated=True)
    race                                        = messages.StringField(18, repeated=True)
    residual_tumor                              = messages.StringField(19, repeated=True)
    SampleTypeCode                              = messages.StringField(20, repeated=True)
    tumor_tissue_site                           = messages.StringField(21, repeated=True)
    tumor_type                                  = messages.StringField(22, repeated=True)
    vital_status                                = messages.StringField(23, repeated=True)
    has_Illumina_DNASeq                         = messages.StringField(24, repeated=True)
    has_BCGSC_HiSeq_RNASeq                      = messages.StringField(25, repeated=True)
    has_UNC_HiSeq_RNASeq                        = messages.StringField(26, repeated=True)
    has_BCGSC_GA_RNASeq                         = messages.StringField(27, repeated=True)
    has_HiSeq_miRnaSeq                          = messages.StringField(28, repeated=True)
    has_GA_miRNASeq                             = messages.StringField(29, repeated=True)
    has_RPPA                                    = messages.StringField(30, repeated=True)
    has_SNP6                                    = messages.StringField(31, repeated=True)
    has_27k                                     = messages.StringField(32, repeated=True)
    has_450k                                    = messages.StringField(33, repeated=True)

class SampleBarcodeItem(messages.Message):
    sample_barcode = messages.StringField(1)
    study_id = messages.IntegerField(2)

class MetadataAttr(messages.Message):
    attribute = messages.StringField(1)
    code = messages.StringField(2)
    spec = messages.StringField(3)
    key = messages.StringField(4)


class MetadataAttrList(messages.Message):
    items = messages.MessageField(MetadataAttr, 1, repeated=True)
    count = messages.IntegerField(2)

class SampleBarcodeList(messages.Message):
    items = messages.MessageField(SampleBarcodeItem, 1, repeated=True)
    count = messages.IntegerField(2)

class MetadataPlatformItem(messages.Message):
    DNAseq_data = messages.StringField(1)
    cnvrPlatform = messages.StringField(2)
    gexpPlatform = messages.StringField(3)
    methPlatform = messages.StringField(4)
    mirnPlatform = messages.StringField(5)
    rppaPlatform = messages.StringField(6)

class MetadataPlatformItemList(messages.Message):
    items = messages.MessageField(MetadataPlatformItem, 1, repeated=True)

def createDataItem(data, selectors):
    if len(selectors):
        item = MetadataItem()
        for attr in selectors:
            attr = attr.encode('utf-8')
            if data[attr] is not None:
                if type(data[attr]) is not long and type(data[attr]) is not int:
                    item.__setattr__(attr, data[attr].encode('utf-8'))
                if attr.startswith('has_'):
                    item.__setattr__(attr, str(bool(data[attr])))
                else:
                    item.__setattr__(attr, data[attr])
            else:
                item.__setattr__(attr, None)
        return item

class MetadataDomainItem(messages.Message):
    attribute = messages.StringField(1)
    domains = messages.StringField(2, repeated=True)

def generateSQLQuery(request):
    db = sql_connection()
    query_dict = {}
    select = '*'
    sample_ids = ()
    selector_list = []

    # Check for passed in saved search id
    if request.__getattribute__('cohort_id') is not None:
        cohort_id = str(request.cohort_id)
        sample_query_str = 'SELECT sample_id FROM cohorts_samples WHERE cohort_id=%s AND study_id IS NULL;'

        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(sample_query_str, (cohort_id,))
            sample_ids = ()

            for row in cursor.fetchall():
                sample_ids += (row['sample_id'],)
            cursor.close()

        except (TypeError, IndexError) as e:
            print e
            raise endpoints.NotFoundException('Error in retrieving barcodes.')

    if request.__getattribute__('selectors') is not None and len(request.__getattribute__('selectors')):
        select = ','.join(request.selectors)
        selector_list = select.split(',')  # request.selectors

    # Get the list of valid parameters from request
    for key, value in MetadataItem.__dict__.items():
        if not key.startswith('_'):
            if request.__getattribute__(key) is not None:
                if key.startswith('has_'):
                    query_dict[key] = 1 if request.__getattribute__(key) == 'True' else 0
                else:
                    query_dict[key] = request.__getattribute__(key).replace('_', ' ')  # values coming in with _ replaced with spaces

    query_str = 'SELECT %s FROM metadata_samples' % select
    value_tuple = ()
    if len(query_dict) > 0:
        where_clause = build_where_clause(query_dict)
        query_str += ' WHERE ' + where_clause['query_str']
        value_tuple = where_clause['value_tuple']

    if sample_ids:
        if query_str.rfind('WHERE') >= 0:
            query_str += ' and SampleBarcode in %s' % (sample_ids,)
        else:
            query_str += ' WHERE SampleBarcode in %s' % (sample_ids,)

    if request.__getattribute__('limit') is not None:
        query_str += ' LIMIT %s' % request.__getattribute__('limit')

    query_str += ';'
    db.close()

    return query_str, value_tuple, selector_list


class MetadataDomainList(messages.Message):
    items = messages.MessageField(MetadataDomainItem, 1, repeated=True)


def normalize_metadata_ages(ages):
    result = []
    new_age_list = {'10 to 39': 0, '40 to 49': 0, '50 to 59': 0, '60 to 69': 0, '70 to 79': 0, 'Over 80': 0, 'None': 0}
    for age in ages:
        if type(age) != dict:

            if age.value != 'None':
                int_age = float(age.value)
                if int_age < 40:
                    new_age_list['10 to 39'] += int(age.count)
                elif int_age < 50:
                    new_age_list['40 to 49'] += int(age.count)
                elif int_age < 60:
                    new_age_list['50 to 59'] += int(age.count)
                elif int_age < 70:
                    new_age_list['60 to 69'] += int(age.count)
                elif int_age < 80:
                    new_age_list['70 to 79'] += int(age.count)
                else:
                    new_age_list['Over 80'] += int(age.count)
            else:
                new_age_list['None'] += int(age.count)

    for key, value in new_age_list.items():
        result.append({'count': value, 'value': key})
    return result

class PlatformCount(messages.Message):
    platform = messages.StringField(1)
    count = messages.IntegerField(2)

class FileDetails(messages.Message):
    sample = messages.StringField(1)
    filename = messages.StringField(2)
    pipeline = messages.StringField(3)
    platform = messages.StringField(4)
    datalevel = messages.StringField(5)
    datatype = messages.StringField(6)
    gg_readgroupset_id = messages.StringField(7)
    cloudstorage_location = messages.StringField(8)

class SampleFiles(messages.Message):
    total_file_count = messages.IntegerField(1)
    page = messages.IntegerField(2)
    platform_count_list = messages.MessageField(PlatformCount, 3, repeated=True)
    file_list = messages.MessageField(FileDetails, 4, repeated=True)

class SampleFileCount(messages.Message):
    sample_id = messages.StringField(1)
    count = messages.IntegerField(2)

class CohortFileCountSampleList(messages.Message):
    sample_list = messages.MessageField(SampleFileCount, 1, repeated=True)

class IncomingPlatformSelection(messages.Message):
    ABSOLiD_DNASeq                      = messages.StringField(1)
    Genome_Wide_SNP_6                   = messages.StringField(2)
    HumanMethylation27                  = messages.StringField(3)
    HumanMethylation450                 = messages.StringField(4)
    IlluminaGA_DNASeq                   = messages.StringField(5)
    IlluminaGA_DNASeq_automated         = messages.StringField(6)
    IlluminaGA_DNASeq_Cont_automated    = messages.StringField(7)
    IlluminaGA_DNASeq_curated           = messages.StringField(8)
    IlluminaGA_miRNASeq                 = messages.StringField(9)
    IlluminaGA_None                     = messages.StringField(10)
    IlluminaGA_RNASeq                   = messages.StringField(11)
    IlluminaGA_RNASeqV2                 = messages.StringField(12)
    IlluminaHiSeq_DNASeq                = messages.StringField(13)
    IlluminaHiSeq_DNASeq_automated      = messages.StringField(14)
    IlluminaHiSeq_DNASeq_Cont_automated = messages.StringField(15)
    IlluminaHiSeq_miRNASeq              = messages.StringField(16)
    IlluminaHiSeq_None                  = messages.StringField(17)
    IlluminaHiSeq_RNASeq                = messages.StringField(18)
    IlluminaHiSeq_RNASeqV2              = messages.StringField(19)
    IlluminaHiSeq_TotalRNASeqV2         = messages.StringField(20)
    IlluminaMiSeq_DNASeq                = messages.StringField(21)
    IlluminaMiSeq_None                  = messages.StringField(22)
    LifeIonTorrentPGM_None              = messages.StringField(23)
    LifeIonTorrentProton_None           = messages.StringField(24)
    MDA_RPPA_Core                       = messages.StringField(25)
    microsat_i                          = messages.StringField(26)
    Mixed_DNASeq_Cont                   = messages.StringField(27)
    Mixed_DNASeq_Cont_curated           = messages.StringField(28)
    Mixed_DNASeq_curated                = messages.StringField(29)
    RocheGSFLX_DNASeq                   = messages.StringField(30)


def get_current_user(request):
    user_email = None
    user_id = None
    if endpoints.get_current_user() is not None:
        user_email = endpoints.get_current_user().email()

    # users have the option of pasting the access token in the query string
    # or in the 'token' field in the api explorer
    # but this is not required
    access_token = request.__getattribute__('token')
    if access_token:
        user_email = get_user_email_from_token(access_token)

    if user_email or user_id:
        django.setup()
        try:
            return Django_User.objects.get(email=user_email)
        except (ObjectDoesNotExist, MultipleObjectsReturned), e:
            logger.warn(e)

    return None

Meta_Endpoints = endpoints.api(name='meta_api', version='v1', description='Metadata endpoints used by the web application.',
                               allowed_client_ids=[INSTALLED_APP_CLIENT_ID, endpoints.API_EXPLORER_CLIENT_ID])

@Meta_Endpoints.api_class(resource_name='meta_endpoints')
class Meta_Endpoints_API(remote.Service):

    GET_RESOURCE = endpoints.ResourceContainer(IncomingMetadataItem,
                                               limit=messages.IntegerField(2),
                                               cohort_id=messages.IntegerField(3))
    @endpoints.method(GET_RESOURCE, MetadataPlatformItemList,
                      path='metadata_platform_list', http_method='GET',
                      name='meta.metadata_platform_list')
    def metadata_platform_list(self, request):
        """ Used by the web application."""
        query_dict = {}
        sample_ids = None

        db = sql_connection()

        # Check for passed in saved search id
        if request.__getattribute__('cohort_id') is not None:
            cohort_id = str(request.cohort_id)
            sample_query_str = 'SELECT sample_id FROM cohorts_samples WHERE cohort_id=%s;'

            try:
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(sample_query_str, (cohort_id,))
                sample_ids = ()

                for row in cursor.fetchall():
                    sample_ids += (row['sample_id'],)

            except (TypeError, IndexError) as e:
                print e
                raise endpoints.NotFoundException('Error in retrieving barcodes.')

        # Get the list of valid parameters from request
        for key, value in MetadataItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    if key.startswith('has_'):
                        query_dict[key] = '1' if request.__getattribute__(key) == 'True' else '0'
                    else:
                        query_dict[key] = request.__getattribute__(key).replace('_', ' ')
                    # combinations: has_UNC_HiSeq_RNASeq and has_UNC_GA_RNASeq 20 rows
                    # has_UNC_HiSeq_RNASeq and has_BCGSC_GA_RNASeq 209 rows
                    # has_BCGSC_HiSeq_RNASeq and has_UNC_HiSeq_RNASeq 919 rows

        query_str = "SELECT " \
                    "IF(has_Illumina_DNASeq=1, " \
                    "'Yes', 'None'" \
                    ") AS DNAseq_data," \
                    "IF (has_SNP6=1, 'Genome_Wide_SNP_6', 'None') as cnvrPlatform," \
                    "CASE" \
                    "  WHEN has_BCGSC_HiSeq_RNASeq=1 and has_UNC_HiSeq_RNASeq=0" \
                    "    THEN 'HiSeq/BCGSC'" \
                    "  WHEN has_BCGSC_HiSeq_RNASeq=1 and has_UNC_HiSeq_RNASeq=1" \
                    "    THEN 'HiSeq/BCGSC and UNC V2'" \
                    "  WHEN has_UNC_HiSeq_RNASeq=1 and has_BCGSC_HiSeq_RNASeq=0 and has_BCGSC_GA_RNASeq=0 and has_UNC_GA_RNASeq=0" \
                    "    THEN 'HiSeq/UNC V2'" \
                    "  WHEN has_UNC_HiSeq_RNASeq=1 and has_BCGSC_HiSeq_RNASeq=0 and has_BCGSC_GA_RNASeq=0 and has_UNC_GA_RNASeq=1" \
                    "    THEN 'GA and HiSeq/UNC V2'" \
                    "  WHEN has_UNC_HiSeq_RNASeq=1 and has_BCGSC_HiSeq_RNASeq=0 and has_BCGSC_GA_RNASeq=1 and has_UNC_GA_RNASeq=0" \
                    "    THEN 'HiSeq/UNC V2 and GA/BCGSC'" \
                    "  WHEN has_UNC_HiSeq_RNASeq=1 and has_BCGSC_HiSeq_RNASeq=1 and has_BCGSC_GA_RNASeq=0 and has_UNC_GA_RNASeq=0" \
                    "    THEN 'HiSeq/UNC V2 and BCGSC'" \
                    "  WHEN has_BCGSC_GA_RNASeq=1 and has_UNC_HiSeq_RNASeq=0" \
                    "    THEN 'GA/BCGSC'" \
                    "  WHEN has_UNC_GA_RNASeq=1 and has_UNC_HiSeq_RNASeq=0" \
                    "    THEN 'GA/UNC V2'" \
                    "  ELSE 'None'" \
                    "END AS gexpPlatform," \
                    "CASE " \
                    "   WHEN has_27k=1 and has_450k=0" \
                    "     THEN 'HumanMethylation27'" \
                    "   WHEN has_27k=0 and has_450k=1" \
                    "     THEN 'HumanMethylation450'" \
                    "   WHEN has_27k=1 and has_450k=1" \
                    "     THEN '27k and 450k'" \
                    "   ELSE 'None'" \
                    "END AS methPlatform," \
                    "CASE " \
                    "   WHEN has_HiSeq_miRnaSeq=1 and has_GA_miRNASeq=0" \
                    "      THEN 'IlluminaHiSeq_miRNASeq'" \
                    "   WHEN has_HiSeq_miRnaSeq=0 and has_GA_miRNASeq=1" \
                    "      THEN 'IlluminaGA_miRNASeq'" \
                    "   WHEN has_HiSeq_miRnaSeq=1 and has_GA_miRNASeq=1" \
                    "      THEN 'GA and HiSeq'" \
                    "   ELSE 'None'" \
                    "END AS mirnPlatform," \
                    "IF (has_RPPA=1, 'MDA_RPPA_Core', 'None') AS rppaPlatform " \
                    "FROM metadata_samples "

        value_tuple = ()
        if len(query_dict) > 0:
            where_clause = build_where_clause(query_dict)
            query_str += ' WHERE ' + where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        if sample_ids:
            if query_str.rfind('WHERE') >= 0:
                query_str += ' and SampleBarcode in %s' % (sample_ids,)
            else:
                query_str += ' WHERE SampleBarcode in %s' % (sample_ids,)

        if request.__getattribute__('limit') is not None:
            query_str += ' LIMIT %s' % request.__getattribute__('limit')

        query_str += ';'

        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            data = []
            for row in cursor.fetchall():

                item = MetadataPlatformItem(
                    DNAseq_data=str(row['DNAseq_data']),
                    cnvrPlatform=str(row['cnvrPlatform']),
                    gexpPlatform=str(row['gexpPlatform']),
                    methPlatform=str(row['methPlatform']),
                    mirnPlatform=str(row['mirnPlatform']),
                    rppaPlatform=str(row['rppaPlatform']),
                )
                data.append(item)

            cursor.close()
            db.close()

            return MetadataPlatformItemList(items=data)

        except (IndexError, TypeError) as e:
            if cursor: cursor.close()
            if db: db.close()
            raise endpoints.NotFoundException('Sample not found.')




    GET_RESOURCE = endpoints.ResourceContainer(IncomingMetadataItem,
                                               limit=messages.IntegerField(2),
                                               cohort_id=messages.IntegerField(3),
                                               selectors=messages.StringField(4, repeated=True))
    @endpoints.method(GET_RESOURCE, MetadataItemList,
                      path='metadata_list', http_method='GET',
                      name='meta.metadata_list')
    def metadata_list(self, request):
        """ Used by the web application."""
        select = '*'
        query_dict = {}
        selector_list = []  # todo: determine use or delete this
        sample_ids = None

        db = sql_connection()
        query_str, value_tuple, selector_list = generateSQLQuery(request)
        if debug: print >> sys.stderr,query_str

        try:
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            data = []

            for row in cursor.fetchall():
                if selector_list:
                    item = createDataItem(row, selector_list)
                else:
                    item = MetadataItem(
                        age_at_initial_pathologic_diagnosis=None if "age_at_initial_pathologic_diagnosis" not in row or row["age_at_initial_pathologic_diagnosis"] is None else int(row["age_at_initial_pathologic_diagnosis"]),
                        anatomic_neoplasm_subdivision=str(row["anatomic_neoplasm_subdivision"]),
                        avg_percent_lymphocyte_infiltration=None if "avg_percent_lymphocyte_infiltration" not in row or row["avg_percent_lymphocyte_infiltration"] is None else float(row["avg_percent_lymphocyte_infiltration"]),
                        avg_percent_monocyte_infiltration=None if "avg_percent_monocyte_infiltration" not in row or row["avg_percent_monocyte_infiltration"] is None else float(row["avg_percent_monocyte_infiltration"]),
                        avg_percent_necrosis=None if "avg_percent_necrosis" not in row or row["avg_percent_necrosis"] is None else float(row["avg_percent_necrosis"]),
                        avg_percent_neutrophil_infiltration=None if "avg_percent_neutrophil_infiltration" not in row or row["avg_percent_neutrophil_infiltration"] is None else float(row["avg_percent_neutrophil_infiltration"]),
                        avg_percent_normal_cells=None if "avg_percent_normal_cells" not in row or row["avg_percent_normal_cells"] is None else float(row["avg_percent_normal_cells"]),
                        avg_percent_stromal_cells=None if "avg_percent_stromal_cells" not in row or row["avg_percent_stromal_cells"] is None else float(row["avg_percent_stromal_cells"]),
                        avg_percent_tumor_cells=None if "avg_percent_tumor_cells" not in row or row["avg_percent_tumor_cells"] is None else float(row["avg_percent_tumor_cells"]),
                        avg_percent_tumor_nuclei=None if "avg_percent_tumor_nuclei" not in row or row["avg_percent_tumor_nuclei"] is None else float(row["avg_percent_tumor_nuclei"]),
                        batch_number=None if "batch_number" not in row or row["batch_number"] is None else int(row["batch_number"]),
                        bcr=str(row["bcr"]),
                        clinical_M=str(row["clinical_M"]),
                        clinical_N=str(row["clinical_N"]),
                        clinical_stage=str(row["clinical_stage"]),
                        clinical_T=str(row["clinical_T"]),
                        colorectal_cancer=str(row["colorectal_cancer"]),
                        country=str(row["country"]),
                        days_to_birth=None if "days_to_birth" not in row or row['days_to_birth'] is None else int(row["days_to_birth"]),
                        days_to_collection=None if "days_to_collection" not in row or row['days_to_collection'] is None else int(row["days_to_collection"]),
                        days_to_death=None if "days_to_death" not in row or row['days_to_death'] is None else int(row["days_to_death"]),
                        days_to_initial_pathologic_diagnosis=None if "days_to_initial_pathologic_diagnosis" not in row or row['days_to_initial_pathologic_diagnosis'] is None else int(row["days_to_initial_pathologic_diagnosis"]),
                        days_to_last_followup=None if "days_to_last_followup" not in row or row['days_to_last_followup'] is None else int(row["days_to_last_followup"]),
                        days_to_submitted_specimen_dx=None if "days_to_submitted_specimen_dx" not in row or row['days_to_submitted_specimen_dx'] is None else int(row["days_to_submitted_specimen_dx"]),
                        Study=str(row["Study"]),
                        ethnicity=str(row["ethnicity"]),
                        frozen_specimen_anatomic_site=str(row["frozen_specimen_anatomic_site"]),
                        gender=str(row["gender"]),
                        height=None if "height" not in row or row['height'] is None else int(row["height"]),
                        histological_type=str(row["histological_type"]),
                        history_of_colon_polyps=str(row["history_of_colon_polyps"]),
                        history_of_neoadjuvant_treatment=str(row["history_of_neoadjuvant_treatment"]),
                        history_of_prior_malignancy=str(row["history_of_prior_malignancy"]),
                        hpv_calls=str(row["hpv_calls"]),
                        hpv_status=str(row["hpv_status"]),
                        icd_10=str(row["icd_10"]),
                        icd_o_3_histology=str(row["icd_o_3_histology"]),
                        icd_o_3_site=str(row["icd_o_3_site"]),
                        lymphatic_invasion=str(row["lymphatic_invasion"]),
                        lymphnodes_examined=str(row["lymphnodes_examined"]),
                        lymphovascular_invasion_present=str(row["lymphovascular_invasion_present"]),
                        max_percent_lymphocyte_infiltration=None if "max_percent_lymphocyte_infiltration" not in row or row["max_percent_lymphocyte_infiltration"] is None else int(row["max_percent_lymphocyte_infiltration"]),  # 46)
                        max_percent_monocyte_infiltration=None if "max_percent_monocyte_infiltration" not in row or row["max_percent_monocyte_infiltration"] is None else int(row["max_percent_monocyte_infiltration"]),  # 47)
                        max_percent_necrosis=None if "max_percent_necrosis" not in row or row["max_percent_necrosis"] is None else int(row["max_percent_necrosis"]),  # 48)
                        max_percent_neutrophil_infiltration=None if "max_percent_neutrophil_infiltration" not in row or row["max_percent_neutrophil_infiltration"] is None else int(row["max_percent_neutrophil_infiltration"]),  # 49)
                        max_percent_normal_cells=None if "max_percent_normal_cells" not in row or row["max_percent_normal_cells"] is None else int(row["max_percent_normal_cells"]),  # 50)
                        max_percent_stromal_cells=None if "max_percent_stromal_cells" not in row or row["max_percent_stromal_cells"] is None else int(row["max_percent_stromal_cells"]),  # 51)
                        max_percent_tumor_cells=None if "max_percent_tumor_cells" not in row or row["max_percent_tumor_cells"] is None else int(row["max_percent_tumor_cells"]),  # 52)
                        max_percent_tumor_nuclei=None if "max_percent_tumor_nuclei" not in row or row["max_percent_tumor_nuclei"] is None else int(row["max_percent_tumor_nuclei"]),  # 53)
                        menopause_status=str(row["menopause_status"]),
                        min_percent_lymphocyte_infiltration=None if "min_percent_lymphocyte_infiltration" not in row or row["min_percent_lymphocyte_infiltration"] is None else int(row["min_percent_lymphocyte_infiltration"]),  # 55)
                        min_percent_monocyte_infiltration=None if "min_percent_monocyte_infiltration" not in row or row["min_percent_monocyte_infiltration"] is None else int(row["min_percent_monocyte_infiltration"]),  # 56)
                        min_percent_necrosis=None if "min_percent_necrosis" not in row or row["min_percent_necrosis"] is None else int(row["min_percent_necrosis"]),  # 57)
                        min_percent_neutrophil_infiltration=None if "min_percent_neutrophil_infiltration" not in row or row["min_percent_neutrophil_infiltration"] is None else int(row["min_percent_neutrophil_infiltration"]),  # 58)
                        min_percent_normal_cells=None if "min_percent_normal_cells" not in row or row["min_percent_normal_cells"] is None else int(row["min_percent_normal_cells"]),  # 59)
                        min_percent_stromal_cells=None if "min_percent_stromal_cells" not in row or row["min_percent_stromal_cells"] is None else int(row["min_percent_stromal_cells"]),  # 60)
                        min_percent_tumor_cells=None if "min_percent_tumor_cells" not in row or row["min_percent_tumor_cells"] is None else int(row["min_percent_tumor_cells"]),  # 61)
                        min_percent_tumor_nuclei=None if "min_percent_tumor_nuclei" not in row or row["min_percent_tumor_nuclei"] is None else int(row["min_percent_tumor_nuclei"]),  # 62)
                        mononucleotide_and_dinucleotide_marker_panel_analysis_status=str(row["mononucleotide_and_dinucleotide_marker_panel_analysis_status"]),
                        mononucleotide_marker_panel_analysis_status=str(row["mononucleotide_marker_panel_analysis_status"]),
                        neoplasm_histologic_grade=str(row["neoplasm_histologic_grade"]),
                        new_tumor_event_after_initial_treatment=str(row["new_tumor_event_after_initial_treatment"]),
                        number_of_lymphnodes_examined=None if "number_of_lymphnodes_examined" not in row or row['number_of_lymphnodes_examined'] is None else int(row["number_of_lymphnodes_examined"]),
                        number_of_lymphnodes_positive_by_he=None if "number_of_lymphnodes_positive_by_he" not in row or row['number_of_lymphnodes_positive_by_he'] is None else int(row["number_of_lymphnodes_positive_by_he"]),
                        ParticipantBarcode=str(row["ParticipantBarcode"]),
                        pathologic_M=str(row["pathologic_M"]),
                        pathologic_N=str(row["pathologic_N"]),
                        pathologic_stage=str(row["pathologic_stage"]),
                        pathologic_T=str(row["pathologic_T"]),
                        person_neoplasm_cancer_status=str(row["person_neoplasm_cancer_status"]),
                        pregnancies=str(row["pregnancies"]),
                        primary_neoplasm_melanoma_dx=str(row["primary_neoplasm_melanoma_dx"]),
                        primary_therapy_outcome_success=str(row["primary_therapy_outcome_success"]),
                        prior_dx=str(row["prior_dx"]),
                        Project=str(row["Project"]),
                        psa_value=None if "psa_value" not in row or row["psa_value"] is None else float(row["psa_value"]),
                        race=str(row["race"]),
                        residual_tumor=str(row["residual_tumor"]),
                        SampleBarcode=str(row["SampleBarcode"]),
                        tobacco_smoking_history=str(row["tobacco_smoking_history"]),
                        tumor_tissue_site=str(row["tumor_tissue_site"]),
                        tumor_type=str(row["tumor_type"]),
                        weiss_venous_invasion=str(row["weiss_venous_invasion"]),
                        vital_status=str(row["vital_status"]),
                        weight=None if "weight" not in row or row["weight"] is None else int(float(row["weight"])),
                        year_of_initial_pathologic_diagnosis=str(row["year_of_initial_pathologic_diagnosis"]),
                        SampleTypeCode=str(row["SampleTypeCode"]),
                        has_Illumina_DNASeq=str(bool(row["has_Illumina_DNASeq"])),
                        has_BCGSC_HiSeq_RNASeq=str(bool(row["has_BCGSC_HiSeq_RNASeq"])),
                        has_UNC_HiSeq_RNASeq=str(bool(row["has_UNC_HiSeq_RNASeq"])),
                        has_BCGSC_GA_RNASeq=str(bool(row["has_BCGSC_GA_RNASeq"])),
                        has_UNC_GA_RNASeq=str(bool(row["has_UNC_GA_RNASeq"])),
                        has_HiSeq_miRnaSeq=str(bool(row["has_HiSeq_miRnaSeq"])),
                        has_GA_miRNASeq=str(bool(row["has_GA_miRNASeq"])),
                        has_RPPA=str(bool(row["has_RPPA"])),
                        has_SNP6=str(bool(row["has_SNP6"])),
                        has_27k=str(bool(row["has_27k"])),
                        has_450k=str(bool(row["has_450k"]))
                    )

                data.append(item)

            cursor.close()
            db.close()

            return MetadataItemList(items=data, total=len(data))

        except (IndexError, TypeError) as e:
            if cursor: cursor.close()
            if db: db.close()
            raise endpoints.NotFoundException('Sample not found.')


    GET_RESOURCE = endpoints.ResourceContainer(IncomingMetadataItem,
                                               is_landing=messages.BooleanField(2),
                                               cohort_id=messages.IntegerField(3))
    @endpoints.method(GET_RESOURCE, MetadataItemList,
                          path='metadata_counts', http_method='GET',
                      name='meta.metadata_counts')
    def metadata_counts(self, request):
        """ Used by the web application."""
        query_dict = {}
        sample_ids = None
        is_landing = False


        if request.__getattribute__('is_landing') is not None:
            is_landing = request.__getattribute__('is_landing')

        if is_landing:
            try:
                db = sql_connection()
                cursor = db.cursor()
                cursor.execute('SELECT Study, COUNT(Study) as disease_count FROM metadata_samples GROUP BY Study;')
                data = []
                for row in cursor.fetchall():
                    value_list_count = MetaValueListCount(
                        value=row[0],
                        count=int(row[1])
                    )
                    data.append(value_list_count)

                attr_values_list = MetaAttrValuesList(Study=data)

                cursor.close()
                db.close()

                return MetadataItemList(count=attr_values_list)

            except (IndexError, TypeError) as e:

                raise endpoints.NotFoundException('Error in getting landing data.')

        # Check for passed in saved search id
        if request.__getattribute__('cohort_id') is not None:
            cohort_id = str(request.cohort_id)
            sample_query_str = 'SELECT sample_id FROM cohorts_samples WHERE cohort_id=%s;'

            try:
                db = sql_connection()
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(sample_query_str, (cohort_id,))
                sample_ids = ()

                for row in cursor.fetchall():
                    sample_ids += (row['sample_id'],)
                cursor.close()
                db.close()

            except (TypeError, IndexError) as e:
                raise endpoints.NotFoundException('Error in retrieving barcodes.')


        # Get the list of valid parameters from request
        for key, value in MetadataItem.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None:
                    if key.startswith('has_'):
                        query_dict[key] = '1' if request.__getattribute__(key) == 'True' else '0'
                    else:
                        query_dict[key] = request.__getattribute__(key).replace('_', ' ')

        value_list = {}
        total = 0
        for key in METADATA_SHORTLIST:  # fix metadata_shortlist
            # counts[key] = {}
            domain_query_str = 'SELECT %s FROM metadata_samples GROUP BY %s' % (key, key)
            value_count_query_str = 'SELECT %s, COUNT(*) FROM metadata_samples' % key
            value_count_tuple = ()
            if len(query_dict) > 0:

                where_clause = applyFilter(key, query_dict)

                if where_clause is not None:
                    value_count_query_str += ' WHERE' + where_clause['query_str']
                    value_count_tuple += where_clause['value_tuple']

            if sample_ids:
                if value_count_query_str.rfind('WHERE') >= 0:
                    value_count_query_str += ' and SampleBarcode in %s' % (sample_ids,)
                else:
                    value_count_query_str += ' where SampleBarcode in %s' % (sample_ids,)

            value_count_query_str += ' GROUP BY %s;' % key

            try:
                db = sql_connection()
                cursor = db.cursor()
                cursor.execute(value_count_query_str, value_count_tuple)

                value_list[key] = []
                count = 0
                data = []
                data_domain = []
                # Real data counts
                key_total = 0
                for row in cursor.fetchall():

                    # print row

                    key_total += row[1]
                    # note: assumes no null values for data availability fields (which start with 'has_')
                    if key.startswith('has_'):
                        value_list[key].append(MetaValueListCount(value=str(bool(row[0])), count=row[1]))
                        data_domain.append(str(bool(row[0])))
                    elif type(row[0]) == long:
                        value_list[key].append(MetaValueListCount(value=str(int(row[0])), count=row[1]))
                        data_domain.append(int(row[0]))
                    else:
                        value_list[key].append(MetaValueListCount(value=str(row[0]), count=row[1]))
                        data_domain.append(str(row[0]))
                # Find the total number of samples
                if key_total > total:
                    total = key_total

                # Fill in other values for each feature with 0
                cursor.execute(domain_query_str)
                for row in cursor.fetchall():
                    # note: assumes no null values for data availability fields (which start with 'has_')
                    if key.startswith('has_'):
                        if str(bool(row[0])) not in data_domain:
                            value_list[key].append(MetaValueListCount(value=str(bool(row[0])), count=0))
                            data_domain.append(bool(row[0]))
                    elif str(row[0]) not in data_domain:
                        if type(row[0]) == long:
                            value_list[key].append(MetaValueListCount(value=str(int(row[0])), count=0))
                            data_domain.append(int(row[0]))
                        else:
                            value_list[key].append(MetaValueListCount(value=str(row[0]), count=0))
                            data_domain.append(str(row[0]))

                if key == 'age_at_initial_pathologic_diagnosis':
                    value_list['age_at_initial_pathologic_diagnosis'] = normalize_metadata_ages(value_list['age_at_initial_pathologic_diagnosis'])
                cursor.close()
                db.close()
            except (KeyError, TypeError) as e:
                if cursor: cursor.close()
                if db: db.close()
                raise endpoints.NotFoundException('Error in getting value counts.')

        value_list_item = MetaAttrValuesList()
        for key in METADATA_SHORTLIST:
            value_list_item.__setattr__(key, None if key not in value_list else value_list[key])

        return MetadataItemList(count=value_list_item, total=total)


    GET_RESOURCE = endpoints.ResourceContainer(
        MetadataAttr)
    @endpoints.method(GET_RESOURCE, MetadataAttrList,
                      path='metadata_attr_list', http_method='GET',
                      name='meta.metadata_attr_list')
    def metadata_attr_list(self, request):
        """ Used by the web application."""
        query_dict = {}
        value_tuple = ()
        for key, value in MetadataAttr.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) != None:
                    query_dict[key] = request.__getattribute__(key)

        if len(query_dict) == 0:
            query_str = 'SELECT * FROM metadata_attr'
        else:
            query_str = 'SELECT * FROM metadata_attr where'

            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            data = []
            for row in cursor.fetchall():
                data.append(MetadataAttr(attribute=str(row['attribute']),
                                   code=str(row['code']),
                                   spec=str(row['spec']),
                                   ))

            cursor.close()
            db.close()
            return MetadataAttrList(items=data, count=len(data))

        except (IndexError, TypeError):
            if cursor: cursor.close()
            if db: db.close()
            raise endpoints.NotFoundException('Sample %s not found.' % (request.id,))


    @endpoints.method(message_types.VoidMessage, MetaDomainsList,
                      path='metadata_domains', http_method='GET',
                      name='meta.metadata_domains')
    def domains_list(self, request):
        """ Used by the web application."""
        db = sql_connection()
        cursor = db.cursor()
        items = {}
        feature_list = MetaDomainsList.__dict__.keys()
        meta_categorical_attributes = [
            'gender',
            'history_of_neoadjuvant_treatment',
            'icd_o_3_histology',
            'prior_dx',
            'vital_status',
            'country',
            'Study',
            'histological_type',
            'icd_10',
            'icd_o_3_site',
            'tumor_tissue_site',
            'tumor_type',
            'person_neoplasm_cancer_status',
            'pathologic_N',
            'pathologic_T',
            'race',
            'ethnicity',
            'SampleTypeCode',
            'has_Illumina_DNASeq',
            'has_BCGSC_HiSeq_RNASeq',
            'has_UNC_HiSeq_RNASeq',
            'has_BCGSC_GA_RNASeq',
            'has_HiSeq_miRnaSeq',
            'has_GA_miRNASeq',
            'has_RPPA',
            'has_SNP6',
            'has_27k',
            'has_450k'
        ]

        try:
            for feature in feature_list:
                if '__' not in feature:
                    query_str = 'SELECT DISTINCT %s from metadata_samples;' % feature
                    cursor.execute(query_str)
                    item_list = []
                    for item in cursor.fetchall():
                        if feature.startswith('has_'):
                            item_list.append(str(bool(int(item[0]))))
                        else:
                            item_list.append(str(item[0]))
                    items[feature] = item_list
            items['age_at_initial_pathologic_diagnosis'] = ['10 to 39', '40 to 49', '50 to 59', '60 to 69', '70 to 79', 'Over 80', 'None']
            cursor.close()
            db.close()
            return MetaDomainsList(
                gender                               = items['gender'],
                history_of_neoadjuvant_treatment     = items['history_of_neoadjuvant_treatment'],
                icd_o_3_histology                    = items['icd_o_3_histology'],
                prior_dx                             = items['prior_dx'],
                vital_status                         = items['vital_status'],
                country                              = items['country'],
                Study                                = items['Study'],
                histological_type                    = items['histological_type'],
                icd_10                               = items['icd_10'],
                icd_o_3_site                         = items['icd_o_3_site'],
                tumor_tissue_site                    = items['tumor_tissue_site'],
                tumor_type                           = items['tumor_type'],
                person_neoplasm_cancer_status        = items['person_neoplasm_cancer_status'],
                pathologic_N                         = items['pathologic_N'],
                pathologic_T                         = items['pathologic_T'],
                race                                 = items['race'],
                ethnicity                            = items['ethnicity'],
                SampleTypeCode                       = items['SampleTypeCode'],
                has_Illumina_DNASeq                  = items['has_Illumina_DNASeq'],
                has_BCGSC_HiSeq_RNASeq               = items['has_BCGSC_HiSeq_RNASeq'],
                has_UNC_HiSeq_RNASeq                 = items['has_UNC_HiSeq_RNASeq'],
                has_BCGSC_GA_RNASeq                  = items['has_BCGSC_GA_RNASeq'],
                has_HiSeq_miRnaSeq                   = items['has_HiSeq_miRnaSeq'],
                has_GA_miRNASeq                      = items['has_GA_miRNASeq'],
                has_RPPA                             = items['has_RPPA'],
                has_SNP6                             = items['has_SNP6'],
                has_27k                              = items['has_27k'],
                has_450k                             = items['has_450k']
                )

        except (IndexError, TypeError):
            if cursor: cursor.close()
            if db: db.close()
            raise endpoints.NotFoundException('Error in meta_domains')


    GET_RESOURCE = endpoints.ResourceContainer(IncomingPlatformSelection,
                                               cohort_id=messages.IntegerField(1, required=True),
                                               page=messages.IntegerField(2),
                                               limit=messages.IntegerField(3),
                                               token=messages.StringField(4),
                                               platform_count_only=messages.StringField(5)
                                               )
    @endpoints.method(GET_RESOURCE, SampleFiles,
                      path='cohort_files', http_method='GET',
                      name='meta.cohort_files')
    def cohort_files(self, request):
        """ Used by the web application."""
        limit = 20
        page = 1
        offset = 0
        cohort_id = request.cohort_id

        platform_count_only = request.__getattribute__('platform_count_only')
        is_dbGaP_authorized = False
        user_email = None
        user_id = None
        if endpoints.get_current_user() is not None:
            user_email = endpoints.get_current_user().email()

        # users have the option of pasting the access token in the query string
        # or in the 'token' field in the api explorer
        # but this is not required
        access_token = request.__getattribute__('token')
        if access_token:
            user_email = get_user_email_from_token(access_token)

        if user_email or user_id:
            django.setup()
            try:
                user_id = Django_User.objects.get(email=user_email).id
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.warn(e)
                raise endpoints.NotFoundException("%s does not have an entry in the user database." % user_email)
            try:
                cohort_perm = Cohort_Perms.objects.get(cohort_id=cohort_id, user_id=user_id)
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.warn(e)
                raise endpoints.UnauthorizedException("%s does not have permission to view cohort %d." % (user_email, cohort_id))

            try:
                nih_user = NIH_User.objects.get(user_id=user_id)
                is_dbGaP_authorized = nih_user.dbGaP_authorized and nih_user.active
            except (ObjectDoesNotExist, MultipleObjectsReturned), e:
                logger.info("%s does not have an entry in NIH_User: %s" % (user_email, str(e)))
        else:
            logger.warn("Authentication required for cohort_files endpoint.")
            raise endpoints.UnauthorizedException("No user email found.")

        if request.__getattribute__('page') is not None:
            page = request.page
            offset = (page - 1) * 20
        if request.__getattribute__('limit') is not None:
            limit = request.limit

        platform_count_query = 'select Platform, count(Platform) as platform_count from cohorts_samples cs join metadata_data md on md.SampleBarcode = cs.sample_id where cohort_id=%s and DatafileUploaded="true" '
        query = 'select SampleBarcode, DatafileName, DatafileNameKey, Pipeline, Platform, DataLevel, Datatype, GG_readgroupset_id from metadata_data md join cohorts_samples cs on md.SampleBarcode = cs.sample_id where cohort_id=%s and DatafileUploaded="true" '

        if not is_dbGaP_authorized:
            platform_count_query += ' and SecurityProtocol="dbGap open-access" group by Platform order by cs.sample_id;'
            query += ' and SecurityProtocol="dbGap open-access" '
        else:
            platform_count_query += ' group by Platform order by cs.sample_id;'

        # Check for incoming platform selectors
        platform_selector_list = []
        for key, value in IncomingPlatformSelection.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) is not None and request.__getattribute__(key) == 'True':
                    platform_selector_list.append(key)

        if len(platform_selector_list):
            query += ' and Platform in ("' + '","'.join(platform_selector_list) + '")'

        query_tuple = (cohort_id,)
        if limit != -1:
            query += ' limit %s'
            query_tuple += (limit,)

        if offset != 0:
            query += ' offset %s'
            query_tuple += (offset,)
        query += ';'

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(platform_count_query, (cohort_id,))

            platform_count_list = []
            count = 0
            if cursor.rowcount > 0:
                for row in cursor.fetchall():
                    if len(platform_selector_list):
                        if row['Platform'] in platform_selector_list:
                            count += int(row['platform_count'])
                    else:
                        count += int(row['platform_count'])
                    platform_count_list.append(PlatformCount(platform=row['Platform'], count=row['platform_count']))
            else:
                platform_count_list.append(PlatformCount(platform='None', count=0))

            file_list = []
            if not platform_count_only:
                cursor.execute(query, query_tuple)
                if cursor.rowcount > 0:
                    for item in cursor.fetchall():
                        file_list.append(FileDetails(sample=item['SampleBarcode'], cloudstorage_location=item['DatafileNameKey'], filename=item['DatafileName'], pipeline=item['Pipeline'], platform=item['Platform'], datalevel=item['DataLevel'], datatype=item['Datatype'], gg_readgroupset_id=item['GG_readgroupset_id']))
                else:
                    file_list.append(FileDetails(sample='None', filename='', pipeline='', platform='', datalevel=''))
            return SampleFiles(total_file_count=count, page=page, platform_count_list=platform_count_list, file_list=file_list)

        except (IndexError, TypeError):
            raise endpoints.ServiceException('Error getting counts')
        finally:
            if cursor: cursor.close()
            if db: db.close()

    GET_RESOURCE = endpoints.ResourceContainer(sample_id=messages.StringField(1, required=True))
    @endpoints.method(GET_RESOURCE, SampleFiles,
                      path='sample_files', http_method='GET',
                      name='meta.sample_files')
    def sample_files(self, request):
        '''
        Takes a SampleBarcode and returns a list of filenames and their associated cloudstorage locations, pipelines, and platforms.
        Also returns counts for the number of files derived from each platform.
        Checks user for dbGaP authorization and returns "Restricted" if a filename is controlled access and the user is not dbGaP authorized
        :param sample_id: SampleBarcode
        :return SampleFiles: a list of filenames and their associated cloudstorage locations, pipelines, and platforms
        as well as counts for the number of files for each platform.
        '''

        global cloudstorage_location
        sample_id = request.sample_id
        dbGaP_authorized = False

        query = "select SampleBarcode, " \
                "DatafileName, " \
                "Pipeline, " \
                "Platform, " \
                "IF(SecurityProtocol LIKE '%%open%%', DatafileNameKey, 'Restricted') as DatafileNameKey, " \
                "SecurityProtocol " \
                "from metadata_data " \
                "where SampleBarcode=%s;"

        if endpoints.get_current_user():
            user_email = endpoints.get_current_user().email()
            try:
                user_id = Django_User.objects.get(email=user_email)
                nih_user = NIH_User.objects.get(user_id=user_id)
                dbGaP_authorized = nih_user.dbGaP_authorized and nih_user.active
                if dbGaP_authorized:
                    query = "select SampleBarcode, " \
                            "DatafileName, " \
                            "Pipeline, " \
                            "Platform, " \
                            "DatafileNameKey, " \
                            "SecurityProtocol, " \
                            "Repository " \
                            "from metadata_data " \
                            "where SampleBarcode=%s;"
            except (ObjectDoesNotExist, MultipleObjectsReturned) as e:
                if type(e) is MultipleObjectsReturned:
                    logger.error("Meta.sample_files endpoint with user {} gave error: {}".format(user_email, str(e)))

        platform_query = "select Platform, " \
                         "count(Platform) as platform_count " \
                         "from metadata_data " \
                         "where SampleBarcode=%s " \
                         "group by Platform;"

        db = sql_connection()
        cursor = db.cursor(MySQLdb.cursors.DictCursor)

        try:
            cursor.execute(query, (sample_id,))
            file_list = []
            platform_list = []
            for item in cursor.fetchall():
                if len(item.get('DatafileNameKey', '')) == 0:
                    cloudstorage_location = 'File location not found.'
                elif 'open' in item['SecurityProtocol']:
                    cloudstorage_location = 'gs://{}{}'.format(OPEN_DATA_BUCKET, item['DatafileNameKey'])
                elif dbGaP_authorized:
                    # hard-coding mock bucket names for now --testing purposes only
                    if item['Repository'].lower() == 'dcc':
                        cloudstorage_location = 'gs://{}{}'.format(
                            'gs://62f2c827-mock-mock-mock-1cde698a4f77', item['DatafileNameKey'])
                    elif item['Repository'].lower() == 'cghub':
                        cloudstorage_location = 'gs://{}{}'.format(
                            'gs://360ee3ad-mock-mock-mock-52f9a5e7f99a', item['DatafileNameKey'])
                else:
                    cloudstorage_location = item.get('DatafileNameKey')  # this will return "Restricted"

                file_list.append(
                    FileDetails(
                        filename=item['DatafileName'],
                        pipeline=item['Pipeline'],
                        platform=item['Platform'],
                        cloudstorage_location=cloudstorage_location
                    )
                )
            cursor.execute(platform_query, (sample_id,))
            for item in cursor.fetchall():
                platform_list.append(PlatformCount(platform=item['Platform'], count=item['platform_count']))
            cursor.close()
            db.close()
            return SampleFiles(total_file_count=len(file_list), page=1, platform_count_list=platform_list, file_list=file_list)
        except Exception as e:
            if cursor: cursor.close()
            if db: db.close()
            raise endpoints.NotFoundException('Error getting file details: {}'.format(str(e)))

"""
Metadata Endpoints v2

Includes User Uploaded Data
"""
Meta_Endpoints_v2 = endpoints.api(name='meta_api', version='v2',
                               description='Retrieve metadata information relating to projects, cohorts, and other data',
                               allowed_client_ids=[INSTALLED_APP_CLIENT_ID, endpoints.API_EXPLORER_CLIENT_ID])

@Meta_Endpoints_v2.api_class(resource_name='meta_endpoints')
class Meta_Endpoints_API_v2(remote.Service):

    GET_RESOURCE = endpoints.ResourceContainer(
            MetadataAttr,
            token=messages.StringField(4),
    )
    @endpoints.method(GET_RESOURCE, MetadataAttrList,
                      path='attributes', http_method='GET',
                      name='meta.attr_list')
    def metadata_attr_list(self, request):

        user = get_current_user(request)
        query_dict = {}
        value_tuple = ()
        for key, value in MetadataAttr.__dict__.items():
            if not key.startswith('_'):
                if request.__getattribute__(key) != None:
                    query_dict[key] = request.__getattribute__(key)

        if len(query_dict) == 0:
            query_str = 'SELECT * FROM metadata_attr'
        else:
            query_str = 'SELECT * FROM metadata_attr where'
            where_clause = build_where_clause(query_dict)
            query_str += where_clause['query_str']
            value_tuple = where_clause['value_tuple']

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, value_tuple)
            data = []
            for row in cursor.fetchall():
                data.append(MetadataAttr(attribute=str(row['attribute']),
                                   code=str(row['code']),
                                   spec=str(row['spec']),
                                   key=str(row['spec']) + ':' + str(row['attribute'])
                                   ))

            if user:
                studies = Study.get_user_studies(user)
                feature_defs = User_Feature_Definitions.objects.filter(study__in=studies)
                for feature in feature_defs:
                    data_table = User_Data_Tables.objects.get(study=feature.study).metadata_samples_table
                    name = feature.feature_name
                    key = 'study:' + str(feature.study_id) + ':' + name

                    if feature.shared_map_id:
                        key = feature.shared_map_id

                    data.append(MetadataAttr(attribute=name,
                                             code='N' if feature.is_numeric else 'C',
                                             spec='USER',
                                             key=key
                                             ))

            cursor.close()
            db.close()

            return MetadataAttrList(items=data, count=len(data))

        except (IndexError, TypeError):
            if cursor: cursor.close()
            if db: db.close()
            raise endpoints.InternalServerErrorException('Error retrieving attribute list')

    GET_RESOURCE = endpoints.ResourceContainer(
                                               filters=messages.StringField(1),
                                               token=messages.StringField(3),
                                               cohort_id=messages.IntegerField(2))
    @endpoints.method(GET_RESOURCE, MetadataCountsItem,
                          path='metadata_counts', http_method='GET',
                      name='meta.metadata_counts')
    def metadata_counts(self, request):

        filters = {}
        query_dict = {}
        valid_attrs = {}
        sample_tables = {}
        table_key_map = {}
        sample_ids = None
        study_ids = ()
        cohort_id = None
        user = get_current_user(request)

        if request.__getattribute__('filters')is not None:
            try:
                tmp = json.loads(request.filters)
                for filter in tmp:
                    key = filter['key']
                    if key not in filters:
                        filters[key] = {'values':[], 'tables':[] }
                    filters[key]['values'].append(filter['value'])

            except Exception, e:
                print traceback.format_exc()
                raise endpoints.BadRequestException('Filters must be a valid JSON formatted array with objects containing both key and value properties')

        db = sql_connection()

        # Check for passed in saved search id
        if request.__getattribute__('cohort_id') is not None:
            cohort_id = str(request.cohort_id)
            sample_query_str = 'SELECT sample_id, study_id FROM cohorts_samples WHERE cohort_id=%s;'

            try:
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(sample_query_str, (cohort_id,))
                sample_ids = {}

                for row in cursor.fetchall():
                    if row['study_id'] not in sample_ids:
                        sample_ids[ row['study_id'] ] = []
                    sample_ids[ row['study_id'] ].append(row['sample_id'])
                cursor.close()

                for key in sample_ids:
                    list = sample_ids[key]
                    sample_ids[key] = {
                        'SampleBarcode': build_where_clause({'SampleBarcode': list}),
                        'sample_barcode': build_where_clause({'sample_barcode': list}),
                    }

            except (TypeError, IndexError) as e:
                if cursor: cursor.close()
                if db: db.close()
                raise endpoints.NotFoundException('Error in retrieving barcodes.')

        # Add TCGA attributes to the list of available attributes
        if 'user_studies' not in filters or 'tcga' in filters['user_studies']['values']:
            sample_tables['metadata_samples'] = {'sample_ids': None}
            if sample_ids and None in sample_ids:
                sample_tables['metadata_samples']['sample_ids'] = sample_ids[None]

            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute('SELECT attribute, spec FROM metadata_attr')
            for row in cursor.fetchall():
                if row['attribute'] in METADATA_SHORTLIST:
                    valid_attrs[row['spec'] + ':' + row['attribute']] = {
                        'name': row['attribute'],
                        'tables': ('metadata_samples',),
                        'sample_ids': None
                    }
            cursor.close()

        # If we have a user, get a list of valid studies
        if user:
            for study in Study.get_user_studies(user):
                if 'user_studies' not in filters or study.id in filters['user_studies']['values']:
                    study_ids += (study.id,)

                    for tables in User_Data_Tables.objects.filter(study=study):
                        sample_tables[tables.metadata_samples_table] = {'sample_ids': None}
                        if sample_ids and study.id in sample_ids:
                            sample_tables[tables.metadata_samples_table]['sample_ids'] = sample_ids[study.id]


            features = User_Feature_Definitions.objects.filter(study__in=study_ids)
            for feature in features:
                if ' ' in feature.feature_name:
                    # It is not a column name and comes from molecular data, ignore it
                    continue

                name = feature.feature_name
                key = 'study:' + str(feature.study_id) + ':' + name

                if feature.shared_map_id:
                    key = feature.shared_map_id
                    name = feature.shared_map_id.split(':')[-1]

                if key not in valid_attrs:
                    valid_attrs[key] = {'name': name,'tables': (), 'sample_ids': None}

                for tables in User_Data_Tables.objects.filter(study_id=feature.study_id):
                    valid_attrs[key]['tables'] += (tables.metadata_samples_table,)

                    if not tables.metadata_samples_table in table_key_map:
                        table_key_map[tables.metadata_samples_table] = {}
                    table_key_map[tables.metadata_samples_table][key] = feature.feature_name

                    if key in filters:
                        filters[key]['tables'] += (tables.metadata_samples_table,)

                    if sample_ids and feature.study_id in sample_ids:
                        valid_attrs[key]['sample_ids'] = sample_ids[feature.study_id]
        else:
            print "User not authenticated with Metadata Endpoint API"

        # Now that we're through the Studies filtering area, delete it so it doesn't get pulled into a query
        if 'user_studies' in filters:
            del filters['user_studies']

        # Loop through the features
        for key, feature in valid_attrs.items():
            # Get a count for each feature
            table_values = {}
            feature['total'] = 0
            for table in feature['tables']:
                # Check if the filters make this table 0 anyway
                # We do this to avoid SQL errors for columns that don't exist
                should_be_queried = True
                if cohort_id and sample_tables[table]['sample_ids'] is None:
                    should_be_queried = False

                for key, filter in filters.items():
                    if table not in filter['tables']:
                        should_be_queried = False
                        break

                # Build Filter Where Clause
                key_map = table_key_map[table] if table in table_key_map else False
                where_clause = build_where_clause(filters, alt_key_map=key_map)

                col_name = feature['name']
                if key_map and key in key_map:
                    col_name = key_map[key]

                cursor = db.cursor()
                if should_be_queried:
                    # Query the table for counts and values
                    query = ('SELECT DISTINCT %s, COUNT(1) as count FROM %s') % (col_name, table)
                    if where_clause['query_str']:
                        query += ' WHERE ' + where_clause['query_str']
                    if sample_tables[table]['sample_ids']:
                        barcode_key = 'SampleBarcode' if table is 'metadata_samples' else 'sample_barcode'
                        addt_cond = sample_tables[table]['sample_ids'][barcode_key]['query_str']
                        if addt_cond and where_clause['query_str']:
                            query += ' AND ' + addt_cond
                        elif addt_cond:
                            query += ' WHERE ' + addt_cond
                            where_clause['value_tuple'] += sample_tables[table]['sample_ids'][barcode_key]['value_tuple']
                    query += ' GROUP BY %s ' %col_name
                    cursor.execute(query, where_clause['value_tuple'])
                    for row in cursor.fetchall():
                        if not row[0] in table_values:
                            table_values[row[0]] = 0
                        table_values[row[0]] += int(row[1])
                        feature['total'] += int(row[1])
                else:
                    # Just get the values so we can have them be 0
                    cursor.execute(('SELECT DISTINCT %s FROM %s') % (col_name, table))
                    for row in cursor.fetchall():
                        if not row[0] in table_values:
                            table_values[row[0]] = 0

                cursor.close()

            feature['values'] = table_values

        count_list = []
        total = 0
        for key, feature in valid_attrs.items():
            value_list = []
            for value, count in feature['values'].items():
                if feature['name'].startswith('has_'):
                    value = 'True' if value else 'False'
                value_list.append(MetaValueListCount(value=str(value), count=count))

            count_list.append(MetadataAttributeValues(name=feature['name'], values=value_list, id=key, total=feature['total']))
            if feature['total'] > total:
                total = feature['total']

        db.close()
        return MetadataCountsItem(count=count_list, total=total)

    GET_RESOURCE = endpoints.ResourceContainer(
                                               cohort_id=messages.IntegerField(1),
                                               token=messages.StringField(2),
                                               filters=messages.StringField(3)
                                               )
    @endpoints.method(GET_RESOURCE, SampleBarcodeList,
                      path='metadata_sample_list', http_method='GET',
                      name='meta.metadata_sample_list')
    def metadata_list(self, request):
        filters = {}
        valid_attrs = {}
        sample_tables = {}
        table_key_map = {}
        sample_ids = None
        study_ids = ()
        cohort_id = None
        user = get_current_user(request)

        if request.__getattribute__('filters')is not None:
            try:
                tmp = json.loads(request.filters)
                for filter in tmp:
                    key = filter['key']
                    if key not in filters:
                        filters[key] = {'values':[], 'tables':[] }
                    filters[key]['values'].append(filter['value'])

            except Exception, e:
                print traceback.format_exc()
                raise endpoints.BadRequestException('Filters must be a valid JSON formatted array with objects containing both key and value properties')

        db = sql_connection()

        # TODO enable filtering based off of this
        # Check for passed in saved search id
        if request.__getattribute__('cohort_id') is not None:
            cohort_id = str(request.cohort_id)
            sample_query_str = 'SELECT sample_id, study_id FROM cohorts_samples WHERE cohort_id=%s;'

            try:
                cursor = db.cursor(MySQLdb.cursors.DictCursor)
                cursor.execute(sample_query_str, (cohort_id,))
                sample_ids = {}

                for row in cursor.fetchall():
                    study_id = row['study_id']
                    if not study_id in sample_ids:
                        sample_ids[study_id] = ()
                    sample_ids[study_id] += (row['sample_id'],)
                cursor.close()

            except (TypeError, IndexError) as e:
                if cursor: cursor.close()
                if db: db.close()
                raise endpoints.NotFoundException('Error in retrieving barcodes.')

        # Add TCGA attributes to the list of available attributes
        if 'user_studies' not in filters or 'tcga' in filters['user_studies']['values']:
            sample_tables['metadata_samples'] = {'features':{}, 'barcode':'SampleBarcode', 'study_id':None}
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute('SELECT attribute, spec FROM metadata_attr')
            for row in cursor.fetchall():
                key = row['spec'] + ':' + row['attribute']
                valid_attrs[key] = {'name': row['attribute']}
                sample_tables['metadata_samples']['features'][key] = row['attribute']
                if key in filters:
                    filters[key]['tables'] += ('metadata_samples',)
            cursor.close()

        # If we have a user, get a list of valid studies
        if user:
            for study in Study.get_user_studies(user):
                if 'user_studies' not in filters or study.id in filters['user_studies']['values']:
                    study_ids += (study.id,)

                    # Add all tables from each study
                    for tables in User_Data_Tables.objects.filter(study=study):
                        sample_tables[tables.metadata_samples_table] = {
                            'features':{},
                            'barcode':'SampleBarcode' if tables.metadata_samples_table is 'metadata_samples' else 'sample_barcode',
                            'study_id': study.id
                        }

                    # Record features that should be in each sample table so we can know how and when we need to query
                    for feature in User_Feature_Definitions.objects.filter(study=study):
                        name = feature.feature_name
                        key = 'study:' + str(study.id) + ':' + name

                        if feature.shared_map_id:
                            key = feature.shared_map_id
                            name = feature.shared_map_id.split(':')[-1]

                        if key not in valid_attrs:
                            valid_attrs[key] = {'name': name}

                        for tables in User_Data_Tables.objects.filter(study=feature.study_id):
                            sample_tables[tables.metadata_samples_table]['features'][key] = feature.feature_name

                            if key in filters:
                                filters[key]['tables'] += (tables.metadata_samples_table,)
        else:
            print "User not authenticated with Metadata Endpoint API"

        # Now that we're through the Studies filtering area, delete it so it doesn't get pulled into a query
        if 'user_studies' in filters:
            del filters['user_studies']

        results = []
        # Loop through the sample tables
        for table, table_settings in sample_tables.items():
            # Make sure we should run the query here, or if we have filters that won't return anything, skip
            should_be_queried = True
            for key, filter in filters.items():
                if table not in filter['tables']:
                    should_be_queried = False
                    break

            if not should_be_queried:
                continue

            where_clause = build_where_clause(filters, table_settings['features'])
            query = 'SELECT DISTINCT %s FROM %s' % (table_settings['barcode'], table)
            if where_clause['query_str']:
                query += ' WHERE ' + where_clause['query_str']
            cursor = db.cursor()
            cursor.execute(query, where_clause['value_tuple'])
            for row in cursor.fetchall():
                study_id = table_settings['study_id']
                if cohort_id and (study_id not in sample_ids or row[0] not in sample_ids[study_id]):
                    # This barcode was not in our cohort's list of barcodes, skip it
                    continue

                results.append( SampleBarcodeItem(sample_barcode=row[0], study_id=table_settings['study_id']) )
            cursor.close()
            db.close()
        return SampleBarcodeList( items=results, count=len(results) )
