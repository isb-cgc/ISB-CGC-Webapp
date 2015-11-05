touch gae-key.json
echo "{\
  \"private_key_id\": \"$GAE_PRIVATE_KEY_ID\",\
  \"private_key\": \"$GAE_PRIVATE_KEY\",\
  \"client_email\": \"$GAE_CLIENT_EMAIL\",\
  \"client_id\": \"$GAE_CLIENT_ID\",\
  \"type\": \"service_account\"\
}" | tee gae-key.json
gcloud auth activate-service-account --key-file gae-key.json
gcloud config set project "$GAE_PROJECT_ID"
rm gae-key.json