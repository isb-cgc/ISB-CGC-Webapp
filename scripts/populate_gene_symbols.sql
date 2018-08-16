TRUNCATE TABLE genes_genesymbol;

INSERT INTO genes_genesymbol (symbol,type)
SELECT DISTINCT t.gene_name, 'gene'
FROM (
SELECT DISTINCT gene_name
FROM feature_defs_cnvr
UNION
SELECT DISTINCT gene_name
FROM feature_defs_cnvr_v2
UNION
SELECT DISTINCT gene_name
FROM feature_defs_gexp
UNION
SELECT DISTINCT gene_name
FROM feature_defs_gexp_v2
UNION
SELECT DISTINCT gene_name
FROM feature_defs_gnab
UNION
SELECT DISTINCT gene_name
FROM feature_defs_gnab_v2
UNION
SELECT DISTINCT gene_name
FROM feature_defs_meth
UNION
SELECT DISTINCT gene_name
FROM feature_defs_meth_v2
UNION
SELECT DISTINCT gene_name
FROM feature_defs_rppa
UNION
SELECT DISTINCT gene_name
FROM feature_defs_rppa_v2
) AS t;

INSERT INTO genes_genesymbol (symbol,type)
SELECT DISTINCT t.mirna_name, 'miRNA'
FROM (
SELECT DISTINCT mirna_name
FROM feature_defs_mirn
UNION
SELECT DISTINCT mirna_name
FROM feature_defs_mirn_v3
UNION
SELECT DISTINCT mirna_name
FROM feature_defs_mirna
) as t;