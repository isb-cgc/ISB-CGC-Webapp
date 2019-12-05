if [ ! -f "deployment.key.json" ]; then
    echo ${DEPLOYMENT_KEY} | base64 --decode --ignore-garbage > deployment.key.json
fi

echo "Activating service account for deployment"
gcloud auth activate-service-account --key-file deployment.key.json

echo "Setting deployment account to ${DEPLOYMENT_CLIENT_EMAIL}"
gcloud config set account $DEPLOYMENT_CLIENT_EMAIL

echo "Setting deployment project to ${DEPLOYMENT_PROJECT_ID}"
gcloud config set project "$DEPLOYMENT_PROJECT_ID"
