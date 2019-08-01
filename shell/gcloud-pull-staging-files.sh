mkdir ./json
mkdir ./txt

gsutil cp "gs://${GCLOUD_BUCKET}/${ENV_FILE}" ./.env
gsutil cp "gs://${GCLOUD_BUCKET}/${WEB_CLIENT_SECRETS_FILE}" ./client_secrets.json
gsutil cp "gs://${GCLOUD_BUCKET}/${APP_RUNTIME_SA_KEY}" ./privatekey.json
gsutil cp "gs://${GCLOUD_BUCKET}/${USER_GCP_KEY}" ./
gsutil cp "gs://${GCLOUD_BUCKET}/${DCF_SECRETS_FILE}" ./dcf_secrets.txt

gsutil cp "gs://${GCLOUD_BUCKET}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./
gsutil cp "gs://${GCLOUD_BUCKET}/${GOOGLE_ORG_WHITELIST_JSON_FILE}" ./
gsutil cp "gs://${GCLOUD_BUCKET}/${MANAGED_SERVICE_ACCOUNTS_JSON_FILE}" ./

gsutil cp "gs://${GCLOUD_BUCKET}/${STATIC_COMMIT_CHECK_FILE}" ./

# Pack staged files for caching
echo "Packing JSON and text files for caching into deployment..."
cp --verbose *.json ./json
cp --verbose *.txt ./txt

