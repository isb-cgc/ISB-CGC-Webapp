  # Study-aggregated data for producing a Solr Index for faceted counting
  #
  # Multiple values concatenated with |
  #
SELECT
  PatientID,
  StudyInstanceUID,
  crdc_study_uuid,
  SUM(instance_size) AS instance_size,
  STRING_AGG(DISTINCT(program),"|") AS program,
  STRING_AGG(DISTINCT(license_short_name),"|") AS license_short_name,
  STRING_AGG(DISTINCT(ACCESS),"|") AS ACCESS,
  STRING_AGG(DISTINCT( analysis_results_id ),"|") AS analysis_results_id,
  STRING_AGG(DISTINCT(ManufacturerModelName),"|") AS ManufacturerModelName,
  STRING_AGG(DISTINCT(Manufacturer),"|") AS Manufacturer,
  STRING_AGG(DISTINCT(SeriesInstanceUID),"|") AS SeriesInstanceUID,
  STRING_AGG(DISTINCT(crdc_series_uuid),"|") AS crdc_series_uuid,
  STRING_AGG(DISTINCT(REGEXP_REPLACE(SeriesDescription,"\\|"," ")),"|") AS SeriesDescription,
  STRING_AGG(DISTINCT(CAST(SeriesNumber AS STRING)),"|") AS SeriesNumber,
  STRING_AGG(DISTINCT(StudyDescription),"|") AS StudyDescription,
  CAST(MIN(StudyDate) AS STRING) AS StudyDate,
  STRING_AGG(DISTINCT(CAST(SliceThickness AS String)),"|") AS SliceThickness,
  STRING_AGG(DISTINCT(CAST(SamplesPerPixel AS String)),"|") AS SamplesPerPixel,
  STRING_AGG(DISTINCT(CAST(SegmentNumber AS STRING)),"|") AS SegmentNumber,
  STRING_AGG(DISTINCT(SegmentAlgorithmType),"|") AS SegmentAlgorithmType,
  STRING_AGG(DISTINCT(Modality), "|") AS Modality,
  STRING_AGG(DISTINCT(tcia_species), "|") AS tcia_species,
  STRING_AGG(DISTINCT(BodyPartExamined), "|") AS BodyPartExamined,
  STRING_AGG(DISTINCT(tcia_tumorLocation ), "|") AS tcia_tumorLocation,
  STRING_AGG(DISTINCT(CancerType ), "|") AS CancerType,
  STRING_AGG(DISTINCT(REPLACE(collection_id,"-","_")), "|") AS collection_id,
  STRING_AGG(DISTINCT(REPLACE(source_DOI,"-","_")), "|") AS source_DOI,
  STRING_AGG(DISTINCT(SOPClassUID), "|") AS SOPClassUID,
  STRING_AGG(DISTINCT(Internal_structure), "|") AS Internal_structure,
  STRING_AGG(DISTINCT(Sphericity), "|") AS Sphericity,
  STRING_AGG(DISTINCT( AnatomicRegionSequence ), "|") AS AnatomicRegionSequence,
  STRING_AGG(DISTINCT( SegmentedPropertyCategoryCodeSequence ), "|") AS SegmentedPropertyCategoryCodeSequence,
  STRING_AGG(DISTINCT( SegmentedPropertyTypeCodeSequence ), "|") AS SegmentedPropertyTypeCodeSequence,
  STRING_AGG(DISTINCT(Calcification), "|") AS Calcification,
  STRING_AGG(DISTINCT(Lobular_Pattern), "|") AS Lobular_Pattern,
  STRING_AGG(DISTINCT(Spiculation), "|") AS Spiculation,
  STRING_AGG(DISTINCT(Margin), "|") AS Margin,
  STRING_AGG(DISTINCT(Texture), "|") AS Texture,
  STRING_AGG(DISTINCT(Subtlety_score), "|") AS Subtlety_score,
  STRING_AGG(DISTINCT(Malignancy), "|") AS Malignancy,
  STRING_AGG(DISTINCT(CAST(Apparent_Diffusion_Coefficient AS STRING)),"|") AS Apparent_Diffusion_Coefficient,
  STRING_AGG(DISTINCT(CAST(Volume AS STRING)),"|") AS Volume,
  STRING_AGG(DISTINCT(CAST(Diameter AS STRING)),"|") AS Diameter,
  STRING_AGG(DISTINCT(CAST(Surface_area_of_mesh AS STRING)),"|") AS Surface_area_of_mesh,
  STRING_AGG(DISTINCT(CAST(Volume_of_Mesh AS STRING)),"|") AS Volume_of_Mesh,
  STRING_AGG(DISTINCT(CAST(Sphericity_quant AS STRING)),"|") AS Sphericity_quant,
  STRING_AGG(DISTINCT(CAST(min_PixelSpacing AS STRING)),"|") AS min_PixelSpacing,
  STRING_AGG(DISTINCT(CAST(max_TotalPixelMatrixColumns AS STRING)),"|") AS max_TotalPixelMatrixColumns,
  STRING_AGG(DISTINCT(CAST(max_TotalPixelMatrixRows AS STRING)),"|") AS max_TotalPixelMatrixRows,
  STRING_AGG(DISTINCT(illuminationType), "|") AS illuminationType,
  STRING_AGG(DISTINCT(primaryAnatomicStructure), "|") AS primaryAnatomicStructure,
  STRING_AGG(DISTINCT(CAST(ObjectiveLensPower AS STRING)),"|") AS ObjectiveLensPower,
  STRING_AGG(DISTINCT(gcs_bucket)) gcs_bucket,
  STRING_AGG(DISTINCT(aws_bucket)) aws_bucket,
  CASE
    WHEN STRING_AGG(DISTINCT(has_qualitative), "|") LIKE '%True%' THEN "True"
  ELSE
  "False"
END
  AS has_qualitative,
  CASE
    WHEN STRING_AGG(DISTINCT(has_quantitative), "|") LIKE '%True%' THEN "True"
  ELSE
  "False"
END
  AS has_quantitative,
  CASE
    WHEN STRING_AGG(DISTINCT(has_segmentation), "|") LIKE '%True%' THEN "True"
  ELSE
  "False"
END
  AS has_segmentation,
  CASE
    WHEN STRING_AGG(DISTINCT(has_derived), "|") LIKE '%True%' THEN "True"
  ELSE
  "False"
END
  AS has_derived,
  CASE
    WHEN STRING_AGG(DISTINCT(has_related), "|") LIKE '%True%' THEN "True"
  ELSE
  "False"
END
  AS has_related
FROM
  `idc-dev-etl.{dataset}.dicom_derived_all`
GROUP BY
  PatientID,
  StudyInstanceUID,
  crdc_study_uuid;