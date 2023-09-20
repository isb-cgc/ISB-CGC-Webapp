SELECT
    active.idc_webapp_collection_id	AS collection_id,
    orig_id_map.idc_collection_id AS collection_uuid,
    active.collection_name AS name,
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
    REGEXP_REPLACE(active.Program," ","_") AS program,
    ARRAY_TO_STRING(active.Access,"; ") AS access,
    {etl_date} AS date_updated,
    tcia_wiki_collection_id,
    "True" AS active
FROM `idc-dev-etl.{dataset}_pub.original_collections_metadata` AS active
JOIN `idc-dev-etl.{dataset}_dev.collection_id_map` AS orig_id_map
ON orig_id_map.idc_webapp_collection_id = active.idc_webapp_collection_id
UNION ALL
SELECT
    inactive.idc_webapp_collection_id	AS collection_id,
    orig_id_map.idc_collection_id AS collection_uuid,
    CASE
        WHEN inactive.tcia_api_collection_id = '' OR inactive.tcia_api_collection_id IS NULL
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
    {etl_date} AS date_updated,
    tcia_wiki_collection_id,
    "False" AS active
FROM `idc-dev-etl.idc_v12_dev.excluded_collections_metadata` AS inactive
JOIN `idc-dev-etl.{dataset}_dev.collection_id_map` AS orig_id_map
ON orig_id_map.idc_webapp_collection_id = inactive.idc_webapp_collection_id
UNION ALL
SELECT
    ID AS collection_id,
    analysis_id_map.idc_id AS collection_uuid,
    Title AS name,
    Collections AS collections,
    NULL AS image_types,
    NULL AS supporting_data,
    Subjects AS subject_count,
    DOI AS doi,
    NULL AS source_url,
    CancerType AS cancer_type,
    NULL AS species,
    Location AS location,
    AnalysisArtifactsonTCIA AS analysis_artifacts,
    Description AS description,
    "A" AS collection_type,
    NULL AS program,
    analysis.Access AS access,
    {etl_date} AS date_updated,
    NULL AS tcia_wiki_collection_id,
    CASE
        WHEN ID IS NULL
            THEN "False"
        ELSE "True"
    END AS active
FROM `idc-dev-etl.{dataset}_pub.analysis_results_metadata` analysis
JOIN `idc-dev-etl.{dataset}_dev.analysis_id_map` AS analysis_id_map
ON analysis_id_map.collection_id = analysis.ID
ORDER BY collection_id
;