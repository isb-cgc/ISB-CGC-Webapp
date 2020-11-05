CREATE TABLE `BEATAML_metadata_attrs` (
  `metadata_attrs_id` int(11) NOT NULL AUTO_INCREMENT,
  `attribute` varchar(70) NOT NULL,
  `code` varchar(1) NOT NULL,
  `spec` varchar(4) NOT NULL,
  PRIMARY KEY (`metadata_attrs_id`),
  KEY `BEATAML_metadata_attrs1` (`attribute`),
  KEY `BEATAML_metadata_attrs2` (`code`),
  KEY `BEATAML_metadata_attrs3` (`spec`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8;


CREATE TABLE `BEATAML_metadata_biospecimen` (
  `metadata_biospecimen_id` int(11) NOT NULL AUTO_INCREMENT,
  `program_name` varchar(30) DEFAULT NULL,
  `project_short_name` varchar(30) DEFAULT NULL,
  `endpoint_type` varchar(10) DEFAULT NULL,
  `sample_gdc_id` varchar(36) DEFAULT NULL,
  `sample_barcode` varchar(40) DEFAULT NULL,
  `case_gdc_id` varchar(36) DEFAULT NULL,
  `case_barcode` varchar(40) DEFAULT NULL,
  PRIMARY KEY (`metadata_biospecimen_id`),
  KEY `BEATAML_metadata_biospecimen1` (`program_name`),
  KEY `BEATAML_metadata_biospecimen2` (`project_short_name`),
  KEY `BEATAML_metadata_biospecimen3` (`endpoint_type`),
  KEY `BEATAML_metadata_biospecimen4` (`sample_gdc_id`),
  KEY `BEATAML_metadata_biospecimen5` (`sample_barcode`),
  KEY `BEATAML_metadata_biospecimen6` (`case_gdc_id`),
  KEY `BEATAML_metadata_biospecimen7` (`case_barcode`)
) ENGINE=InnoDB AUTO_INCREMENT=954 DEFAULT CHARSET=utf8;


CREATE TABLE `BEATAML_metadata_clinical` (
  `metadata_clinical_id` int(11) NOT NULL AUTO_INCREMENT,
  `endpoint_type` varchar(10) DEFAULT NULL,
  `case_gdc_id` varchar(36) NOT NULL,
  `case_barcode` varchar(40) NOT NULL,
  `program_name` varchar(30) DEFAULT NULL,
  `project_short_name` varchar(30) DEFAULT NULL,
  `summary_file_count` int(11) DEFAULT NULL,
  `disease_code` varchar(30) DEFAULT NULL,
  `disease_type` varchar(30) DEFAULT NULL,
  `morphology` varchar(30) DEFAULT NULL,
  `status` varchar(30) DEFAULT NULL,
  `demographic_id` varchar(50) DEFAULT NULL,
  `diagnosis_id` varchar(50) DEFAULT NULL,
  `tumor_grade` varchar(30) DEFAULT NULL,
  `primary_site` varchar(80) DEFAULT NULL,
  `vital_status` varchar(10) DEFAULT NULL,
  `notes` varchar(300) DEFAULT NULL,
  `last_known_disease_status` varchar(20) DEFAULT NULL,
  `ethnicity` varchar(30) DEFAULT NULL,
  `age_at_index` int(3) DEFAULT NULL,
  `annotation_id` varchar(40) DEFAULT NULL,
  `age_at_diagnosis` int(11) DEFAULT NULL,
  `primary_diagnosis` varchar(100) DEFAULT NULL,
  `tissue_or_organ_of_origin` varchar(30) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `site_of_resection_or_biopsy` varchar(30) DEFAULT NULL,
  `race` varchar(30) DEFAULT NULL,
  `progression_or_recurrence` varchar(10) DEFAULT NULL,
  `category` varchar(10) DEFAULT NULL,
  `tumor_stage` varchar(30) DEFAULT NULL,
  `classification` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`metadata_clinical_id`),
  KEY `BEATAML_metadata_clinical1` (`endpoint_type`),
  KEY `BEATAML_metadata_clinical2` (`case_gdc_id`),
  KEY `BEATAML_metadata_clinical3` (`case_barcode`),
  KEY `BEATAML_metadata_clinical4` (`program_name`),
  KEY `BEATAML_metadata_clinical5` (`project_short_name`),
  KEY `BEATAML_metadata_clinical6` (`summary_file_count`),
  KEY `BEATAML_metadata_clinical7` (`disease_type`),
  KEY `BEATAML_metadata_clinical8` (`disease_code`),
  KEY `BEATAML_metadata_clinical9` (`morphology`),
  KEY `BEATAML_metadata_clinical10` (`status`),
  KEY `BEATAML_metadata_clinical11` (`demographic_id`),
  KEY `BEATAML_metadata_clinical12` (`diagnosis_id`),
  KEY `BEATAML_metadata_clinical13` (`tumor_grade`),
  KEY `BEATAML_metadata_clinical14` (`primary_site`),
  KEY `BEATAML_metadata_clinical15` (`vital_status`),
  KEY `BEATAML_metadata_clinical16` (`notes`),
  KEY `BEATAML_metadata_clinical17` (`last_known_disease_status`),
  KEY `BEATAML_metadata_clinical18` (`ethnicity`),
  KEY `BEATAML_metadata_clinical19` (`age_at_index`),
  KEY `BEATAML_metadata_clinical20` (`annotation_id`),
  KEY `BEATAML_metadata_clinical21` (`age_at_diagnosis`),
  KEY `BEATAML_metadata_clinical22` (`primary_diagnosis`),
  KEY `BEATAML_metadata_clinical23` (`tissue_or_organ_of_origin`),
  KEY `BEATAML_metadata_clinical25` (`gender`),
  KEY `BEATAML_metadata_clinical26` (`site_of_resection_or_biopsy`),
  KEY `BEATAML_metadata_clinical27` (`race`),
  KEY `BEATAML_metadata_clinical28` (`progression_or_recurrence`),
  KEY `BEATAML_metadata_clinical29` (`category`),
  KEY `BEATAML_metadata_clinical30` (`tumor_stage`),
  KEY `BEATAML_metadata_clinical31` (`classification`)
) ENGINE=InnoDB AUTO_INCREMENT=951 DEFAULT CHARSET=utf8;


CREATE TABLE `BEATAML_metadata_data_HG38_r24` (
  `file_gdc_id` varchar(36) DEFAULT NULL,
  `case_gdc_id` varchar(36) DEFAULT NULL,
  `case_barcode` varchar(35) NOT NULL,
  `sample_gdc_id` varchar(45) DEFAULT NULL,
  `sample_barcode` varchar(45) DEFAULT NULL,
  `sample_type_name` varchar(60) DEFAULT NULL,
  `project_short_name` varchar(40) NOT NULL,
  `disease_code` varchar(30) DEFAULT NULL,
  `program_name` varchar(40) NOT NULL,
  `data_type` varchar(35) NOT NULL,
  `data_category` varchar(30) NOT NULL,
  `experimental_strategy` varchar(50) DEFAULT NULL,
  `type` varchar(40) DEFAULT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `data_format` varchar(10) NOT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `file_name_key` varchar(300) DEFAULT NULL,
  `index_file_id` varchar(36) DEFAULT NULL,
  `index_file_name_key` varchar(200) DEFAULT NULL,
  `index_file_size` bigint(20) DEFAULT NULL,
  `access` varchar(10) NOT NULL,
  `acl` varchar(25) DEFAULT NULL,
  KEY `BEATAML_metadata_data_HG381` (`file_gdc_id`),
  KEY `BEATAML_metadata_data_HG382` (`case_gdc_id`),
  KEY `BEATAML_metadata_data_HG383` (`case_barcode`),
  KEY `BEATAML_metadata_data_HG384` (`sample_gdc_id`),
  KEY `BEATAML_metadata_data_HG385` (`sample_barcode`),
  KEY `BEATAML_metadata_data_HG386` (`sample_type_name`),
  KEY `BEATAML_metadata_data_HG387` (`project_short_name`),
  KEY `BEATAML_metadata_data_HG388` (`disease_code`),
  KEY `BEATAML_metadata_data_HG389` (`program_name`),
  KEY `BEATAML_metadata_data_HG3810` (`data_type`),
  KEY `BEATAML_metadata_data_HG3811` (`data_category`),
  KEY `BEATAML_metadata_data_HG3812` (`experimental_strategy`),
  KEY `BEATAML_metadata_data_HG3813` (`type`),
  KEY `BEATAML_metadata_data_HG3814` (`file_size`),
  KEY `BEATAML_metadata_data_HG3815` (`data_format`),
  KEY `BEATAML_metadata_data_HG3816` (`platform`),
  KEY `BEATAML_metadata_data_HG3817` (`file_name_key`),
  KEY `BEATAML_metadata_data_HG3818` (`index_file_id`),
  KEY `BEATAML_metadata_data_HG3819` (`index_file_size`),
  KEY `BEATAML_metadata_data_HG3820` (`access`),
  KEY `BEATAML_metadata_data_HG3821` (`acl`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE `BEATAML_metadata_data_type_availability` (
  `metadata_data_type_availability_id` int(11) NOT NULL AUTO_INCREMENT,
  `genomic_build` varchar(4) NOT NULL,
  `isb_label` varchar(40) NOT NULL,
  PRIMARY KEY (`metadata_data_type_availability_id`),
  UNIQUE KEY `BEATAML_metadata_data_type_availability_nkey` (`genomic_build`,`isb_label`),
  KEY `BEATAML_metadata_data_type_availability1` (`genomic_build`),
  KEY `BEATAML_metadata_data_type_availability2` (`isb_label`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8;


CREATE TABLE `BEATAML_metadata_project` (
  `metadata_project_id` int(11) NOT NULL AUTO_INCREMENT,
  `project_short_name` varchar(40) NOT NULL,
  `name` varchar(100) NOT NULL,
  `program_name` varchar(40) DEFAULT NULL,
  `primary_site` varchar(50) DEFAULT NULL,
  `dbgap_accession_number` varchar(12) DEFAULT NULL,
  `disease_type` varchar(120) DEFAULT NULL,
  `summary_case_count` int(11) DEFAULT NULL,
  `summary_file_count` int(11) DEFAULT NULL,
  `summary_file_size` bigint(20) DEFAULT NULL,
  `endpoint_type` varchar(8) DEFAULT NULL,
  PRIMARY KEY (`metadata_project_id`),
  KEY `BEATAML_metadata_project1` (`project_short_name`),
  KEY `BEATAML_metadata_project2` (`name`),
  KEY `BEATAML_metadata_project3` (`program_name`),
  KEY `BEATAML_metadata_project4` (`primary_site`),
  KEY `BEATAML_metadata_project5` (`dbgap_accession_number`),
  KEY `BEATAML_metadata_project6` (`disease_type`),
  KEY `BEATAML_metadata_project7` (`summary_case_count`),
  KEY `BEATAML_metadata_project8` (`summary_file_count`),
  KEY `BEATAML_metadata_project9` (`summary_file_size`),
  KEY `BEATAML_metadata_project10` (`endpoint_type`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8;


CREATE TABLE `BEATAML_metadata_sample_data_availability` (
  `metadata_data_type_availability_id` int(11) NOT NULL,
  `sample_barcode` varchar(40) NOT NULL,
  `count` int(11) NOT NULL,
  KEY `BEATAML_metadata_sample_data_availability1` (`metadata_data_type_availability_id`,`sample_barcode`),
  KEY `BEATAML_metadata_sample_data_availability2` (`sample_barcode`),
  KEY `BEATAML_metadata_sample_data_availability3` (`count`),
  CONSTRAINT `fk_BEAT_metadata_data_type_availability_BEAT_metadata_sample_dat` FOREIGN KEY (`metadata_data_type_availability_id`) REFERENCES `BEATAML_metadata_data_type_availability` (`metadata_data_type_availability_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


CREATE TABLE `BEATAML_metadata_samples` (
  `metadata_samples_id` int(11) NOT NULL AUTO_INCREMENT,
  `case_gdc_id` varchar(36) DEFAULT NULL,
  `case_barcode` varchar(45) NOT NULL,
  `sample_gdc_id` varchar(45) NOT NULL,
  `sample_barcode` varchar(45) NOT NULL,
  `program_name` varchar(30) DEFAULT NULL,
  `disease_type` varchar(30) DEFAULT NULL,
  `disease_code` varchar(30) DEFAULT NULL,
  `morphology` varchar(30) DEFAULT NULL,
  `tumor_grade` varchar(30) DEFAULT NULL,
  `primary_site` varchar(80) DEFAULT NULL,
  `project_id` varchar(40) DEFAULT NULL,
  `project_short_name` varchar(40) DEFAULT NULL,
  `vital_status` varchar(10) DEFAULT NULL,
  `last_known_disease_status` varchar(20) DEFAULT NULL,
  `ethnicity` varchar(30) DEFAULT NULL,
  `age_at_index` int(3) DEFAULT NULL,
  `age_at_diagnosis` int(11) DEFAULT NULL,
  `primary_diagnosis` varchar(100) DEFAULT NULL,
  `tissue_or_organ_of_origin` varchar(30) DEFAULT NULL,
  `name` varchar(100) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `site_of_resection_or_biopsy` varchar(30) DEFAULT NULL,
  `race` varchar(30) DEFAULT NULL,
  `progression_or_recurrence` varchar(10) DEFAULT NULL,
  `tumor_stage` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`metadata_samples_id`),
  UNIQUE KEY `BEATAML_metadata_samples_nkey` (`sample_barcode`),
  KEY `BEATAML_metadata_samples1` (`case_gdc_id`),
  KEY `BEATAML_metadata_samples2` (`case_barcode`),
  KEY `BEATAML_metadata_samples3` (`sample_gdc_id`),
  KEY `BEATAML_metadata_samples4` (`sample_barcode`),
  KEY `BEATAML_metadata_samples25` (`program_name`),
  KEY `BEATAML_metadata_samples5` (`disease_type`),
  KEY `BEATAML_metadata_samples6` (`disease_code`),
  KEY `BEATAML_metadata_samples7` (`morphology`),
  KEY `BEATAML_metadata_samples8` (`tumor_grade`),
  KEY `BEATAML_metadata_samples9` (`primary_site`),
  KEY `BEATAML_metadata_samples10` (`project_id`),
  KEY `BEATAML_metadata_samples11` (`project_short_name`),
  KEY `BEATAML_metadata_samples12` (`vital_status`),
  KEY `BEATAML_metadata_samples13` (`last_known_disease_status`),
  KEY `BEATAML_metadata_samples14` (`ethnicity`),
  KEY `BEATAML_metadata_samples15` (`age_at_index`),
  KEY `BEATAML_metadata_samples16` (`age_at_diagnosis`),
  KEY `BEATAML_metadata_samples17` (`primary_diagnosis`),
  KEY `BEATAML_metadata_samples18` (`tissue_or_organ_of_origin`),
  KEY `BEATAML_metadata_samples19` (`name`),
  KEY `BEATAML_metadata_samples20` (`gender`),
  KEY `BEATAML_metadata_samples21` (`site_of_resection_or_biopsy`),
  KEY `BEATAML_metadata_samples22` (`race`),
  KEY `BEATAML_metadata_samples23` (`progression_or_recurrence`),
  KEY `BEATAML_metadata_samples24` (`tumor_stage`)
) ENGINE=InnoDB AUTO_INCREMENT=1365 DEFAULT CHARSET=utf8;


INSERT INTO `BEATAML_metadata_project` (`project_short_name`, `name`, `program_name`, `primary_site`, `dbgap_accession_number`, `endpoint_type`) VALUES ('BEATAML1.0-COHORT', 'Functional Genomic Landscape of Acute Myeloid Leukemia', 'BEATAML 1.0', 'Hematopoietic and reticuloendothelial systems', 'phs001657', 'current');
INSERT INTO `BEATAML_metadata_project` (`project_short_name`, `name`, `program_name`, `primary_site`, `dbgap_accession_number`, `endpoint_type`) VALUES ('BEATAML1.0-CRENOLANIB', 'Clinical Resistance to Crenolanib in Acute Myeloid Leukemia Due to Diverse Molecular Mechanisms', 'BEATAML 1.0', 'Hematopoietic and reticuloendothelial systems', 'phs001628', 'current');


INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('disease_type', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('primary_site', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('project_id', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('vital_status', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('ethnicity', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('age_at_index', 'N', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('age_at_diagnosis', 'N', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('primary_diagnosis', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('tissue_or_organ_of_origin', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('project_short_name', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('gender', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('race', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('progression_or_recurrence', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('tumor_stage', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('disease_code', 'C', 'CLIN');
INSERT INTO `BEATAML_metadata_attrs`(`attribute`,`code`,`spec`) VALUES ('program_name', 'C', 'CLIN');


INSERT INTO `projects_public_data_tables`
(
`build`,
`data_table`,
`program_id`,
`bq_dataset`)
VALUES
(
'HG38',
'BEATAML_metadata_data_HG38_r24',
295,
'BEATAML_hg38_data_v0');


INSERT INTO `projects_public_metadata_tables`
(`samples_table`, `attr_table`, `clin_table`, `biospec_table`, `sample_data_availability_table`, `sample_data_type_availability_table`, `data_tables_id`, `program_id`, `projects_table`, `biospec_bq_table`, `bq_dataset`, `clin_bq_table`)
VALUES
( 'BEATAML_metadata_samples',
'BEATAML_metadata_attrs',
'BEATAML_metadata_clinical',
'BEATAML_metadata_biospecimen',
'BEATAML_metadata_sample_data_availability',
'BEATAML_metadata_data_type_availability',
6,
295,
'BEATAML_metadata_project',
'beataml_biospecimen_r25',
'BEATAML1_0_bioclin_v0',
'beataml_clin_r25');



INSERT INTO `attr_value_display`
(`attr_name`,
`value_name`,
`display_string`,
`preformatted`,
`program_id`)
VALUES
('program_name', NULL, 'Program', '1', 295);





delete from projects_attribute_data_sources
where id in( 760, 770, 772, 784, 808,822,834)
;
select pads.id from projects_attribute_data_sources pads, projects_attribute pa
where
pa.id = pads.attribute_id
and pads.datasource_id in(

SELECT
-- *
datasource_id
FROM projects_datasource_programs pdp, projects_datasource pds
where pdp.program_id = 4

and pdp.datasource_id = pds.id
and pds.version_id = 8
and pds.source_type = 'S'

)
and pa.name not in
('program_name',
'project_short_name',
'vital_status',
'gender',
'age_at_diagnosis',
'race',
'ethnicity',
'progression_or_recurrence',
'primary_diagnosis',
'category',
'age_at_index',
'tissue_or_organ_of_origin',
'disease_type',
'morphology',
'primary_site',
'tumor_stage',
'classification',
'case_barcode',
'case_gdc_id',
'annotation_id',
'diagnosis_id',
'demographic_id',
'age_at_diagnosis_days'
)
)

;
-- mysqldump -u root -p dev BEATAML_metadata_samples > beataml_metadata_samples.sql
-- mysqldump -u root -p dev BEATAML_metadata_data_HG38_r24 > beataml_metadata_hg38_r24.sql

-- IMPORT BEATAML_metadata_data_HG38_r24 DATA: 1) FROM METADATA_HG38_R24.CSV FILE REPLACE ALL ', ' TO '% '   2) IMPORT CSV FILE TO BEATAML_metadata_data_HG38_r24: deselect project_short_name_suffix  3) REPLACE BACK ALL '% ' TO ', '
-- IMPORT BEATAML_metadata_samples DATA: 1) FROM BIOSPECIMEN.CSV FILE
---
--INSERT INTO `projects_attribute_ranges` (`type`, `include_lower`, `include_upper`, `unbounded`, `first`, `last`, `gap`, `attribute_id`, `unit`) VALUES ('I', '1', '0', '1', '10', '80', '10', '<age_at_index attribute id>', '1');

