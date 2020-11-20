CORE=${1:-test_core}
SKIP_DOWNLOAD=${2:-true}

echo ""
echo "Beginning index run for core ${CORE}"
echo "-------------------------------------------------------"
echo ""

if [[ "$SKIP_DOWNLOAD" = false ]]; then
        echo "Deleting current CSV files."
        rm dicom_derived_all_*.csv

        echo "Downloading new index data."
        gsutil cp gs://idc-dev-files/dicom_derived_all_*.csv ./
else
	echo "Skipping download. Files are assumed to be present in the directory."
fi

echo ""
echo "Deleting and re-creating the core."
sudo -u solr /opt/bitnami/apache-solr/bin/solr delete -c $CORE
sudo -u solr /opt/bitnami/apache-solr/bin/solr create -c $CORE -s 2 -rf 2

echo ""
echo "Creating the core schema."
echo '{"add-field":['$(cat core_schema.json)']}' | curl -u idc:$SOLR_PASSWORD -X POST -H 'Content-type:application/json' --data-binary @-  https://localhost:8983/solr/$CORE/schema --cacert solr-ssl.pem

echo ""
echo "Indexing the following files:"
ls -l dicom_derived_all_*.csv

echo ""
for CSV in $(ls dicom_derived_all_*.csv)
do
        echo "Indexing file ${CSV}..."
        curl -u idc:$SOLR_PASSWORD -X POST https://localhost:8983/solr/$CORE/update?commit=yes --data-binary @$CSV -H 'Content-type:application/csv' --cacert solr-ssl.pem
        echo "...done."
done
