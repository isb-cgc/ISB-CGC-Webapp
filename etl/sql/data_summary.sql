WITH volume AS (
  SELECT "{version_display}" AS version, (SUM(instance_size))/(pow(1000,4)) AS sum
  FROM `idc-dev-etl.{data_version}_pub.dicom_all`
),
series AS (
  SELECT "{version_display}" AS version, COUNT(*) AS count
  FROM (
    SELECT DISTINCT SeriesInstanceUID
    FROM `idc-dev-etl.{data_version}_pub.dicom_all`
  )
  GROUP BY version
),
patient AS (
  SELECT "{version_display}" AS version, COUNT(*) AS count
  FROM (
    SELECT DISTINCT PatientID
    FROM `idc-dev-etl.{data_version}_pub.dicom_all`
  )
  GROUP BY version
),
collex AS  (
  SELECT "{version_display}" AS version, COUNT(*) AS count
  FROM (
    SELECT DISTINCT collection_id
    FROM `idc-dev-etl.{data_version}_dev.dicom_derived_all`
    WHERE collection_id IS NOT NULL AND analysis_results_id IS NULL
  )
  GROUP BY version
)
SELECT
    volume.version,
    volume.sum AS data_volume,
    series.count AS series_count,
    patient.count AS patient_count,
    collex.count AS collection_count
FROM volume
JOIN series
    ON series.version = volume.version
JOIN patient
    ON series.version = volume.version
JOIN collex
    ON volume.version = collex.version
;
