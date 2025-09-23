SELECT
	dicom.PatientID,
	curated.BodyPartExamined,
	dicom.SeriesInstanceUID,
	curated.SliceThickness,
	dicom.SamplesPerPixel,
	dicom.SeriesNumber,
	dicom.SeriesDescription,
	dicom.StudyInstanceUID,
	dicom.StudyDescription,
	dicom.StudyDate,
	dicom.SOPInstanceUID,
    dicom.instance_size,
	dicom.Modality,
	dicom.SOPClassUID,
    dicom.license_short_name,
	dicom.crdc_study_uuid AS crdc_study_uuid,
	dicom.crdc_series_uuid AS crdc_series_uuid,
	dicom.crdc_instance_uuid AS crdc_instance_uuid,
	dicom.collection_tumorLocation AS tcia_tumorLocation,
	dicom.collection_cancerType AS CancerType,
	dicom.source_DOI,
	dicom.collection_species AS tcia_species,
    dicom.gcs_url,
	dicom.aws_url,
    dicom.Manufacturer,
    dicom.ManufacturerModelName,
	dicom.gcs_bucket,
	dicom.aws_bucket,
    collex.Program AS program,
	REPLACE(dicom.collection_id,"-","_") AS collection_id,
    analysis.ID AS analysis_results_id,
	curated_series.illuminationType_code_designator_value_str AS illuminationType,
	curated_series.primaryAnatomicStructure_code_designator_value_str AS primaryAnatomicStructure,
	curated_series.ObjectiveLensPower,
	curated_series.min_PixelSpacing_2sf AS min_PixelSpacing,
	curated_series.max_TotalPixelMatrixColumns,
	curated_series.max_TotalPixelMatrixRows,
	Internal_structure,
	Sphericity,
	Calcification,
	Lobular_Pattern,
	Spiculation,
	Margin,
	Texture,
	Subtlety_score,
	Malignancy,
	Volume,
	Diameter,
	Surface_area_of_mesh,
	Apparent_Diffusion_Coefficient,
	segs.AnatomicRegionSequence,
	SegmentedPropertyCategoryCodeSequence,
	SegmentedPropertyTypeCodeSequence,
	segs.FrameOfReferenceUID,
	SegmentNumber,
	SegmentAlgorithmType,
	SegmentAlgorithmName,
	Sphericity_quant,
	Volume_of_Mesh,
CASE WHEN dicom.collection_id LIKE 'tcga_%' THEN "True" ELSE "False" END AS has_related,
CASE WHEN qual.SOPInstanceUID IS NULL THEN 'False' ELSE 'True' END AS has_qualitative,
CASE WHEN quan.SOPInstanceUID IS NULL THEN 'False' ELSE 'True' END AS has_quantitative,
CASE WHEN  segs.AnatomicRegionSequence IS NULL AND SegmentedPropertyCategoryCodeSequence IS NULL
	AND SegmentedPropertyTypeCodeSequence IS NULL THEN 'False' else 'True' END AS has_segmentation,
CASE WHEN qual.SOPInstanceUID IS NULL AND quan.SOPInstanceUID IS NULL
	AND segs.SOPInstanceUID IS NULL THEN 'False' else 'True' END AS has_derived,
  dicom.access AS access
FROM `idc-pdp-staging.{data_version}.dicom_all` dicom
LEFT JOIN `idc-dev-etl.{data_version}_dev.qualitative_pivot` qual
    ON qual.SOPInstanceUID = dicom.SOPInstanceUID
LEFT JOIN `idc-dev-etl.{data_version}_dev.quantitative_pivot` quan
    ON quan.SOPInstanceUID = dicom.SOPInstanceUID
LEFT JOIN `idc-dev-etl.{data_version}_dev.segmentations_pivot` segs
    ON segs.SOPInstanceUID = dicom.SOPInstanceUID
LEFT JOIN `idc-pdp-staging.{data_version}.original_collections_metadata` collex
    ON collex.collection_id = dicom.collection_id
LEFT JOIN `idc-pdp-staging.{data_version}.analysis_results_metadata` analysis
    ON LOWER(analysis.source_doi) = LOWER(dicom.source_doi)
LEFT JOIN `idc-pdp-staging.{data_version}.dicom_metadata_curated` curated
    ON curated.SOPInstanceUID = dicom.SOPInstanceUID
LEFT JOIN `idc-pdp-staging.{data_version}.dicom_metadata_curated_series_level_view` curated_series
    ON curated_series.SeriesInstanceUID = dicom.SeriesInstanceUID
;
