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

# Updated from
# https://github.com/isb-cgc/data-prototyping/blob/537c5c24646f87bda804ca95dee6cf479f0b1fb9/tcga_etl_pipeline/schemas/clinical.json

schema = [
    {
        "type": "STRING",
        "name": "ParticipantBarcode"
    },
    {
        "type": "STRING",
        "name": "Study"
    },
    {
        "type": "STRING",
        "name": "Project"
    },
    {
        "type": "STRING",
        "name": "ParticipantUUID"
    },
    {
        "type": "STRING",
        "name": "TSSCode"
    },
    {
        "type": "INTEGER",
        "name": "age_at_initial_pathologic_diagnosis"
    },
    {
        "type": "STRING",
        "name": "anatomic_neoplasm_subdivision"
    },
    {
        "type": "INTEGER",
        "name": "batch_number"
    },
    {
        "type": "STRING",
        "name": "bcr"
    },
    {
        "type": "STRING",
        "name": "clinical_M"
    },
    {
        "type": "STRING",
        "name": "clinical_N"
    },
    {
        "type": "STRING",
        "name": "clinical_T"
    },
    {
        "type": "STRING",
        "name": "clinical_stage"
    },
    {
        "type": "STRING",
        "name": "colorectal_cancer"
    },
    {
        "type": "STRING",
        "name": "country"
    },
    {
        "type": "STRING",
        "name": "vital_status"
    },
    {
        "type": "INTEGER",
        "name": "days_to_birth"
    },
    {
        "type": "INTEGER",
        "name": "days_to_death"
    },
    {
        "type": "INTEGER",
        "name": "days_to_last_known_alive"
    },
    {
        "type": "INTEGER",
        "name": "days_to_last_followup"
    },
    {
        "type": "INTEGER",
        "name": "days_to_initial_pathologic_diagnosis"
    },
    {
        "type": "INTEGER",
        "name": "days_to_submitted_specimen_dx"
    },
    {
        "type": "STRING",
        "name": "ethnicity"
    },
    {
        "type": "STRING",
        "name": "frozen_specimen_anatomic_site"
    },
    {
        "type": "STRING",
        "name": "gender"
    },
    {
        "type": "FLOAT",
        "name": "gleason_score_combined"
    },
    {
        "type": "STRING",
        "name": "histological_type"
    },
    {
        "type": "STRING",
        "name": "history_of_colon_polyps"
    },
    {
        "type": "STRING",
        "name": "history_of_neoadjuvant_treatment"
    },
    {
        "type": "STRING",
        "name": "hpv_calls"
    },
    {
        "type": "STRING",
        "name": "hpv_status"
    },
    {
        "type": "STRING",
        "name": "icd_10"
    },
    {
        "type": "STRING",
        "name": "icd_o_3_histology"
    },
    {
        "type": "STRING",
        "name": "icd_o_3_site"
    },
    {
        "type": "STRING",
        "name": "lymphatic_invasion"
    },
    {
        "type": "STRING",
        "name": "lymphnodes_examined"
    },
    {
        "type": "STRING",
        "name": "lymphovascular_invasion_present"
    },
    {
        "type": "STRING",
        "name": "menopause_status"
    },
    {
        "type": "STRING",
        "name": "mononucleotide_and_dinucleotide_marker_panel_analysis_status"
    },
    {
        "type": "FLOAT",
        "name": "mononucleotide_marker_panel_analysis_status"
    },
    {
        "type": "STRING",
        "name": "neoplasm_histologic_grade"
    },
    {
        "type": "STRING",
        "name": "new_tumor_event_after_initial_treatment"
    },
    {
        "type": "FLOAT",
        "name": "number_of_lymphnodes_examined"
    },
    {
        "type": "FLOAT",
        "name": "number_of_lymphnodes_positive_by_he"
    },
    {
        "type": "FLOAT",
        "name": "number_pack_years_smoked"
    },
    {
        "type": "INTEGER",
        "name": "year_of_initial_pathologic_diagnosis"
    },
    {
        "type": "STRING",
        "name": "pathologic_M"
    },
    {
        "type": "STRING",
        "name": "pathologic_N"
    },
    {
        "type": "STRING",
        "name": "pathologic_T"
    },
    {
        "type": "STRING",
        "name": "pathologic_stage"
    },
    {
        "type": "STRING",
        "name": "person_neoplasm_cancer_status"
    },
    {
        "type": "STRING",
        "name": "pregnancies"
    },
    {
        "type": "STRING",
        "name": "primary_neoplasm_melanoma_dx"
    },
    {
        "type": "STRING",
        "name": "primary_therapy_outcome_success"
    },
    {
        "type": "STRING",
        "name": "prior_dx"
    },
    {
        "type": "FLOAT",
        "name": "psa_value"
    },
    {
        "type": "STRING",
        "name": "race"
    },
    {
        "type": "STRING",
        "name": "residual_tumor"
    },
    {
        "type": "STRING",
        "name": "tobacco_smoking_history"
    },
    {
        "type": "STRING",
        "name": "tumor_tissue_site"
    },
    {
        "type": "STRING",
        "name": "tumor_type"
    },
    {
        "type": "STRING",
        "name": "venous_invasion"
    },
    {
        "type": "FLOAT",
        "name": "weight"
    },
    {
        "type": "FLOAT",
        "name": "height"
    },
    {
        "type": "FLOAT",
        "name": "BMI"
    }
]