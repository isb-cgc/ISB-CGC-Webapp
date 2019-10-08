if [ -n "$CI" ]; then
    export "[ERROR] Never refresh databases on deployments!"
else
    export $(cat /home/vagrant/parentDir/secure_files/idc/.env | grep -v ^# | xargs) 2> /dev/null
    export MYSQL_ROOT_USER=root
    echo "Dropping database $DATABASE_NAME in prepatation for reload..."
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS $DATABASE_NAME"
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $DATABASE_NAME"
    echo "Database $DATABASE_NAME dropped and re-created."
    ( "/home/vagrant/www/shell/database-setup.sh" )
fi
