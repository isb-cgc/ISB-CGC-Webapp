echo $UAT_PRIVATE_KEY_FOR_V2 | base64 --decode --ignore-garbage > deployment.key.json

gcloud auth activate-service-account --key-file deployment.key.json
gcloud config set account $UAT_CLIENT_EMAIL
gcloud config set project "$UAT_PROJECT_ID"
