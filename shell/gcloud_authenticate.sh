echo $TEST_PRIVATE_KEY_FOR_V2 | base64 --decode --ignore-garbage > deployment.key.json

echo "[STATUS] Generated JSON for $TEST_CLIENT_EMAIL, attempting to authenticate..."

/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file deployment.key.json
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set account $TEST_CLIENT_EMAIL
/home/ubuntu/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set project "$TEST_PROJECT_ID"
