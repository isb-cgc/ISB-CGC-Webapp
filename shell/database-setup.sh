

if [ -n "$CI" ]; then
    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export MYSQL_ROOT_USER=root
    export MYSQL_DB_HOST=127.0.0.1
else
    export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
    export MYSQL_ROOT_USER=root
    export MYSQL_DB_HOST=localhost
fi

export PYTHONPATH=${HOMEROOT}/lib/:${HOMEROOT}/:${HOME}/google_appengine/:${HOME}/google_appengine/lib/protorpc-1.0/
echo $PYTHONPATH

echo "Increase group_concat max, for longer data type names"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "SET GLOBAL group_concat_max_len=18446744073709547520;"

echo "Creating django-user for web application..."
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON $DATABASE_NAME.* TO '${DATABASE_USER}'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"

echo "Creating api-user for API..."
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON $DATABASE_NAME.* TO 'api-user'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"

echo "Creating the definer account for any routines in the table file..."
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON $DATABASE_NAME.* TO 'dev-user'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"

# If we have migrations for older, pre-migrations apps which haven't yet been or will never be added to the database dump, make them here eg.:
# python ${HOMEROOT}/manage.py makemigrations <appname>
python ${HOMEROOT}/manage.py makemigrations adminrestrict
# Now run migrations
echo "Running Migrations..."
python ${HOMEROOT}/manage.py migrate --noinput

# If the ISB superuser isn't present already, they need to be added.
# echo "Creating isb superuser..."
# echo "from django.contrib.auth.models import User; User.objects.create_superuser('${SUPERUSER_USERNAME}', '', '${SUPERUSER_PASSWORD}')" | python ${HOMEROOT}/manage.py shell

echo "Adding in default Django admin IP allowances for local development"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e "INSERT INTO adminrestrict_allowedip (ip_address) VALUES('127.0.0.1'),('10.0.*.*');"

# Load your SQL table file
# Looks for metadata_featdef_tables.sql, if this isn't found, it downloads a file from GCS and saves it as
# metadata_featdef_tables.sql for future use
if [ ! -f ${HOMEROOT}/scripts/metadata_featdef_tables.sql ]; then
    # Sometimes CircleCI loses its authentication, re-auth with the dev key if we're on circleCI...
    if [ -n "$CI" ]; then
        sudo ${HOME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file ${HOMEROOT}/deployment.key.json
    # otherwise just use privatekey.json
    else
        sudo ${HOME}/google-cloud-sdk/bin/gcloud auth activate-service-account --key-file ${HOMEROOT}/privatekey.json
        sudo ${HOME}/google-cloud-sdk/bin/gcloud config set project "${GCLOUD_PROJECT_NAME}"
    fi
    echo "Downloading SQL Table File..."
    sudo ${HOME}/google-cloud-sdk/bin/gsutil cp "gs://${GCLOUD_BUCKET_DEV_SQL}/dev_table_and_routines_file.sql" ${HOMEROOT}/scripts/metadata_featdef_tables.sql
fi
echo "Applying SQL Table File... (may take a while)"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < ${HOMEROOT}/scripts/metadata_featdef_tables.sql

echo "Adding Cohort/Site Data and bootstrapping Django project and program tables..."
python ${HOMEROOT}/scripts/add_site_ids.py

if [ -n "$CI" ]; then
    # We don't add the prefab cohorts to BQ if we're in CircleCI
    python ${HOMEROOT}/scripts/add_alldata_cohort.py $GCLOUD_PROJECT_ID -o cloudsql -p True
else
    # ...but we do if we're doing a local build
    python ${HOMEROOT}/scripts/add_alldata_cohort.py $GCLOUD_PROJECT_ID -o all -p True -a True
fi

echo "Running development dataset setup"
python ${HOMEROOT}/scripts/dataset_bootstrap.py -u $MYSQL_ROOT_USER -p $MYSQL_ROOT_PASSWORD -d $DATABASE_NAME

echo "Setting Up Social Application Login..."
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e "BEGIN; INSERT INTO socialaccount_socialapp (provider, name, client_id, secret) VALUES ('google', 'Google', '$GOOGLE_CLIENT_ID', '$GOOGLE_CLIENT_SECRET'); INSERT INTO socialaccount_socialapp_sites (socialapp_id, site_id) VALUES (1, 2), (1, 3), (1, 4); COMMIT;"

echo "Populating Gene Symbol list..."
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < ${HOMEROOT}/scripts/populate_gene_symbols.sql
