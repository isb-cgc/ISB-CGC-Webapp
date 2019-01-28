from django.conf import settings

BIGQUERY_CONFIG = {
    "methylation_annotation_table_id": "isb-cgc:platform_reference.methylation_annotation",
    "supported_genomic_builds": ['hg19', 'hg38'],
    "table_structure": [
        {
            "table_id_prefix": "{}:TCGA_hg19_data_v0.DNA_Methylation_chr".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "genomic_build": "hg19",
            "value_field": "beta_value",
            "program": "tcga"
        },
        {
            "table_id_prefix": "{}:TCGA_hg38_data_v0.DNA_Methylation_chr".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "genomic_build": "hg38",
            "value_field": "beta_value",
            "program": "tcga"
        }
    ]
}
