if [ ! -f "/home/circleci/${CIRCLE_PROJECT_REPONAME}/deployment_config.txt" ]; then
    gsutil cp gs://${DEPLOYMENT_BUCKET}/deployment_config.txt /home/circleci/${CIRCLE_PROJECT_REPONAME}/
    chmod ugo+r /home/circleci/${CIRCLE_PROJECT_REPONAME}/deployment_config.txt
    if [ ! -f "/home/circleci/${CIRCLE_PROJECT_REPONAME}/deployment_config.txt" ]; then
      echo "[ERROR] Couldn't assign deployment configuration file - exiting."
      exit 1
    else
      echo "Downloaded deployment configuration file."
    fi
else
    echo "Found deployment configuration file."
fi