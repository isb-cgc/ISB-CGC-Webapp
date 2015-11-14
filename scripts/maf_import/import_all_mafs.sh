#!/bin/sh

IMPORT_CMD="python $1 test "

$IMPORT_CMD BLCA blca_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD BRCA brca_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD COAD coadread_cleaned.COADonly.maf.ncm.with_uniprot
$IMPORT_CMD READ coadread_cleaned.READonly.maf.ncm.with_uniprot
$IMPORT_CMD GBM gbm_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD HNSC hnsc_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD KIRC kirc_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD LAML laml_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD LUAD luad_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD LUSC lusc_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD OV ov_cleaned.maf.ncm.with_uniprot
$IMPORT_CMD UCEC ucec_cleaned.maf.ncm.with_uniprot