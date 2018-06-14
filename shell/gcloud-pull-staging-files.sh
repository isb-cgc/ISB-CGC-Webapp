mkdir ./json
mkdir ./txt

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_ENV_FILE}" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_SECRETS_FILE}" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_JSON_FILE}" ./privatekey.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_USER_GCP_KEY}" ./

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_DATASET_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${MANAGED_SERVICE_ACCOUNTS_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${GOOGLE_ORG_WHITELIST_JSON_FILE}" ./

cp *.json ./json
cp *.txt ./txt

echo "Beginning rsync of /static..."
./google-cloud-sdk/bin/gsutil rsync -R static/ gs://webapp-uat-static-files/static
