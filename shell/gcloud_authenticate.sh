touch deployment.key.json
echo "{\
  \"private_key_id\": \"$TEST_PRIVATE_KEY_ID\",\
  \"private_key\": \"$TEST_PRIVATE_KEY\",\
  \"client_email\": \"$TEST_CLIENT_EMAIL\",\
  \"client_id\": \"$TEST_CLIENT_ID\",\
  \"type\": \"service_account\"\
}" | tee deployment.key.json > /dev/null 2> /dev/null

echo "[STATUS] Generated JSON for $TEST_CLIENT_EMAIL, attempting to authenticate..."

/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file deployment.key.json
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set account $TEST_CLIENT_EMAIL
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set project "$TEST_PROJECT_ID"
