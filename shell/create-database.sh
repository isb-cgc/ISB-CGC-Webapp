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
echo "Installing MySQL..."
sudo debconf-set-selections <<< "mysql-server-5.7 mysql-server/root_password password $MYSQL_ROOT_PASSWORD"
sudo debconf-set-selections <<< "mysql-server-5.7 mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD"
sudo DEBIAN_FRONTEND=noninteractive apt-get -qq -y --force-yes install mysql-server-5.7

echo "Creating Databases..."
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -h $MYSQL_DB_HOST -e "CREATE DATABASE $DATABASE_NAME"