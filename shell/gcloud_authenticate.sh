touch prod_deployment_key.json
echo "{\
  \"private_key_id\": \"$GAE_PRIVATE_KEY_ID\",\
  \"private_key\": \"$GAE_PRIVATE_KEY\",\
  \"client_email\": \"$GAE_CLIENT_EMAIL\",\
  \"client_id\": \"$GAE_CLIENT_ID\",\
  \"type\": \"service_account\"\
}" | tee prod_deployment_key.json > /dev/null 2> /dev/null
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file prod_deployment_key.json
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set account $GAE_CLIENT_EMAIL
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set project "$GAE_PROJECT_ID"
