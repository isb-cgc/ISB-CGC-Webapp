if [ ! -f "/home/circleci/${CIRCLE_PROJECT_REPONAME}/${DEPLOYMENT_CONFIG}" ]; then
    gsutil cp gs://${DEPLOYMENT_BUCKET}/${DEPLOYMENT_CONFIG} /home/circleci/${CIRCLE_PROJECT_REPONAME}/
    chmod ugo+r /home/circleci/${CIRCLE_PROJECT_REPONAME}/${DEPLOYMENT_CONFIG}
    if [ ! -f "/home/circleci/${CIRCLE_PROJECT_REPONAME}/${DEPLOYMENT_CONFIG}" ]; then
      echo "[ERROR] Couldn't assign deployment configuration file - exiting."
      exit 1
    fi
else
    echo "Found deployment configuration file."
fi