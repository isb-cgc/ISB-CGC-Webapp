mkdir ./json
mkdir ./txt

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_ENV_FILE}" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_SECRETS_FILE}" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_JSON_FILE}" ./privatekey.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_USER_GCP_KEY}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_DCF_SECRETS_FILE}" ./dcf_secrets.txt

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${GOOGLE_ORG_WHITELIST_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${MANAGED_SERVICE_ACCOUNTS_JSON_FILE}" ./
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_DATASET_JSON_FILE}" ./

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${STATIC_COMMIT_CHECK_FILE}" ./

#mysql build key file
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/mysql_build_key.txt" ./mysql_pubkey.asc

# Pack staged files for caching
echo "Packing JSON and text files for caching into deployment..."
cp --verbose *.json ./json
cp --verbose *.txt ./txt

