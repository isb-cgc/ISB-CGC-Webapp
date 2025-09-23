SELECT 
  active.collection_id	AS collection_id, 
  STRING_AGG(DISTINCT(orig_id_map.idc_collection_id)) AS collection_uuid,
  active.collection_name AS name, 
  NULL AS collections, 
  STRING_AGG(DISTINCT(ImageTypes), ', ') AS image_types,
  STRING_AGG(DISTINCT(SupportingData), ', ') AS supporting_data, 
  MAX(Subjects) AS subject_count, 
  STRING_AGG(DISTINCT(source_doi), ' ') AS doi, 
  STRING_AGG(DISTINCT(source_url), ' ') AS source_url,
  STRING_AGG(DISTINCT(CancerTypes), ', ') AS cancer_type, 
  STRING_AGG(DISTINCT(Species), ', ') AS species, 
  STRING_AGG(DISTINCT(TumorLocations), ', ') AS location,
  NULL AS analysis_artifacts, 
  STRING_AGG(DISTINCT(descs.Description), ', ') AS description, 
  "O" AS collection_type,
  STRING_AGG(DISTINCT(REGEXP_REPLACE(active.Program," ","_")), ', ') AS program,
  STRING_AGG(DISTINCT(Access), ', ') AS access,
  CURRENT_DATE() AS date_updated, 
  STRING_AGG(DISTINCT(active.collection_name), ', ') AS tcia_wiki_collection_id,
  STRING_AGG(DISTINCT(license.license_short_name), ', ') AS license_short_name,
  "True" AS active
FROM `idc-dev-etl.{data_version}_pub.original_collections_metadata` AS active,
UNNEST(active.Sources) AS s
JOIN `idc-dev-etl.{data_version}_dev.collection_id_map` AS orig_id_map
ON orig_id_map.idc_webapp_collection_id = active.collection_id
JOIN `idc-dev-etl.{data_version}_dev.original_collections_descriptions` AS descs
ON descs.collection_id = active.collection_id
GROUP BY collection_id, name
UNION ALL
SELECT 
  inactive.idc_webapp_collection_id	AS collection_id,
  orig_id_map.idc_collection_id AS collection_uuid,
  CASE WHEN inactive.tcia_api_collection_id = '' OR inactive.tcia_api_collection_id IS NULL 
    THEN REPLACE(UPPER(inactive.idc_webapp_collection_id),"_","-") 
    ELSE inactive.tcia_api_collection_id 
  END AS name, 
  NULL AS collections, 
  ImageTypes AS image_types, 
  SupportingData AS supporting_data, 
  Subjects AS subject_count, 
  DOI AS doi, 
  URL AS source_url,
  CancerType AS cancer_type, 
  Species AS species, 
  Location AS location,
  NULL AS analysis_artifacts, 
  Description AS description, 
  "O" AS collection_type,
  REGEXP_REPLACE(inactive.Program," ","_") AS program,
  ARRAY_TO_STRING(inactive.Access,"; ") AS access,
  CURRENT_DATE() AS date_updated, 
  tcia_wiki_collection_id,
  NULL AS license_short_name,
  "False" AS active
FROM `idc-dev-etl.{data_version}_dev.excluded_collections` AS excluded
JOIN `idc-dev-etl.{data_version}_dev.collection_id_map` AS orig_id_map
ON orig_id_map.idc_collection_id = excluded.idc_collection_id
LEFT JOIN `idc-dev-etl.idc_v12_dev.excluded_collections_metadata` AS inactive
ON inactive.idc_webapp_collection_id = orig_id_map.idc_webapp_collection_id
UNION ALL
SELECT 
  analysis.ID AS collection_id, 
  analysis_id_map.idc_id AS collection_uuid,
  Title AS name, 
  Collections AS collections, 
  NULL AS image_types,  
  NULL AS supporting_data, 
  Subjects AS subject_count, 
  source_doi AS doi, 
  source_url AS source_url,
  CancerTypes AS cancer_type, 
  NULL AS species, 
  TumorLocations AS location, 
  AnalysisArtifacts AS analysis_artifacts, 
  adescs.Description AS description, 
  "A" AS collection_type,
  NULL AS program, 
  analysis.Access AS access,
  CURRENT_DATE() AS date_updated, 
  NULL AS tcia_wiki_collection_id,
  license_short_name,
  CASE WHEN analysis.ID IS NULL THEN "False" ELSE "True" END AS active
FROM `idc-dev-etl.{data_version}_pub.analysis_results_metadata` analysis
JOIN `idc-dev-etl.{data_version}_dev.analysis_id_map` AS analysis_id_map
ON analysis_id_map.collection_id = analysis.ID
JOIN `idc-dev-etl.{data_version}_dev.analysis_results_descriptions` AS adescs
ON adescs.id = analysis.ID
ORDER BY collection_id
;