SELECT
  *
FROM (
  SELECT
    "SegmentedPropertyCategoryCodeSequence" AS Attr,
    SegmentedPropertyCategoryCodeSequence AS Raw,
    SegmentedPropertyCategory AS Display
  FROM
    `idc-dev-etl.{data_version}_dev.segmentations_pivot`
  GROUP BY
    Attr,
    Raw,
    Display
  UNION DISTINCT
  SELECT
    "SegmentedPropertyTypeCodeSequence" AS Attr,
    SegmentedPropertyTypeCodeSequence AS Raw,
    SegmentedPropertyType AS Display
  FROM
    `idc-dev-etl.{data_version}_dev.segmentations_pivot`
  GROUP BY
    Attr,
    Raw,
    Display
  UNION DISTINCT
  SELECT
    "AnatomicRegionSequence" AS Attr,
    AnatomicRegionSequence AS Raw,
    AnatomicRegion AS Display
  FROM
    `idc-dev-etl.{data_version}_dev.segmentations_pivot`
  GROUP BY
    Attr,
    Raw,
    Display
  UNION DISTINCT
  SELECT
    "primaryAnatomicStructure" AS Attr,
    series_curated.primaryAnatomicStructure_code_designator_value_str AS Raw,
    series_curated.primaryAnatomicStructure_CodeMeaning AS Display,
  FROM
    `idc-pdp-staging.{data_version}.dicom_metadata_curated_series_level_view` series_curated
  WHERE
    primaryAnatomicStructure_code_designator_value_str IS NOT NULL
  GROUP BY
    Attr,
    Raw,
    Display
  UNION DISTINCT
  SELECT
    "illuminationType" AS Attr,
    series_curated.illuminationType_code_designator_value_str AS Raw,
    series_curated.illuminationType_CodeMeaning AS Display,
  FROM
    `idc-pdp-staging.{data_version}.dicom_metadata_curated_series_level_view` series_curated
  WHERE
    illuminationType_code_designator_value_str IS NOT NULL
  GROUP BY
    Attr,
    Raw,
    Display
  UNION DISTINCT
  SELECT
    "collection_id" AS Attr,
    collection_id AS Raw,
    collection_name AS Display
  FROM
    `idc-dev-etl.{data_version}_pub.original_collections_metadata` )
WHERE
  Raw IS NOT NULL
  AND Display IS NOT NULL
;