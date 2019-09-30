if [ -n "$CI" ]; then
    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    # Set test database settings; this database will be thrown away at the end
    export MYSQL_ROOT_USER=root
    export MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD_BUILD}
    export MYSQL_DB_HOST=127.0.0.1
    export DATABASE_USER=${DATABASE_USER_BUILD}
    export DATABASE_PASSWORD=${MYSQL_ROOT_PASSWORD_BUILD}
    export DATABASE_NAME=${DATABASE_NAME_BUILD}
    expirt DATABASE_HOST=${DATABASE_HOST_BUILD}
    # Give the 'ubuntu' test user access
    mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'ubuntu'@'%' IDENTIFIED BY 'isb';"
else
    export $(cat /home/vagrant/parentDir/secure_files/.env | grep -v ^# | xargs) 2> /dev/null
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
    export MYSQL_ROOT_USER=root
    export MYSQL_DB_HOST=localhost
fi

export PYTHONPATH=${HOMEROOT}:${HOMEROOT}/lib:${HOMEROOT}/IDC-Common
echo $PYTHONPATH

echo "Increase group_concat max, for longer data type names"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "SET GLOBAL group_concat_max_len=18446744073709547520;"

echo "Creating database users..."
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER '${DATABASE_USER}'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER 'api-user'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER 'dev-user'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER '${DATABASE_USER}'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER 'api-user'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER 'dev-user'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"

echo "Granting permissions to database users..."
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON ${DATABASE_NAME}.* TO '${DATABASE_USER}'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON ${DATABASE_NAME}.* TO '${DATABASE_USER}'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON ${DATABASE_NAME}.* TO 'api-user'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON ${DATABASE_NAME}.* TO 'api-user'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON ${DATABASE_NAME}.* TO 'dev-user'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON ${DATABASE_NAME}.* TO 'dev-user'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"


# If we have migrations for older, pre-migrations apps which haven't yet been or will never be added to the database dump, make them here eg.:
# python3 ${HOMEROOT}/manage.py makemigrations <appname>
python3 ${HOMEROOT}/manage.py makemigrations adminrestrict
# Now run migrations
echo "Running Migrations..."
python3 ${HOMEROOT}/manage.py migrate --noinput

# If the ISB superuser isn't present already, they need to be added.
# echo "Creating isb superuser..."
# echo "from django.contrib.auth.models import User; User.objects.create_superuser('${SUPERUSER_USERNAME}', '', '${SUPERUSER_PASSWORD}')" | python3 ${HOMEROOT}/manage.py shell

echo "Adding in default Django admin IP allowances for local development"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e "INSERT INTO adminrestrict_allowedip (ip_address) VALUES('127.0.0.1'),('10.0.*.*');"

echo "Adding Django site IDs..."
python3 ${HOMEROOT}/scripts/add_site_ids.py

# We have to use '' around the statement due to the need to use `` around name and key, which are MySQL keywords, so concatenation is needed to
# preserve expansion of GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
echo "Setting Up Social Application Login..."
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e 'BEGIN; INSERT INTO socialaccount_socialapp (provider, `name`, client_id, secret, `key`) VALUES("google", "Google", "'$OAUTH2_CLIENT_ID'", "'$OAUTH2_CLIENT_SECRET'", " "); INSERT INTO socialaccount_socialapp_sites (socialapp_id, site_id) VALUES(1, 2), (1, 3); COMMIT;'
