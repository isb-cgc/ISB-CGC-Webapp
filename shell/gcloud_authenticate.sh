touch privatekey.json
echo "{\
  \"private_key_id\": \"$GAE_PRIVATE_KEY_ID\",\
  \"private_key\": \"$GAE_PRIVATE_KEY\",\
  \"client_email\": \"$GAE_CLIENT_EMAIL\",\
  \"client_id\": \"$GAE_CLIENT_ID\",\
  \"type\": \"service_account\"\
}" | tee privatekey.json > /dev/null 2> /dev/null
/home/ubuntu/ISB-CGC-Webapp/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file privatekeykey.json
/home/ubuntu/ISB-CGC-Webapp/google-cloud-sdk/bin/gcloud config set project "$GAE_PROJECT_ID"
