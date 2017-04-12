BIGQUERY_CONFIG = {
    "reference_config": {
        "project_name": "isb-cgc",
        "dataset_name": "platform_reference"
    },
    "supported_platform_versions": ['hg19', 'hg38'],
    "tables": [
        {
            "table_id": "isb-cgc:TCGA_hg19_data_v0.RNAseq_Gene_Expression_UNC_RSEM",
            "platform_version": "hg19",
            "platform": "Illumina HiSeq",
            "gene_label_field": "gene_name",
            "generating_center": "UNC",
            "internal_table_id": "rnaseq_unc_rsem",
            "value_label": "RSEM",
            "value_field": "normalized_count",
            "project": "tcga"
        },
        {
            "table_id": "isb-cgc:TCGA_hg38_data_v0.RNAseq_Gene_Expression",
            "platform_version": "hg38",
            "platform": "Illumina HiSeq",
            "gene_label_field": "gene_name",
            "generating_center": "UNC",
            "internal_table_id": "rnaseq",
            "value_label": "RSEM",
            "value_field": "normalized_count",
            "project": "tcga"
        },
        {
            "table_id": "isb-cgc:TARGET_hg38_data_v0.RNAseq_Gene_Expression",
            "platform_version": "hg38",
            "platform": "Illumina HiSeq",
            "gene_label_field": "gene_name",
            "generating_center": "TARGET",
            "internal_table_id": "rnaseq",
            "value_label": "RSEM",
            "value_field": "normalized_count",
            "project": "target"
        }
    ]
}
