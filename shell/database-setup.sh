###
# Copyright 2015-2024, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

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
    mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "CREATE USER IF NOT EXISTS 'ubuntu'@'%' IDENTIFIED BY 'ubuntu';"
    mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'ubuntu'@'%';"
    mysql -u $MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON *.* TO 'ubuntu'@'localhost';"
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
# python3 ${HOMEROOT}/manage.py makemigrations

# TODO: Check for migrations table, if not found, migrate and add IPs

# Now run migrations
echo "Running Migrations..."
python3 ${HOMEROOT}/manage.py migrate --noinput

echo "Adding in default Django admin IP allowances for local development"
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e "INSERT INTO adminrestrict_allowedip (ip_address) VALUES('127.0.0.1'),('10.0.*.*');"

# TODO: check for metadata via record found of eg. attributes or projects, if not found, load

# Load your SQL table file
# Looks for cgc_metadata.sql, if this isn't found, it downloads a file from GCS and saves it as
# cgc_metadata.sql for future use
if [ ! -f ${HOMEROOT}/scripts/cgc_metadata.sql ]; then
    # Sometimes CircleCI loses its authentication, re-auth with the dev key if we're on circleCI...
    if [ -n "$CI" ]; then
        sudo gcloud auth activate-service-account --key-file ${HOMEROOT}/deployment.key.json
    # otherwise just use privatekey.json
    else
        sudo gcloud auth activate-service-account --key-file ${GOOGLE_APPLICATION_CREDENTIALS}
        sudo gcloud config set project "${GCLOUD_PROJECT_ID}"
    fi
    echo "Downloading SQL Table File..."
    sudo gsutil cp "gs://${GCLOUD_BUCKET_DEV_SQL}/cgc_metadata.sql" ${HOMEROOT}/scripts/cgc_metadata.sql
fi

if [ ! -f ${HOMEROOT}/scripts/cgc_metadata.sql ]; then
    echo "[ERROR] Unable to download database seed file -halting build."
    exit 1
fi

echo "Applying CGC Metadata SQL Table File..."
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME < ${HOMEROOT}/scripts/cgc_metadata.sql

# Rename this script to 'add site and social data' and fold in the socialapp setup
# TODO: Check for socialaccount settings before adding
echo "Adding Site Data..."
python3 ${HOMEROOT}/scripts/add_site_ids.py

# We have to use '' around the statement due to the need to use `` around name and key, which are MySQL keywords, so concatenation is needed to
# preserve expansion of GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
echo "Setting Up Social Application Login..."
mysql -u$MYSQL_ROOT_USER -h $MYSQL_DB_HOST -p$MYSQL_ROOT_PASSWORD -D$DATABASE_NAME -e 'BEGIN; INSERT INTO socialaccount_socialapp (provider, provider_id, `name`, client_id, secret, `key`) VALUES("google", "google", "Google", "'$OAUTH2_CLIENT_ID'", "'$OAUTH2_CLIENT_SECRET'", " "); INSERT INTO socialaccount_socialapp_sites (socialapp_id, site_id) VALUES(1, 2), (1, 3), (1, 4); COMMIT;'

# Setting up Cron token
python3 ${HOMEROOT}/scripts/create_api_token.py

# Check system config
python3 ${HOMEROOT}/manage.py check
