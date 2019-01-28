from django.conf import settings

BIGQUERY_CONFIG = {
    "tables": [
        {
            "gencode_reference_table_id": "isb-cgc:genome_reference.GENCODE_v19",
            "genomic_build": "hg19",
            "value_field": "segment_mean",
            "table_id": "{}:TCGA_hg19_data_v0.Copy_Number_Segment_Masked".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "gene_label_field": "Hugo_Symbol",
            "internal_table_id": "cnvr_masked_hg19",
            "program": "tcga"
        },
        {
            "gencode_reference_table_id": "isb-cgc:genome_reference.GENCODE_v22",
            "genomic_build": "hg38",
            "value_field": "segment_mean",
            "table_id": "{}:TCGA_hg38_data_v0.Copy_Number_Segment_Masked".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "gene_label_field": "Hugo_Symbol",
            "internal_table_id": "cnvr_masked_hg38",
            "program": "tcga"
        }
    ]
}
