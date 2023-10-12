SELECT
       volume.version,
       volume.sum AS data_volume,
       series.count AS series_count,
       patient.count AS patient_count,
       collex.count AS collection_count
FROM (
  SELECT "{version_number}" AS version, (SUM(instance_size))/(1024*1024*1024*1024) AS sum
  FROM `idc-dev-etl.{dataset}_pub.dicom_all`
) volume
JOIN (
  SELECT "v15" AS version, COUNT(*) AS count
  FROM (
    SELECT DISTINCT SeriesInstanceUID
    FROM `idc-dev-etl.{dataset}_pub.dicom_all`
  )
  GROUP BY version
) series ON
series.version = volume.version
JOIN (
  SELECT "{version_number}" AS version, COUNT(*) AS count
  FROM (
    SELECT DISTINCT PatientID
    FROM `idc-dev-etl.{dataset}_pub.dicom_all`
  )
  GROUP BY version
) patient ON
series.version = patient.version
JOIN (
  SELECT "{version_number}" AS version, COUNT(*) AS count
  FROM (
    SELECT DISTINCT collection_id
    FROM `idc-dev-etl.{dataset}_pub.dicom_derived_all`
    WHERE collection_id IS NOT NULL AND analysis_results_id IS NULL
  )
  GROUP BY version
) collex ON
series.version = collex.version
;