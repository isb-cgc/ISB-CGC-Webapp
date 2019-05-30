#
# Copyright 2015-2019, Institute for Systems Biology
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
#

MAF_WITH_UNIPROT_FIELDS = [
    'Hugo_Symbol',
    'Entrez_Gene_Id',
    'Center',
    'NCBI_Build',
    'Chromosome',
    'Start_Position',
    'End_Position',
    'Strand',
    'Variant_Classification',
    'Variant_Type',
    'Reference_Allele',
    'Tumor_Seq_Allele1',
    'Tumor_Seq_Allele2',
    'dbSNP_RS',
    'dbSNP_Val_Status',
    'Tumor_Sample_Barcode',
    'Matched_Norm_Sample_Barcode',
    'Match_Norm_Seq_Allele1',
    'Match_Norm_Seq_Allele2',
    'Tumor_Validation_Allele1',
    'Tumor_Validation_Allele2',
    'Match_Norm_Validation_Allele1',
    'Match_Norm_Validation_Allele2',
    'Verification_Status',
    'Validation_Status',
    'Mutation_Status',
    'Sequencing_Phase',
    'Sequence_Source',
    'Validation_Method',
    'Score',
    'BAM_File',
    'Sequencer',
    'chromosome_name',
    'start',
    'stop',
    'reference',
    'variant',
    'type',
    'gene_name',
    'transcript_name',
    'transcript_species',
    'transcript_source',
    'transcript_version',
    'strand',
    'transcript_status',
    'trv_type',
    'c_position',
    'amino_acid_change',
    'ucsc_cons',
    'domain',
    'all_domains',
    'deletion_substructures',
    'transcript_error',
    'Uniprot Sprot ID',
    'Uniprot Trembl ID',
    'Mutation Annotation (uniprot isoform1)',
    'Mutation Annotation (Others)',
    'ANNOVAR'
]

INCLUDE_FIELDS = [
    'Variant_Classification',
    'Variant_Type',
    'Reference_Allele',
    'Tumor_Seq_Allele1',
    'Tumor_Seq_Allele2',
    'Match_Norm_Seq_Allele1',
    'Match_Norm_Seq_Allele2',
    'Tumor_Sample_Barcode',
    'c_position',
    'ucsc_cons'
]