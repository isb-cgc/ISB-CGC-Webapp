mkdir ./json
mkdir ./txt

gsutil cp "gs://${DEPLOYMENT_BUCKET}/${ENV_FILE}" ./.env
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${WEB_CLIENT_SECRETS_FILE}" ./client_secrets.json
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${WEBAPP_RUNTIME_SA_KEY}" ./privatekey.json
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${USER_GCP_KEY}" ./
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${DCF_SECRETS_FILE}" ./dcf_secrets.txt

gsutil cp "gs://${DEPLOYMENT_BUCKET}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${GOOGLE_ORG_WHITELIST_JSON_FILE}" ./
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${MANAGED_SERVICE_ACCOUNTS_JSON_FILE}" ./

gsutil cp "gs://${DEPLOYMENT_BUCKET}/${STATIC_COMMIT_CHECK_FILE}" ./

# Pack staged files for caching
echo "Packing JSON and text files for caching into deployment..."
cp --verbose *.json ./json
cp --verbose *.txt ./txt

