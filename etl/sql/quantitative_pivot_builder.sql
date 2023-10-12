WITH qualitative_unnested AS (SELECT PatientID, SOPInstanceUID, segmentationInstanceUID, ( SELECT STRING_AGG(CAST( segNums AS STRING), ',')
    FROM UNNEST(segmentationSegmentNumber) segNums) AS segmentationSegmentNumber,
  Quantity.CodeMeaning AS Attr,
  Value.CodeMeaning AS Value,
  finding.CodeMeaning AS finding,
  findingSite.CodeMeaning AS findingSite
FROM `idc-pdp-staging.{dataset}.qualitative_measurements`)
SELECT PatientID, SOPInstanceUID, segmentationInstanceUID, segmentationSegmentNumber,
  MAX(IF(Attr = "Texture", Value, NULL)) AS Texture,
  MAX(IF(Attr = "Calcification", Value, NULL)) AS Calcification,
  MAX(IF(Attr = "Spiculation", Value, NULL)) AS Spiculation,
  MAX(IF(Attr = "Sphericity", Value, NULL)) AS Sphericity,
  MAX(IF(Attr = "Internal structure", Value, NULL)) AS Internal_structure,
  MAX(IF(Attr = "Subtlety score", Value, NULL)) AS Subtlety_score,
  MAX(IF(Attr = "Lobular Pattern", Value, NULL)) AS Lobular_Pattern,
  MAX(IF(Attr = "Margin", Value, NULL)) AS Margin,
  MAX(IF(Attr = "Malignancy", Value, NULL)) AS Malignancy
FROM qualitative_unnested
GROUP BY PatientID, SOPInstanceUID, segmentationInstanceUID, segmentationSegmentNumber
;