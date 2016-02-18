#./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/staging.env" ./.env
#./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/staging-ssl/client-cert.pem" ./client-cert.pem
#./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/staging-ssl/client-key.pem" ./client-key.pem
#./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/staging-ssl/server-ca.pem" ./server-ca.pem
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/prod.env" ./.env
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/prod-ssl/prod-main-client-cert.pem" ./client-cert.pem
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/prod-ssl/prod-main-client-key.pem" ./client-key.pem
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/prod-ssl/prod-main-server-ca.pem" ./server-ca.pem
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/client_secrets.json" ./client_secrets.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/privatekey.json" ./privatekey.json
./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/privatekey.pem" ./privatekey.pem
if [ -n "${DEV_NIH_AUTH_ON}" ]; then
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/saml/advanced_settings.json" ./saml/advanced_settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/saml/settings.json" ./saml/settings.json
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/saml/certs/cert.pem" ./saml/certs/cert.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/saml/certs/key.pem" ./saml/certs/key.pem
  ./google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET}/prod-files/NIH_FTP.txt" ./NIH_FTP.txt
fi