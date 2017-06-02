touch deployment.key.json

echo "[STATUS] Attempting to build key for $UAT_CLIENT_EMAIL..."

echo "{\
  \"private_key_id\": \"$UAT_PRIVATE_KEY_ID\",\
  \"private_key\": \"$UAT_PRIVATE_KEY\",\
  \"client_email\": \"$UAT_CLIENT_EMAIL\",\
  \"client_id\": \"$UAT_CLIENT_ID\",\
  \"type\": \"service_account\"\
}" | tee dev_deployment.key.json > /dev/null 2> /dev/null

echo "[STATUS] Generated JSON for $UAT_CLIENT_EMAIL, attempting to authenticate..."

/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file deployment.key.json
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set account $UAT_CLIENT_EMAIL
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set project "$UAT_PROJECT_ID"
