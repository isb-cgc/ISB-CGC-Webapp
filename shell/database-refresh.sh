###
# Copyright 2015-2023, Institute for Systems Biology
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
    echo "[ERROR] Never refresh databases on deployments!"
    exit 1
else
    if ( "/home/vagrant/www/shell/get_env.sh" ) ; then
        export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
        if [ -z "${SECURE_LOCAL_PATH}" ] || [ "${SECURE_LOCAL_PATH}" == "" ] ; then
            echo "[ERROR] SECURE_LOCAL_PATH not found, but this is a VM build! Something might be wrong with your .env file"
            echo "or your secure_files directory."
            exit 1
        fi
    else
        echo "[ERROR] Unable to run get_env.sh!"
        exit 1
    fi
    # Doublecheck where we're running this...
    if [ "${DATABASE_HOST}" != "localhost" ]; then
        echo "[ERROR] Possible remote database detected! This script IS ONLY intended for use on local developer builds!"
        echo "[ERROR] Host seen: ${DATABASE_HOST}"
        exit 1
    fi
    echo "Dropping database $DATABASE_NAME in preparation for reload..."
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS $DATABASE_NAME"
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $DATABASE_NAME"
    echo "Database $DATABASE_NAME dropped and re-created."
    ( "/home/vagrant/www/shell/database-setup.sh" )
fi
