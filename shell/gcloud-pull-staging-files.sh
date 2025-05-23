mkdir ./json
mkdir ./txt
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${WEBAPP_APP_YAML}" ./app.yaml
gsutil cp "gs://${DEPLOYMENT_BUCKET}/${ENV_FILE}" ./.env

gsutil cp "gs://${DEPLOYMENT_BUCKET}/solr-ssl.pem" ./solr-ssl.pem

gsutil cp "gs://${DEPLOYMENT_BUCKET}/${STATIC_COMMIT_CHECK_FILE}" ./

# Pack staged files for caching
echo "Packing JSON and text files for caching into deployment..."
cp --verbose *.json ./json
cp --verbose *.txt ./txt
