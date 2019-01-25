from django.conf import settings

BIGQUERY_CONFIG = {
    "supported_genomic_builds": ['hg19', 'hg38'],
    "tables": [
        {
            "table_id": "{}:TCGA_hg19_data_v0.Protein_Expression".format(settings.BIGQUERY_DATA_PROJECT_NAME),
            "gene_label_field": "gene_name",
            "value_field": "protein_expression",
            "internal_table_id": "hg19_protein_expression",
            "genomic_build": "hg19",
            "program": "tcga"
        },
        {
            "table_id": "{}:TCGA_hg38_data_v0.Protein_Expression".format(settings.BIGQUERY_DATA_PROJECT_NAME),
            "gene_label_field": "gene_name",
            "value_field": "protein_expression",
            "internal_table_id": "hg38_protein_expression",
            "genomic_build": "hg38",
            "program": "tcga"
        }
    ]
}

