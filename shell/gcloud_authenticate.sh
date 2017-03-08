touch test_deployment.key.json
echo "{\
  \"private_key_id\": \"$TEST_PRIVATE_KEY_ID\",\
  \"private_key\": \"$TEST_PRIVATE_KEY\",\
  \"client_email\": \"$TEST_CLIENT_EMAIL\",\
  \"client_id\": \"$TEST_CLIENT_ID\",\
  \"type\": \"service_account\"\
}" | tee test_deployment.key.json > /dev/null 2> /dev/null
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file test_deployment.key.json
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set project "$GAE_PROJECT_ID_TEST"
