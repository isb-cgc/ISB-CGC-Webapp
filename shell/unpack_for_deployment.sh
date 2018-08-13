echo "Unpacking JSON and txt files for deployment..."
cp ./txt/* ./
cp ./json/* ./

echo "JSON and txt files unpacked:"
ls ./*.txt
ls ./*.json

# Check if we need to rsync static
STATIC_LAST_COMMIT=$(git rev-list -1 HEAD -- "static")

if [ -z "${STATIC_COMMIT_CHECK_FILE}" ] || [ ${STATIC_LAST_COMMIT} != $(cat "${STATIC_COMMIT_CHECK_FILE}") ]; then
    echo "Beginning rsync of /static..."
    ./google-cloud-sdk/bin/gsutil rsync -R static/ gs://webapp-uat-static-files/static
    git rev-list -1 HEAD -- "static" > ${STATIC_COMMIT_CHECK_FILE}
    ./google-cloud-sdk/bin/gsutil cp "${STATIC_COMMIT_CHECK_FILE}" gs://${GCLOUD_BUCKET_UAT}/
else
    echo "No changes found in /static -- skipping rsync."
fi