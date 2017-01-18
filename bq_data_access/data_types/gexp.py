BIGQUERY_CONFIG = {
    "version": 2,
    "reference_config": {
        "project_name": "isb-cgc",
        "dataset_name": "platform_reference"
    },
    "target_config": {
        "project_name": "isb-cgc",
        "dataset_name": "2016_07_09_tcga_data_open"
    },
    "gene_label_field": "HGNC_gene_symbol",
    "tables": [
        {
            "table_id": "mRNA_UNC_GA_RSEM",
            "platform": "Illumina GA",
            "generating_center": "UNC",
            "feature_id": "mrna_unc_illumina_ga",
            "value_label": "RSEM",
            "value_field": "normalized_count"
        },
        {
            "table_id": "mRNA_UNC_HiSeq_RSEM",
            "platform": "Illumina HiSeq",
            "generating_center": "UNC",
            "feature_id": "mrna_unc_illumina_hiseq",
            "value_label": "RSEM",
            "value_field": "normalized_count"
        }
    ]
}
