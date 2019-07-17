from django.conf import settings

BIGQUERY_CONFIG = {
    "supported_genomic_builds": ['hg19', 'hg38'],
    "tables": [
        {
            "genomic_build": "hg19",
            "table_id": "{}:TCGA_hg19_data_v0.Somatic_Mutation_MC3".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "gene_label_field": "Hugo_Symbol",
            "internal_table_id": "tcga_hg19_mc3",
            "program": "tcga"
        },
        {
            "genomic_build": "hg38",
            "table_id": "{}:TCGA_hg38_data_v0.Somatic_Mutation".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "gene_label_field": "Hugo_Symbol",
            "internal_table_id": "tcga_hg38",
            "program": "tcga"
        }
    ]
}
