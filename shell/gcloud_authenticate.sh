echo $DEPLOYMENT_KEY_ISB_CGC | base64 --decode --ignore-garbage > deployment.key.json

/home/circleci/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file deployment.key.json
/home/circleci/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set account $GAE_CLIENT_EMAIL
/home/circleci/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set project "$GAE_PROJECT_ID"
