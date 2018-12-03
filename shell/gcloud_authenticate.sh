echo $DEPLOYMENT_KEY_ISB_CGC | base64 --decode --ignore-garbage > deployment.key.json

/home/circleci/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file deployment.key.json
/home/circleci/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set account $DEPLOYMENT_CLIENT_EMAIL_ISB_CGC
/home/circleci/${CIRCLE_PROJECT_REPONAME}/google-cloud-sdk/bin/gcloud config set project "$DEV_PROJECT_ID"
