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
    "tables": [
        {
            "name": "miRNA_BCGSC_GA_mirna",
            "info": "miRNA (GA, BCGSC RPM)",
            "platform": "IlluminaGA",
            "feature_id": "mirna_illumina_ga_rpm",
            "value_label": "RPM",
            "value_field": "reads_per_million_miRNA_mapped",
            "expression_table": False
        },
        {
            "name": "miRNA_BCGSC_HiSeq_mirna",
            "info": "miRNA (HiSeq, BCGSC RPM)",
            "platform": "IlluminaHiSeq",
            "feature_id": "mirna_illumina_hiseq_rpm",
            "value_label": "RPM",
            "value_field": "reads_per_million_miRNA_mapped",
            "expression_table": False
        },
        {
            "name": "miRNA_Expression_Values",
            "platform": "both",
            "info": "miRNA Expression",
            "feature_id": "expression",
            "value_label": "normalized_count",
            "value_field": "normalized_count",
            "expression_table": True
        }
    ]
}

