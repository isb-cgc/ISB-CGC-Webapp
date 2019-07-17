echo $DEPLOYMENT_KEY_ISB_CGC | base64 --decode --ignore-garbage > deployment.key.json

gcloud auth activate-service-account --key-file deployment.key.json
gcloud config set account $DEPLOYMENT_CLIENT_EMAIL_ISB_CGC
gcloud config set project "$DEV_PROJECT_ID"