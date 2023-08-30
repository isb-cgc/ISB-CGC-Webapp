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
	dicom.tcia_tumorLocation,
	collex.CancerType,
	dicom.source_DOI,
	dicom.tcia_species,
    dicom.gcs_url,
	dicom.aws_url,
    dicom.Manufacturer,
    dicom.ManufacturerModelName,
    collex.Program AS program,
	REPLACE(collection_id,"-","_") AS collection_id,
    analysis.ID AS analysis_results_id,
	curated_series.illuminationType_code_designator_value_str AS illuminationType,
	curated_series.primaryAnatomicStructure_code_designator_value_str AS primaryAnatomicStructure,
	curated_series.ObjectiveLensPower,
	curated_series.min_PixelSpacing_2sf AS min_PixelSpacing,
	curated_series.max_TotalPixelMatrixColumns,
	curated_series.max_TotalPixelMatrixRows,
	Internal_structure, Sphericity, Calcification, Lobular_Pattern, Spiculation, Margin,
	Texture, Subtlety_score, Malignancy, Volume, Diameter, Surface_area_of_mesh,
	Apparent_Diffusion_Coefficient, segs.AnatomicRegionSequence, SegmentedPropertyCategoryCodeSequence,
	SegmentedPropertyTypeCodeSequence, segs.FrameOfReferenceUID,
	SegmentNumber, SegmentAlgorithmType, Sphericity_quant, Volume_of_Mesh,
    CASE WHEN collection_id LIKE 'tcga_%' THEN "True" ELSE "False" END AS has_related,
    CASE WHEN qual.SOPInstanceUID IS NULL THEN 'False' ELSE 'True' END AS has_qualitative,
    CASE WHEN quan.SOPInstanceUID IS NULL THEN 'False' ELSE 'True' END AS has_quantitative,
    CASE WHEN  segs.AnatomicRegionSequence IS NULL AND SegmentedPropertyCategoryCodeSequence IS NULL
	    AND SegmentedPropertyTypeCodeSequence IS NULL THEN 'False' else 'True' END AS has_segmentation,
    CASE WHEN qual.SOPInstanceUID IS NULL AND quan.SOPInstanceUID IS NULL
	    AND segs.SOPInstanceUID IS NULL THEN 'False' else 'True' END AS has_derived,
    dicom.access AS access,
    REGEXP_EXTRACT(gcs_url, r'^[a-zA-Z0-9-_]+://([a-zA-Z0-9-_]+)/') gcs_bucket,
    REGEXP_EXTRACT(aws_url, r'^[a-zA-Z0-9-_]+://([a-zA-Z0-9-_]+)/') aws_bucket
FROM `idc-pdp-staging.{dataset}.dicom_all` dicom
LEFT JOIN `idc-dev-etl.{dataset}_dev.qualitative_pivot` qual
    ON qual.SOPInstanceUID = dicom.SOPInstanceUID
LEFT JOIN `idc-dev-etl.{dataset}_dev.quantitative_pivot` quan
    ON quan.SOPInstanceUID = dicom.SOPInstanceUID
LEFT JOIN `idc-dev-etl.{dataset}_dev.segmentations_pivot` segs
    ON segs.SOPInstanceUID = dicom.SOPInstanceUID
LEFT JOIN `idc-pdp-staging.{dataset}.original_collections_metadata` collex
    ON collex.idc_webapp_collection_id = dicom.collection_id
LEFT JOIN `idc-pdp-staging.{dataset}.analysis_results_metadata` analysis
    ON LOWER(analysis.DOI) = LOWER(dicom.source_DOI)
LEFT JOIN `idc-pdp-staging.{dataset}.dicom_metadata_curated` curated
    ON curated.SOPInstanceUID = dicom.SOPInstanceUID
LEFT JOIN `idc-pdp-staging.{dataset}.dicom_metadata_curated_series_level_view` curated_series
    ON curated_series.SeriesInstanceUID = dicom.SeriesInstanceUID
;
