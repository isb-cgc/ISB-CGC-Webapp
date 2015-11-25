#!/bin/sh

# Copyright 2015, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

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