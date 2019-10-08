if [ -n "$CI" ]; then
    export HOME=/home/circleci
    export MYSQL_ROOT_USER=ubuntu
    export MYSQL_DB_HOST=127.0.0.1
else
    export $(cat /home/vagrant/parentDir/secure_files/idc/.env | grep -v ^# | xargs) 2> /dev/null
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