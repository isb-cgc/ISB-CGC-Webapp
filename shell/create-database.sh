if [ -n "$CI" ]; then
    export HOME=/home/circleci
    export MYSQL_ROOT_USER=ubuntu
    export MYSQL_DB_HOST=127.0.0.1
else
    if ( "/home/vagrant/www/shell/get_env.sh" ) ; then
        export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
    else
        exit 1
    fi
    export HOME=/home/vagrant
    export MYSQL_ROOT_USER=root
    export MYSQL_DB_HOST=localhost
fi

if [ -z "$MYSQL_ROOT_PASSWORD" ]; then
  echo "No MySQL root password found! Can't install MySQL without a root password. Exiting..."
  exit 1
fi

# MySQL Install
echo "Installing MySQL"
echo "Note that you can ignore the \"root@localhost is created with an empty password\" message, which is due to root"
echo "  being created before the debconf password has been set."
sudo debconf-set-selections <<< "mysql-community-server mysql-community-server/root-pass password ${MYSQL_ROOT_PASSWORD}"
sudo debconf-set-selections <<< "mysql-community-server mysql-community-server/re-root-pass password ${MYSQL_ROOT_PASSWORD}"
sudo DEBIAN_FRONTEND=noninteractive apt-get -qq -y --force-yes install mysql-server

echo "Creating Databases..."
mysql -u${MYSQL_ROOT_USER} -p${MYSQL_ROOT_PASSWORD} -h ${MYSQL_DB_HOST} -e "CREATE DATABASE ${DATABASE_NAME}"
