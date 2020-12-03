from django.conf import settings

TABLE_TO_SCHEMA_MAP = {
    "{}:TCGA_bioclin_v0.Clinical".format(settings.BIGQUERY_DATA_PROJECT_ID): [
        {
            "mode": "NULLABLE",
            "name": "program_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "project_short_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "project_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "disease_code",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "gender",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "vital_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "race",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ethnicity",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "age_at_diagnosis",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_birth",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_death",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_initial_pathologic_diagnosis",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_last_followup",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_last_known_alive",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_submitted_specimen_dx",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "clinical_stage",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "clinical_T",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "clinical_N",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "clinical_M",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "pathologic_stage",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "pathologic_T",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "pathologic_N",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "pathologic_M",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "year_of_initial_pathologic_diagnosis",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "tumor_tissue_site",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "primary_neoplasm_melanoma_dx",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "anatomic_neoplasm_subdivision",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "country",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "other_dx",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "other_malignancy_anatomic_site",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "other_malignancy_type",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "other_malignancy_histological_type",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "history_of_neoadjuvant_treatment",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "primary_therapy_outcome_success",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "histological_type",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "neoplasm_histologic_grade",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "icd_10",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "icd_o_3_site",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "icd_o_3_histology",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "person_neoplasm_cancer_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "residual_tumor",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "tumor_type",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "new_tumor_event_after_initial_treatment",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "lymphnodes_examined",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "number_of_lymphnodes_examined",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "number_of_lymphnodes_positive_by_he",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "lymphatic_invasion",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "venous_invasion",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "lymphovascular_invasion_present",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "bcr",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "batch_number",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "tss_code",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "age_began_smoking_in_years",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "year_of_tobacco_smoking_onset",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "stopped_smoking_year",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "tobacco_smoking_history",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "number_pack_years_smoked",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "height",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "weight",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "bmi",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "mononucleotide_and_dinucleotide_marker_panel_analysis_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "menopause_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "pregnancies",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "hpv_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "hpv_calls",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "h_pylori_infection",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "gleason_score_combined",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "psa_value",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "colorectal_cancer",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "history_of_colon_polyps",
            "type": "STRING"
        }
    ],
    "{}:TARGET_bioclin_v0.Clinical".format(settings.BIGQUERY_DATA_PROJECT_ID): [
        {
            "mode": "NULLABLE",
            "name": "program_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "project_short_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "project_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "disease_code",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "gender",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "vital_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "race",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ethnicity",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "age_at_diagnosis",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_birth",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_last_followup",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_last_known_alive",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_death",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "protocol",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "year_of_diagnosis",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "year_of_last_follow_up",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "event_free_survival_time_in_days",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "first_event",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "WBC_at_diagnosis",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "MLL_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "CNS_site_of_relapse_or_induction_failure",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "CNS_status_at_diagnosis",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "bone_marrow_site_of_relapse_or_induction_failure",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "other_site_of_relapse_or_induction_failure",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "histology",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "BCR_ABL1_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "BMA_blasts_day_8",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "BMA_blasts_day_15",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "BMA_blasts_day_29",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "BMA_blasts_day_43",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "DNA_index",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "Down_syndrome",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "MRD_at_end_of_course_1",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "MRD_at_end_of_course_1_YN",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "MRD_at_end_of_course_2",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "MRD_at_end_of_course_2_YN",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "MRD_day_8",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "MRD_day_29",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "MRD_day_43",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "MRD_end_consolidation",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "cell_of_origin",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "testes_site_of_relapse",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "testicular_involvement",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "comment",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "trisomies_4_10_Status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ETV6_RUNX1_fusion_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "karyotype",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "TCF3_PBX1_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "COG_risk_group",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ICDO_description",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "INSS_stage",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "MYCN_status",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ICDO",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "diagnostic_category",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ploidy",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "CEBPA_mutation",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "CNS_disease",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "CR_status_at_end_of_course_1",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "CR_status_at_end_of_course_2",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "FLT3_ITD_positive",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "FLT3_PM",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ISCN",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "MKI",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "NPM_mutation",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "WT1_mutation",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "bone_marrow_leukemic_blast_percentage",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "chloroma",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "cytogenetic_complexity",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "del5q",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "del7q",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "del9q",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "grade",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "inv_16",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "minus_X",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "minus_Y",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "monosomy_5",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "monosomy_7",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "peripheral_blasts_pct",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "primary_cytogenetic_code",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "risk_group",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "t_10_11_p11_2_q23",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "t_11_19_q23_p13_1",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "t_3_5_q25_q34",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "t_6_11_q27_q23",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "t_6_9",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "t_8_21",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "t_9_11_p22_q23",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "trisomy_8",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "trisomy_21",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "FAB_category",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "SCT_in_1st_CR",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "percent_tumor",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ICD_O_3_M",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ICD_O_3_T",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "stage",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "discovery_or_validation",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "ALL_mol_subtype",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "chloroma_site_of_relapse_or_induction_failure",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "cytogenetic_site_of_relapse_or_induction_failure",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "percent_necrosis",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "percent_tumor_vs_stroma",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "site_of_relapse",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "alternate_therapy",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "c_Kit_mutation_exon8",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "c_Kit_mutation_exon17",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "cytogenetic_code_other",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "disease_at_diagnosis",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "primary_tumor_site",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "specific_tumor_site",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "time_to_first_event_in_days",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "FLT3_ITD_allelic_ratio",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "definitive_surgery",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "histologic_response",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "reason_for_death",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "specific_tumor_region",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "specific_tumor_side",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "time_to_first_relapse_in_days",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "alternate_therapy_other",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "metastasis_site",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "primary_site_progression",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "refractory_timepoint_sent_for_induction_failure_project",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "relapse_percent_necrosis",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "relapse_percent_tumor",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "relapse_type",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "therapy",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "time_to_first_SMN_in_days",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "time_to_first_enrollment_on_relapse_protocol_in_days",
            "type": "INTEGER"
        }
    ],
    "{}:TARGET_bioclin_v0.Biospecimen".format(settings.BIGQUERY_DATA_PROJECT_ID): [
        {
            "mode": "NULLABLE",
            "name": "sample_type",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "sample_type_name",
            "type": "STRING"
        },
    ],
    "{}:TCGA_bioclin_v0.Biospecimen".format(settings.BIGQUERY_DATA_PROJECT_ID): [
        {
            "mode": "NULLABLE",
            "name": "sample_type",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "sample_type_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "program_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "project_short_name",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "batch_number",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "bcr",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_collection",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "days_to_sample_procurement",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "is_ffpe",
            "type": "STRING"
        },
        {
            "mode": "NULLABLE",
            "name": "num_portions",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "num_slides",
            "type": "INTEGER"
        },
        {
            "mode": "NULLABLE",
            "name": "avg_percent_lymphocyte_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "avg_percent_monocyte_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "avg_percent_necrosis",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "avg_percent_neutrophil_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "avg_percent_normal_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "avg_percent_stromal_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "avg_percent_tumor_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "avg_percent_tumor_nuclei",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "max_percent_lymphocyte_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "max_percent_monocyte_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "max_percent_necrosis",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "max_percent_neutrophil_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "max_percent_normal_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "max_percent_stromal_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "max_percent_tumor_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "max_percent_tumor_nuclei",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "min_percent_lymphocyte_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "min_percent_monocyte_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "min_percent_necrosis",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "min_percent_neutrophil_infiltration",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "min_percent_normal_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "min_percent_stromal_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "min_percent_tumor_cells",
            "type": "FLOAT"
        },
        {
            "mode": "NULLABLE",
            "name": "min_percent_tumor_nuclei",
            "type": "FLOAT"
        }
    ],
    "{}:BEATAML1_0_bioclin_v0.r26_BEATAML1_0_clinical".format(settings.BIGQUERY_DATA_PROJECT_ID): [
        {
            "type": "STRING",
            "name": "tissue_or_organ_of_origin",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "entity_type",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "project_id",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "gender",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "category",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "primary_diagnosis",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "site_of_resection_or_biopsy",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "last_known_disease_status",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "tumor_stagae",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "primary_site",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "entity_id",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "tumor_grade",
            "mode": "NULLABLE"
        },
        {
            "type": "INTEGER",
            "name": "age_at_diagnosis",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "progression_or_recurrence",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "diagnosis_id",
            "mode": "NULLABLE"
        },
        {
            "type": "INTEGER",
            "name": "age_at_index",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "demographic_id",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "status",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "vital_status",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "name",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "race",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "classification",
            "mode": "NULLABLE"
        },

        {
            "type": "STRING",
            "name": "annotation_id",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "case_barcode",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "morphology",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "case_gdc_id",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "ethnicity",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "notes",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "disease_type",
            "mode": "NULLABLE"
        },
        {
            "type": "INTEGER",
            "name": "age_at_diagnosis_days",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "disease_code",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "program_name",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "project_short_name",
            "mode": "NULLABLE"
        }
    ],
    "{}:BEATAML1_0_bioclin_v0.r26_BEATAML1_0_biospecimen_ref".format(settings.BIGQUERY_DATA_PROJECT_ID): [
        {
            "type": "STRING",
            "name": "program_name",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "project_short_name",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "case_gdc_id",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "case_barcode",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "sample_gdc_id",
            "mode": "NULLABLE"
        },
        {
            "type": "STRING",
            "name": "sample_barcode",
            "mode": "NULLABLE"
        }
    ]
}
