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
    export DATABASE_HOST=${DATABASE_HOST_BUILD}
    # Give the 'ubuntu' test user access
    mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'ubuntu'@'%' IDENTIFIED BY 'isb';"
else
    if ( "/home/vagrant/www/shell/get_env.sh" ) ; then
        export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
        if [ -z "${SECURE_LOCAL_PATH}" ] || [ "${SECURE_LOCAL_PATH}" == "" ] ; then
            echo "[ERROR] SECURE_LOCAL_PATH not found, but this is a VM build! Something might be wrong with your .env file"
            echo "or your secure_files directory."
            exit 1
        fi
    else
        exit 1
    fi
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
    export MYSQL_ROOT_USER=root
    export MYSQL_DB_HOST=localhost
fi

export PYTHONPATH=${HOMEROOT}:${HOMEROOT}/lib:${HOMEROOT}/ISB-CGC-Common
echo "PYTHONPATH is ${PYTHONPATH}"

echo "Increase group_concat max, for longer data type names"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "SET GLOBAL group_concat_max_len=18446744073709547520;"

echo "Creating django-user for web application..."
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER IF NOT EXISTS '${DATABASE_USER}'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER IF NOT EXISTS '${DATABASE_USER}'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"

echo "Creating api-user for API..."
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER IF NOT EXISTS 'api-user'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER IF NOT EXISTS 'api-user'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"

echo "Creating the definer account for any routines in the table file..."
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER IF NOT EXISTS 'dev-user'@'%' IDENTIFIED BY '${DATABASE_PASSWORD}';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER IF NOT EXISTS 'dev-user'@'localhost' IDENTIFIED BY '${DATABASE_PASSWORD}';"

echo "Grant django-user privs"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO '${DATABASE_USER}'@'%';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO '${DATABASE_USER}'@'localhost';"

echo "Grant api-user privs"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'api-user'@'%';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'api-user'@'localhost';"

echo "Grant dev-user privs"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'dev-user'@'%';"
mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'dev-user'@'localhost';"

# If we have migrations for older, pre-migrations apps which haven't yet been or will never be added to the database dump, make them here eg.:
# python3 ${HOMEROOT}/manage.py makemigrations <appname>

# Now run migrations
echo "Running Migrations..."
python3 ${HOMEROOT}/manage.py migrate --noinput

echo "Adding in default Django admin IP allowances for local development"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e "INSERT INTO adminrestrict_allowedip (ip_address) VALUES('127.0.0.1'),('10.0.*.*');"

# Load your SQL table file
# Looks for metadata_featdef_tables.sql, if this isn't found, it downloads a file from GCS and saves it as
# metadata_featdef_tables.sql for future use
if [ ! -f ${HOMEROOT}/scripts/metadata_featdef_tables.sql ]; then
    # Sometimes CircleCI loses its authentication, re-auth with the dev key if we're on circleCI...
    if [ -n "$CI" ]; then
        sudo gcloud auth activate-service-account --key-file ${HOMEROOT}/deployment.key.json
    # otherwise just use privatekey.json
    else
        sudo gcloud auth activate-service-account --key-file ${HOMEROOT}/${SECURE_LOCAL_PATH}${GOOGLE_APPLICATION_CREDENTIALS}
        sudo gcloud config set project "${GCLOUD_PROJECT_ID}"
    fi
    echo "Downloading SQL Table File..."
    sudo gsutil cp "gs://${GCLOUD_BUCKET_DEV_SQL}/dev_table_and_routines_file.sql" ${HOMEROOT}/scripts/metadata_featdef_tables.sql
fi

if [ ! -f ${HOMEROOT}/scripts/metadata_featdef_tables.sql ]; then
    echo "[ERROR] Unable to download database seed file -halting build."
    exit 1
fi

echo "Applying SQL Table File... (may take a while)"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < ${HOMEROOT}/scripts/metadata_featdef_tables.sql

echo "Adding Cohort/Site Data and bootstrapping Django project and program tables..."
python3 ${HOMEROOT}/scripts/add_site_ids.py

# Add in the 'All TCGA' cohort
if [ -n "$CI" ]; then
    # We don't add the prefab cohorts to BQ if we're in CircleCI
    python3 ${HOMEROOT}/scripts/add_alldata_cohort.py -o cloudsql -p False
else
    # ...but we do if we're doing a local build
    python3 ${HOMEROOT}/scripts/add_alldata_cohort.py -f $GCLOUD_PROJECT_ID -o all -p False
fi

# We have to use '' around the statement due to the need to use `` around name and key, which are MySQL keywords, so concatenation is needed to
# preserve expansion of GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
echo "Setting Up Social Application Login..."
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e 'BEGIN; INSERT INTO socialaccount_socialapp (provider, `name`, client_id, secret, `key`) VALUES("google", "Google", "'$OAUTH2_CLIENT_ID'", "'$OAUTH2_CLIENT_SECRET'", " "); INSERT INTO socialaccount_socialapp_sites (socialapp_id, site_id) VALUES(1, 2), (1, 3), (1, 4); COMMIT;'

# Setting up Cron token
python3 ${HOMEROOT}/scripts/create_api_token.py

# Check system config
python3 ${HOMEROOT}/manage.py check
