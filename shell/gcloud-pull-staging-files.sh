#./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/staging.env" ./.env
#./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/staging-ssl/client-cert.pem" ./client-cert.pem
#./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/staging-ssl/client-key.pem" ./client-key.pem
#./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/staging-ssl/server-ca.pem" ./server-ca.pem
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/${STAGING_ENV_FILE}" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/${STAGING_CERT_FILE}" ./client-cert.pem
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/${STAGING_KEY_FILE}" ./client-key.pem
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/${STAGING_CA_FILE}" ./server-ca.pem
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/${STAGING_SECRETS_FILE}" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/${STAGING_PEM_FILE}" ./privatekey.pem
if [-n "$NIH_AUTH_ON" ]; then
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/dev-files/saml/advanced_settings.json" ./saml/advanced_settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/dev-files/saml/settings.json" ./saml/settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/dev-files/saml/certs/cert.pem" ./saml/certs/cert.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/dev-files/saml/certs/key.pem" ./saml/certs/key.pem
fi
