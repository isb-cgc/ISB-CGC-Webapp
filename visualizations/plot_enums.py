from builtins import object
class PlotEnums(object):

    @staticmethod
    def get_friendly_name_map():
        return {
            'disease_code':'Disease Code',
            'gender':'Gender',
            'mirnPlatform':'microRNA expression platform',
            'gexpPlatform':'gene (mRNA) expression platform',
            'methPlatform':'DNA methylation platform',
            'rppaPlatform':'protein quantification platform',
            'cnvrPlatform':'copy-number platform',
            'age_at_initial_pathologic_diagnosis':'age at diagnosis',
            'hsa_miR_146a_5p':'hsa-miR-146a-5p expression (log2[normalized_counts+1])',
            'hsa_miR_7_7p':'hsa-miR-7-5p expression (log2[normalized_counts+1])',
            'CNVR_EGFR':'EGFR copy-number (log2[CN/2])',
            'EGFR_chr7_55086714_55324313':'EGFR expression (log2[normalized_counts+1])',
            'EGFR_chr7_55086714_55324313_EGFR':'EGFR protein quantification',
            'EGFR_chr7_55086288_cg03860890_TSS1500_Island':'EGFR methylation (TSS1500, CpG island)',
            'EGFR_chr7_55086890_cg14094960_5pUTR_Island':"EGFR methylation (5' UTR, CpG island)",
            'EGFR_chr7_55089770_cg10002850_Body_SShore':'EGFR methylation (first intron, cg10002850)',
            'EGFR_chr7_55177623_cg18809076_Body':'EGFR methylation (first intron, cg18809076)'
        }

    @staticmethod
    def get_numerical_attributes():
        return [
            'age_at_initial_pathologic_diagnosis',
            'hsa_miR_146a_5p',
            'hsa_miR_7_7p',
            'CNVR_EGFR',
            'EGFR_chr7_55086714_55324313',
            'EGFR_chr7_55086714_55324313_EGFR',
            'EGFR_chr7_55086288_cg03860890_TSS1500_Island',
            'EGFR_chr7_55086890_cg14094960_5pUTR_Island',
            'EGFR_chr7_55089770_cg10002850_Body_SShore',
            'EGFR_chr7_55177623_cg18809076_Body'
        ]

    @staticmethod
    def get_categorical_attributes():
        return [
            'disease_code',
            'gender',
            'mirnPlatform',
            'gexpPlatform',
            'methPlatform',
            'rppaPlatform',
            'cnvrPlatform'
        ]

    @staticmethod
    def get_fm_friendly_name_map():
        return {
            'percent_lymphocyte_infiltration':'Percent Lymphocyte Infiltration',
            'percent_monocyte_infiltration':'Percent Monocyte Infiltration',
            'percent_necrosis':'Percent Necrosis',
            'percent_neutrophil_infiltration':'Percent Neutrophil Infiltration',
            'percent_normal_cells':'Percent Normal Cells',
            'percent_stromal_cells':'Percent Stromal Cells',
            'percent_tumor_cells':'Percent Tumor Cells',
            'percent_tumor_nuclei':'Percent Tumor Nuclei',
            'age_at_initial_pathologic_diagnosis':'Age at Diagnosis',
            'days_to_birth':'Days to Birth',
            'days_to_initial_pathologic_diagnosis':'Days to Diagnosis',
            'year_of_initial_pathologic_diagnosis':'Year of Diagnosis',
            'days_to_last_known_alive':'Days to Last Known Alive',
            'tumor_necrosis_percent':'Tumor Necrosis Percent',
            'tumor_nuclei_percent':'Tumor Nuclei Percent',
            'tumor_weight':'Tumor Weight',
            'days_to_last_followup':'Days to Last Followup',
            'gender':'Gender',
            'history_of_neoadjuvant_treatment':'History of Neoadjuvant Treatment',
            'icd_o_3_histology':'ICD-O-3 Code',
            'other_dx':'Prior Diagnosis',
            'vital_status':'Vital Status',
            'country':'Country',
            'disease_code':'Disease Code',
            'histological_type':'Histological Type',
            'icd_10':'ICD-10 Category',
            'icd_o_3_site':'ICD-O-3 Site',
            'tumor_tissue_site':'Tumor Tissue Site',
            'tumor_type':'Tumor Type',
            'person_neoplasm_cancer_status':'Neoplasm Cancer Status',
            'pathologic_N':'Pathologic N Stage',
            'radiation_therapy':'Radiation Therapy',
            'pathologic_T':'Pathologic T Stage',
            'race':'Race',
            'ethnicity':'Ethnicity',
            'sampleType':'Sample Type',
            'DNAseq_data':'DNA Sequencing Data',
            'mirnPlatform':'microRNA expression platform',
            'gexpPlatform':'gene (mRNA) expression platform',
            'methPlatform':'DNA methylation platform',
            'rppaPlatform':'protein quantification platform',
            'cnvrPlatform':'copy-number platform',
        }

    @staticmethod
    def get_fm_numerical_attributes() :
        return [
            'percent_lymphocyte_infiltration',
            'percent_monocyte_infiltration',
            'percent_necrosis',
            'percent_neutrophil_infiltration',
            'percent_normal_cells',
            'percent_stromal_cells',
            'percent_tumor_cells',
            'percent_tumor_nuclei',
            'age_at_initial_pathologic_diagnosis',
            'days_to_birth',
            'days_to_initial_pathologic_diagnosis',
            'year_of_initial_pathologic_diagnosis',
            'days_to_last_known_alive',
            'tumor_necrosis_percent',
            'tumor_nuclei_percent',
            'tumor_weight',
            'days_to_last_followup'
        ]

    @staticmethod
    def get_fm_categorical_attributes() :
        return [
            'gender',
            'history_of_neoadjuvant_treatment',
            'icd_o_3_histology',
            'other_dx',
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