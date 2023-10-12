-- sct_to_srt_map = idc-dev-etl.smp_scratch.sct_to_srt_map
WITH ars AS (
	SELECT PatientID, SOPInstanceUID, 
	COALESCE(CAST(map.Concept_ID__SCT_ AS STRING), 
	segs.AnatomicRegion.CodeValue) AS AnatomicRegionSequence,
	segs.AnatomicRegion.CodeMeaning AS AnatomicRegion,
	FrameOfReferenceUID,
	SegmentNumber,
	SegmentAlgorithmType
	FROM `idc-pdp-staging.{dataset}.segmentations` segs
	JOIN `{sct_to_srt_map}` map
	ON map.SNOMED_ID__SRT_ = segs.AnatomicRegion.CodeValue
	UNION DISTINCT
	SELECT PatientID, SOPInstanceUID, 
	COALESCE(CAST(map.Concept_ID__SCT_ AS STRING), 
	segs.AnatomicRegion.CodeValue) AS AnatomicRegionSequence,
	segs.AnatomicRegion.CodeMeaning AS AnatomicRegion,
	FrameOfReferenceUID,
	SegmentNumber,
	SegmentAlgorithmType
	FROM `idc-pdp-staging.{dataset}.segmentations` segs
	JOIN `{sct_to_srt_map}` map
	ON CAST(map.Concept_ID__SCT_ AS STRING) = segs.AnatomicRegion.CodeValue
)
, spc AS (
	SELECT PatientID, SOPInstanceUID, 
	COALESCE(CAST(map.Concept_ID__SCT_ AS STRING), 
	segs.SegmentedPropertyCategory.CodeValue) AS SegmentedPropertyCategoryCodeSequence,
	segs.SegmentedPropertyCategory.CodeMeaning AS SegmentedPropertyCategory,
	FrameOfReferenceUID,
	SegmentNumber,
	SegmentAlgorithmType
	FROM `idc-pdp-staging.{dataset}.segmentations` segs
	JOIN `{sct_to_srt_map}` map
	ON map.SNOMED_ID__SRT_ = segs.SegmentedPropertyCategory.CodeValue
	UNION DISTINCT
	SELECT PatientID, SOPInstanceUID, 
	COALESCE(CAST(map.Concept_ID__SCT_ AS STRING), 
	segs.SegmentedPropertyCategory.CodeValue) AS SegmentedPropertyCategoryCodeSequence,
	segs.SegmentedPropertyCategory.CodeMeaning AS SegmentedPropertyCategory,
	FrameOfReferenceUID,
	SegmentNumber,
	SegmentAlgorithmType
	FROM `idc-pdp-staging.{dataset}.segmentations` segs
	JOIN `{sct_to_srt_map}` map
	ON CAST(map.Concept_ID__SCT_ AS STRING) = segs.SegmentedPropertyCategory.CodeValue
)
, spt AS (
	SELECT PatientID, SOPInstanceUID, 
	COALESCE(CAST(map.Concept_ID__SCT_ AS STRING), 
	segs.SegmentedPropertyType.CodeValue) AS SegmentedPropertyTypeCodeSequence,
	segs.SegmentedPropertyType.CodeMeaning AS SegmentedPropertyType,
	FrameOfReferenceUID,
	SegmentNumber,
	SegmentAlgorithmType
	FROM `idc-pdp-staging.{dataset}.segmentations` segs
	JOIN `{sct_to_srt_map}` map
	ON map.SNOMED_ID__SRT_ = segs.SegmentedPropertyType.CodeValue
	UNION DISTINCT
	SELECT PatientID, SOPInstanceUID, 
	COALESCE(CAST(map.Concept_ID__SCT_ AS STRING), 
	segs.SegmentedPropertyType.CodeValue) AS SegmentedPropertyTypeCodeSequence,
	segs.SegmentedPropertyType.CodeMeaning AS SegmentedPropertyType,
	FrameOfReferenceUID,
	SegmentNumber,
	SegmentAlgorithmType
	FROM `idc-pdp-staging.{dataset}.segmentations` segs
	JOIN `{sct_to_srt_map}` map
	ON CAST(map.Concept_ID__SCT_ AS STRING) = segs.SegmentedPropertyType.CodeValue
)
SELECT 
	segs.PatientID, 
	segs.SOPInstanceUID, 
	segs.FrameOfReferenceUID,
	segs.SegmentNumber,
	segs.SegmentAlgorithmType,
	ars.AnatomicRegionSequence,
	ars.AnatomicRegion,
	spc.SegmentedPropertyCategoryCodeSequence,
	spc.SegmentedPropertyCategory,
	spt.SegmentedPropertyTypeCodeSequence,
	spt.SegmentedPropertyType,
FROM `idc-pdp-staging.{dataset}.segmentations` segs
LEFT JOIN ars
    ON ars.SOPInstanceUID = segs.SOPInstanceUID AND ars.SegmentNumber = segs.SegmentNumber
LEFT JOIN spc
    ON spc.SOPInstanceUID = segs.SOPInstanceUID AND spc.SegmentNumber = segs.SegmentNumber
LEFT JOIN spt
    ON spt.SOPInstanceUID = segs.SOPInstanceUID AND spt.SegmentNumber = segs.SegmentNumber
;