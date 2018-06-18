echo "Unpacking JSON and txt files for deployment..."
cp ./txt/* ./
cp ./json/* ./

echo "JSON and txt files unpacked:"
ls ./*.txt
ls ./*.json

# Check if we need to rsync static
STATIC_LAST_COMMIT=$(git rev-list -1 HEAD -- "static")

if [ -z "static_last_commit_synced.txt" ] || [ ${STATIC_LAST_COMMIT} != $(cat "static_last_commit.txt") ]; then
    echo "Beginning rsync of /static..."
    ./google-cloud-sdk/bin/gsutil rsync -R static/ gs://webapp-dev-static-files/static
    git rev-list -1 HEAD -- "static" > static_last_commit_synced.txt
    ./google-cloud-sdk/bin/gsutil cp "static_last_commit_synced.txt" gs://${GCLOUD_BUCKET_DEV}/
else
    echo "No changes found in /static -- skipping rsync."
fi