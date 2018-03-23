if [ -n "$CI" ]; then
    export HOME=/home/ubuntu
    export MYSQL_ROOT_USER=ubuntu
else
    export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null
    export HOME=/home/vagrant
    export MYSQL_ROOT_USER=root
fi

# MySQL Install
echo "Installing MySQL..."
sudo debconf-set-selections <<< "mysql-server-5.6 mysql-server/root_password password $MYSQL_ROOT_PASSWORD"
sudo debconf-set-selections <<< "mysql-server-5.6 mysql-server/root_password_again password $MYSQL_ROOT_PASSWORD"
sudo DEBIAN_FRONTEND=noninteractive apt-get -qq -y --force-yes install mysql-server-5.6

echo "Creating Databases..."
mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $DATABASE_NAME"