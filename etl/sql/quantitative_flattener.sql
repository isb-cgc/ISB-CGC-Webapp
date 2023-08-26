WITH quantitative_attr AS (
  SELECT Quantity.CodeMeaning AS Attr
  FROM `idc-pdp-staging.{dataset}.quantitative_measurements`
  GROUP BY Attr
  ORDER BY Attr
)
SELECT CONCAT(
  'SELECT PatientID, SOPInstanceUID, segmentationInstanceUID, segmentationSegmentNumber,',
  STRING_AGG(CONCAT(
    'MAX(IF(Attr = "',Attr,'"',
      CASE
      WHEN Attr = 'SUVbw'
        THEN ' AND derivationMod = "Mean", Value'
      WHEN Attr = "Volume"
        THEN ', IF(Units = "milliliter",Value/1000, Value)'
      ELSE ', Value'
      END,', NULL)) AS ', REGEXP_REPLACE(Attr,r'\s+','_')
    )),
  ' FROM `quantitative_unnested` GROUP BY PatientID, SOPInstanceUID, segmentationInstanceUID, segmentationSegmentNumber'
)
FROM quantitative_attr
;