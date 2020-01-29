if [ -n "$CI" ]; then
    echo "[ERROR] Never refresh databases on deployments!"
    exit 1
else
    # Doublecheck where we're running this...
    if [ $DATABASE_HOST != "localhost" ]; then
        echo "[ERROR] Possible remote database detected! This script IS ONLY intended for use on local developer builds!"
        echo "[ERROR] Host seen: ${DATABASE_HOST}"
        exit 1
    fi
    export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
    export MYSQL_ROOT_USER=root
    echo "Dropping database $DATABASE_NAME in prepatation for reload..."
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS $DATABASE_NAME"
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $DATABASE_NAME"
    echo "Database $DATABASE_NAME dropped and re-created."
    ( "/home/vagrant/www/shell/database-setup.sh" )
fi
