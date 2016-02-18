TRUNCATE TABLE genes_genesymbol;
INSERT INTO genes_genesymbol (symbol) 
SELECT DISTINCT t.gene_name
FROM (
SELECT gene_name
FROM feature_defs_cnvr
UNION
SELECT gene_name
FROM feature_defs_gexp
UNION
SELECT gene_name
FROM feature_defs_gnab
UNION
SELECT gene_name
FROM feature_defs_meth
UNION
SELECT gene_name
FROM feature_defs_rppa
) AS t