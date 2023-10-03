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
    export HOME=/home/circleci
    export MYSQL_ROOT_USER=ubuntu
    export MYSQL_DB_HOST=127.0.0.1
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
    export MYSQL_ROOT_USER=root
    export MYSQL_DB_HOST=localhost
fi

# MySQL Install
echo "Installing MySQL"
echo "Note that you can ignore the \"root@localhost is created with an empty password\" message, which is due to root"
echo "  being created before the debconf password has been set."
sudo debconf-set-selections <<< "mysql-community-server mysql-community-server/root-pass password ${MYSQL_ROOT_PASSWORD}"
sudo debconf-set-selections <<< "mysql-community-server mysql-community-server/re-root-pass password ${MYSQL_ROOT_PASSWORD}"
sudo DEBIAN_FRONTEND=noninteractive apt-get -qq -y --force-yes install mysql-server

echo "Creating Databases..."
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -h $MYSQL_DB_HOST -e "CREATE DATABASE $DATABASE_NAME"
