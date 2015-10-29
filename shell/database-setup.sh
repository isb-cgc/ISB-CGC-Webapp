export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null

# MySQL Install
echo "Installing MySQL..."
sudo debconf-set-selections <<< "mysql-server-5.1 mysql-server/root_password password $MYSQL_PASSWORD"
sudo debconf-set-selections <<< "mysql-server-5.1 mysql-server/root_password_again password $MYSQL_PASSWORD"
sudo apt-get -qq -y install mysql-server

echo "Creating Databases..."
mysql -uroot -p$MYSQL_PASSWORD -e 'CREATE DATABASE dev'
mysql -uroot -p$MYSQL_PASSWORD -e 'CREATE DATABASE test'
mysql -uroot -p$MYSQL_PASSWORD -e 'CREATE DATABASE prod'
mysql -uroot -p$MYSQL_PASSWORD -e 'CREATE DATABASE stage'

export PYTHONPATH=/home/vagrant/www/lib/

echo "Running Migrations..."
python /home/vagrant/www/manage.py makemigrations
python /home/vagrant/www/manage.py migrate

echo "Creating Django User..."
mysql -uroot -p$MYSQL_PASSWORD -e 'GRANT SELECT, INSERT, UPDATE, DELETE ON dev.* TO "django"@"localhost" IDENTIFIED BY "PASSWORD"'
mysql -uroot -p$MYSQL_PASSWORD -e 'GRANT SELECT, INSERT, UPDATE, DELETE ON test.* TO "django"@"localhost" IDENTIFIED BY "PASSWORD"'
mysql -uroot -p$MYSQL_PASSWORD -e 'GRANT SELECT, INSERT, UPDATE, DELETE ON prod.* TO "django"@"localhost" IDENTIFIED BY "PASSWORD"'
mysql -uroot -p$MYSQL_PASSWORD -e 'GRANT SELECT, INSERT, UPDATE, DELETE ON stage.* TO "django"@"localhost" IDENTIFIED BY "PASSWORD"'

# This is legacy code until these tables can be refactored out of the system
echo "Downloading SQL Table File..."
wget -q https://storage.googleapis.com/blink-uploads/metadata_featdef_tables.sql -o /home/vagrant/www/scripts/metadata_featdef_tables.sql
mysql -uroot -p$MYSQL_PASSWORD < /home/vagrant/www/scripts/metadata_featdef_tables.sql

echo "Adding Cohorot/Site Data..."
python /home/vagrant/www/scripts/add_alldata_cohort.py $PROJECT_ID
python /home/vagrant/www/scripts/add_site_ids.py