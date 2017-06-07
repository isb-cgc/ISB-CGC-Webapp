./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/uat.env" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/client_secrets.json" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/uat_application.key.json" ./privatekey.json

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./

./google-cloud-sdk/bin/gsutil rsync -R static/ gs://webapp-uat-static-files/static
