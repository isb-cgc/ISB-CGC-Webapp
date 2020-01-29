if [ -n "$CI" ]; then
    export "[ERROR] Never refresh databases on deployments!"
else
    if ( "/home/vagrant/www/shell/get_env.sh" ) ; then
        export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
    else
        exit 1
    fi
    export MYSQL_ROOT_USER=root
    echo "Dropping database $DATABASE_NAME in prepatation for reload..."
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS $DATABASE_NAME"
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $DATABASE_NAME"
    echo "Database $DATABASE_NAME dropped and re-created."
    ( "/home/vagrant/www/shell/database-setup.sh" )
fi
