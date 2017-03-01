touch dev_deployment.key.json
echo "{\
  \"private_key_id\": \"$DEV_PRIVATE_KEY_ID\",\
  \"private_key\": \"$DEV_PRIVATE_KEY\",\
  \"client_email\": \"$DEV_CLIENT_EMAIL\",\
  \"client_id\": \"$DEV_CLIENT_ID\",\
  \"type\": \"service_account\"\
}" | tee dev_deployment.key.json > /dev/null 2> /dev/null
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file dev_deployment.key.json
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set account $DEV_CLIENT_EMAIL
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set project "$GAE_PROJECT_ID"
