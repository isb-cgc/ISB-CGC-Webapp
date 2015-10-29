export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null

# MySQL Install
echo "Installing MySQL..."
sudo debconf-set-selections <<< "mysql-server-5.1 mysql-server/root_password password $MYSQL_ROOT_PASSWORD"
sudo debconf-set-selections <<< "mysql-server-5.1 mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD"
sudo apt-get -qq -y install mysql-server

echo "Creating Databases..."
mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $DATABASE_NAME"

export PYTHONPATH=/home/vagrant/www/lib/:/home/vagrant/www/

echo "Running Migrations..."
python /home/vagrant/www/manage.py makemigrations
python /home/vagrant/www/manage.py migrate

echo "Creating Django User..."
mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "GRANT SELECT, INSERT, UPDATE, DELETE ON $DATABASE_NAME.* TO \"django\"@\"localhost\" IDENTIFIED BY \"PASSWORD\""

# This is legacy code until these tables can be refactored out of the system
if [ ! -f /home/vagrant/www/scripts/metadata_featdef_tables.sql ]; then
echo "Downloading SQL Table File..."
wget -q https://storage.googleapis.com/blink-uploads/metadata_featdef_tables.sql -O /home/vagrant/www/scripts/metadata_featdef_tables.sql
fi
echo "Applying SQL Table File... (may take a while)"
mysql -uroot -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < /home/vagrant/www/scripts/metadata_featdef_tables.sql

echo "Adding Cohort/Site Data..."
python /home/vagrant/www/scripts/add_site_ids.py
python /home/vagrant/www/scripts/add_alldata_cohort.py $GCLOUD_PROJECT_ID -o cloudsql

echo "Setting Up Social Application Login..."
mysql -uroot -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e "BEGIN; INSERT INTO socialaccount_socialapp (provider, name, client_id, secret) VALUES ('google', 'Google', '$GOOGLE_CLIENT_ID', '$GOOGLE_CLIENT_SECRET'); INSERT INTO socialaccount_socialapp_sites (socialapp_id, site_id) VALUES (1, 2), (1, 3), (1, 4); COMMIT;"