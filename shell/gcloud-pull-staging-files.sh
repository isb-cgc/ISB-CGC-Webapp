mkdir ./json
mkdir ./txt

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_ENV_FILE}" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_SECRETS_FILE}" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_JSON_FILE}" ./privatekey.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_USER_GCP_KEY}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_DCF_SECRETS_FILE}" ./dcf_secrets.txt

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${UAT_DATASET_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${MANAGED_SERVICE_ACCOUNTS_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${GOOGLE_ORG_WHITELIST_JSON_FILE}" ./

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_UAT}/${STATIC_COMMIT_CHECK_FILE}" ./

# Pack staged files for caching
echo "Packing JSON and text files for caching into deployment..."
cp --verbose *.json ./json
cp --verbose *.txt ./txt

