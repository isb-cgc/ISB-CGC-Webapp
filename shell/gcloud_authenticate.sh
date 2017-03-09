touch uat_deployment.key.json
echo "{\
  \"private_key_id\": \"$GAE_PRIVATE_KEY_ID_UAT\",\
  \"private_key\": \"$GAE_PRIVATE_KEY_UAT\",\
  \"client_email\": \"$GAE_CLIENT_EMAIL_UAT\",\
  \"client_id\": \"$GAE_CLIENT_ID_UAT\",\
  \"type\": \"service_account\"\
}" | tee uat_deployment.key.json > /dev/null 2> /dev/null
/home/ubuntu/ISB-CGC-Webapp/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file uat_deployment.key.json
/home/ubuntu/ISB-CGC-Webapp/google-cloud-sdk/bin/gcloud config set project "$GAE_PROJECT_ID_UAT"
