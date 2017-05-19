BIGQUERY_CONFIG = {
    "supported_genomic_builds": ['hg19'],
    "tables": [
        {
            "genomic_build": "hg19",
            "table_id": "isb-cgc:TCGA_hg19_data_v0.Somatic_Mutation_MC3",
            "gene_label_field": "Hugo_Symbol",
            "internal_table_id": "tcga_hg19_mc3",
            "program": "tcga",
            "case_barcode_field": "case_barcode",
            "sample_barcode_tumor_field": "sample_barcode_tumor",
            "aliquot_barcode_tumor_field": "aliquot_barcode_tumor"
        },
        {
            "genomic_build": "hg38",
            "table_id": "isb-cgc:TCGA_hg38_data_v0.Somatic_Mutation",
            "gene_label_field": "Hugo_Symbol",
            "internal_table_id": "tcga_hg38",
            "program": "tcga",
            "case_barcode_field": "Matched_Norm_Sample_Barcode",
            "sample_barcode_tumor_field": "Matched_Norm_Sample_Barcode",
            "aliquot_barcode_tumor_field": "Tumor_Sample_Barcode"
        }
    ]
}
