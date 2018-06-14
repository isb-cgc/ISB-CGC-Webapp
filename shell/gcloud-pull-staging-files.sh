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

# Pack staged files for caching
cp *.json ./json
cp *.txt ./txt

# Pull down the previous checksum
./google-cloud-sdk/bin/gsutil cp gs://webapp-uat-static-files/static/static.md5 ./

# Calculate the current checksum
STATIC_MD5=`tar -cf - static | md5sum | awk '{ print $1 }'`

# Compare them--if we found a prior one and it matched, no need to upload; otherwise, upload.
if [ -f "static.md5" ] && [ "$STATIC_MD5" == "$(cat static.md5)" ]; then
    echo "Static folder contents have not changed -- skipping rsync"
else
    echo "Beginning rsync of /static..."
    ./google-cloud-sdk/bin/gsutil rsync -R static/ gs://webapp-uat-static-files/static
    echo "Replacing static checksum..."
    tar -cf - static | md5sum | awk '{ print $1 }' > static.md5
    ./google-cloud-sdk/bin/gsutil cp static.md5 gs://webapp-uat-static-files/static
fi