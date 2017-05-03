BIGQUERY_CONFIG = {
    "reference_config": {
        "project_name": "isb-cgc",
        "dataset_name": "platform_reference"
    },
    "supported_genomic_builds": ['hg19', 'hg38'],
    "tables": [
        {
            "table_id": "isb-cgc:TCGA_hg19_data_v0.RNAseq_Gene_Expression_UNC_RSEM",
            "genomic_build": "hg19",
            "platform": "Illumina HiSeq",
            "gene_label_field": "HGNC_gene_symbol",
            "generating_center": "UNC",
            "internal_table_id": "rnaseq_unc_rsem",
            "value_label": "RSEM",
            "value_field": "normalized_count",
            "program": "tcga"
        },
        {
            "table_id": "isb-cgc:TCGA_hg38_data_v0.RNAseq_Gene_Expression",
            "genomic_build": "hg38",
            "platform": "Illumina HiSeq",
            "gene_label_field": "gene_name",
            "generating_center": "GDC",
            "internal_table_id": "rnaseq",
            "value_label": "HTSeq counts",
            "value_field": "HTSeq__Counts",
            "program": "tcga"
        },
        {
            "table_id": "isb-cgc:TARGET_hg38_data_v0.RNAseq_Gene_Expression",
            "genomic_build": "hg38",
            "platform": "Illumina HiSeq",
            "gene_label_field": "gene_name",
            "generating_center": "GDC",
            "internal_table_id": "rnaseq",
            "value_label": "HTSeq counts",
            "value_field": "HTSeq__Counts",
            "program": "target"
        }
    ]
}
