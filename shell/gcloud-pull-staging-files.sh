./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_ENV_FILE}" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_SECRETS_FILE}" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${DEV_JSON_FILE}" ./privatekey.json

./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/${SERVICE_ACCOUNT_BLACKLIST_JSON_FILE}" ./

if [ -n "${DEV_NIH_AUTH_ON}" ]; then
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/saml/advanced_settings.json" ./saml/advanced_settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/saml/settings.json" ./saml/settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/saml/certs/cert.pem" ./saml/certs/cert.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/saml/certs/key.pem" ./saml/certs/key.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV}/NIH_FTP.txt" ./NIH_FTP.txt
fi

./google-cloud-sdk/bin/gsutil rsync -R static/ gs://webapp-dev-static-files/static
