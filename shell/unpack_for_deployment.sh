echo "Unpacking JSON and txt files for deployment..."
cp ./txt/* ./
cp ./json/* ./

echo "JSON and txt files unpacked:"
ls ./*.txt
ls ./*.json

echo "Beginning rsync of /static..."
./google-cloud-sdk/bin/gsutil rsync -R static/ gs://webapp-dev-static-files/static
