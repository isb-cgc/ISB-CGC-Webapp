WITH qualitative_attr AS (
  SELECT Quantity.CodeMeaning AS Attr
  FROM `idc-pdp-staging.{dataset}.qualitative_measurements`
  GROUP BY Attr
)
SELECT CONCAT(
    'SELECT PatientID, SOPInstanceUID, segmentationInstanceUID, segmentationSegmentNumber,',
    STRING_AGG(CONCAT(
        'MAX(IF(Attr = "',Attr,'", Value, NULL)) AS ',
        REGEXP_REPLACE(Attr,r'\s+','_') )),
    ' FROM `qualitative_unnested` GROUP BY PatientID, SOPInstanceUID, segmentationInstanceUID, segmentationSegmentNumber'
    )
FROM qualitative_attr
;