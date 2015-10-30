if [ -n "$CI" ]; then
export HOME=/home/ubuntu
export MYSQL_ROOT_USER=ubuntu
else
export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null
export HOME=/home/vagrant/www
export MYSQL_ROOT_USER=root
fi

export PYTHONPATH=${HOME}/lib/:${HOME}/

echo "Running Migrations..."
python ${HOME}/manage.py makemigrations
python ${HOME}/manage.py migrate

echo "Creating Django User..."
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "GRANT SELECT, INSERT, UPDATE, DELETE ON $DATABASE_NAME.* TO \"django\"@\"localhost\" IDENTIFIED BY \"PASSWORD\""

# This is legacy code until these tables can be refactored out of the system
if [ ! -f ${HOME}/scripts/metadata_featdef_tables.sql ]; then
echo "Downloading SQL Table File..."
wget -q https://storage.googleapis.com/blink-uploads/metadata_featdef_tables.sql -O ${HOME}/scripts/metadata_featdef_tables.sql
fi
echo "Applying SQL Table File... (may take a while)"
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < ${HOME}/scripts/metadata_featdef_tables.sql

echo "Adding Cohort/Site Data..."
python ${HOME}/scripts/add_site_ids.py
python ${HOME}/scripts/add_alldata_cohort.py $GCLOUD_PROJECT_ID -o cloudsql

echo "Setting Up Social Application Login..."
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e "BEGIN; INSERT INTO socialaccount_socialapp (provider, name, client_id, secret) VALUES ('google', 'Google', '$GOOGLE_CLIENT_ID', '$GOOGLE_CLIENT_SECRET'); INSERT INTO socialaccount_socialapp_sites (socialapp_id, site_id) VALUES (1, 2), (1, 3), (1, 4); COMMIT;"