if [ -n "$CI" ]; then
    export HOME=/home/ubuntu/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/ubuntu/${CIRCLE_PROJECT_REPONAME}
    export MYSQL_ROOT_USER=ubuntu
else
    export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
    export MYSQL_ROOT_USER=root
fi

export PYTHONPATH=${HOMEROOT}/lib/:${HOMEROOT}/:${HOME}/google_appengine/:${HOME}/google_appengine/lib/protorpc-1.0/
echo $PYTHONPATH
echo "Running Migrations..."
python ${HOMEROOT}/manage.py migrate --noinput

#echo "Creating django superuser"
#echo "from django.contrib.auth.models import User; User.objects.create_superuser('isb', '', 'password')" | python ${HOMEROOT}/manage.py shell

echo "Creating Django User for MySQL database..."
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "GRANT SELECT, INSERT, UPDATE, DELETE ON $DATABASE_NAME.* TO \"django\"@\"localhost\" IDENTIFIED BY \"PASSWORD\""

# Load your SQL table file
# Looks for user_data_dump.sql; if that isn't available, looks for metadata_featdef_tables.sql
# If metadata_featdef_tables.sql isn't found, it downloads a file from sql-table-dumps/ and saves it
# as metadata_featdef_tables.sql for future use
if [ ! -f ${HOMEROOT}/user_data_dump.sql ]; then
    if [ ! -f ${HOMEROOT}/scripts/metadata_featdef_tables.sql ]; then
        echo "Downloading SQL Table File..."
        wget -q https://storage.googleapis.com/sql-table-dumps/dev_test_dump_08_17_2016.sql -O ${HOMEROOT}/scripts/metadata_featdef_tables.sql
    fi
    echo "Applying SQL Table File... (may take a while)"
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < ${HOMEROOT}/scripts/metadata_featdef_tables.sql
else
    echo "Applying User Data SQL Table File... (may take a while)"
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < ${HOMEROOT}/user_data_dump.sql
fi

echo "Adding Stored Procedures/Views and making table alterations.."
python ${HOMEROOT}/scripts/database_catchup_scripts.py

echo "Adding Cohort/Site Data..."
python ${HOMEROOT}/scripts/add_site_ids.py
python ${HOMEROOT}/scripts/add_alldata_cohort.py $GCLOUD_PROJECT_ID -o cloudsql

echo "Running development dataset setup"
python ${HOMEROOT}/scripts/dataset_bootstrap.py -u $MYSQL_ROOT_USER -p $MYSQL_ROOT_PASSWORD -d $DATABASE_NAME

echo "Setting Up Social Application Login..."
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e "BEGIN; INSERT INTO socialaccount_socialapp (provider, name, client_id, secret) VALUES ('google', 'Google', '$GOOGLE_CLIENT_ID', '$GOOGLE_CLIENT_SECRET'); INSERT INTO socialaccount_socialapp_sites (socialapp_id, site_id) VALUES (1, 2), (1, 3), (1, 4); COMMIT;"

echo "Populating Gene Symbol list... (should take about 9 seconds)"
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < ${HOMEROOT}/scripts/populate_gene_symbols.sql
