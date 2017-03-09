./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/uat.env" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/ISB-CGC-uat-client_secrets.json" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/ISB-CGC-uat-privatekey2.json" ./privatekey.json

./google-cloud-sdk/bin/gsutil rsync -R static/ gs://webapp-uat-static-files/static
