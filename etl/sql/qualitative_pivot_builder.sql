WITH quantitative_unnested AS (
  SELECT PatientID, SOPInstanceUID, segmentationInstanceUID,
  (
    SELECT STRING_AGG(CAST( segNums AS STRING), ',')
    FROM UNNEST(segmentationSegmentNumber) segNums
  ) AS segmentationSegmentNumber,
  Quantity.CodeMeaning AS Attr,
  CASE WHEN derivationModifier IS NOT NULL THEN derivationModifier.CodeMeaning ELSE NULL END AS derivationMod,
  Value,
  Units.CodeMeaning AS Units,
  finding.CodeMeaning AS finding,
  findingSite.CodeMeaning AS findingSite
FROM `idc-pdp-staging.{dataset}.quantitative_measurements`)
SELECT PatientID, SOPInstanceUID, segmentationInstanceUID, segmentationSegmentNumber,
MAX(IF(Attr = "Apparent Diffusion Coefficient", Value, NULL)) AS Apparent_Diffusion_Coefficient,
MAX(IF(Attr = "Diameter", Value, NULL)) AS Diameter,
MAX(IF(Attr = "Sphericity", Value, NULL)) AS Sphericity_quant,
MAX(IF(LOWER(Attr) = "surface area of mesh", Value, NULL)) AS Surface_Area_of_Mesh,
MAX(IF(Attr = "Volume", IF(Units = "milliliter",Value/1000, Value), NULL)) AS Volume,
MAX(IF(Attr = "Volume of Mesh", Value, NULL)) AS Volume_of_Mesh
FROM `quantitative_unnested`
GROUP BY PatientID, SOPInstanceUID, segmentationInstanceUID, segmentationSegmentNumber
;