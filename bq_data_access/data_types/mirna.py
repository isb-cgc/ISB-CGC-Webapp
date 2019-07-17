from django.conf import settings

BIGQUERY_CONFIG = {
    "supported_genomic_builds": ['hg19', 'hg38'],
    "tables": [
        {
            "table_id": "{}:TCGA_hg19_data_v0.miRNAseq_Expression".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "mirna_id_field": "mirna_id",
            "value_label": "RPM",
            "value_field": "reads_per_million_miRNA_mapped",
            "genomic_build": "hg19",
            "program": "tcga",
            "internal_table_id": "tcga_hg19_mirna_rpm"
        },
        {
            "table_id": "{}:TCGA_hg38_data_v0.miRNAseq_Expression".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "mirna_id_field": "mirna_id",
            "value_label": "RPM",
            "value_field": "reads_per_million_miRNA_mapped",
            "genomic_build": "hg38",
            "program": "tcga",
            "internal_table_id": "tcga_hg38_mirna_rpm"
        },
        {
            "table_id": "{}:TARGET_hg38_data_v0.miRNA_Expression".format(settings.BIGQUERY_DATA_PROJECT_ID),
            "mirna_id_field": "mirna_id",
            "value_label": "RPM",
            "value_field": "reads_per_million_miRNA_mapped",
            "genomic_build": "hg38",
            "program": "target",
            "internal_table_id": "target_hg38_mirna_rpm"
        }
    ]
}

