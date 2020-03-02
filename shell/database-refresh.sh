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
    export MYSQL_ROOT_USER=root
    echo "Dropping database $DATABASE_NAME in prepatation for reload..."
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "DROP DATABASE IF EXISTS $DATABASE_NAME"
    mysql -u$MYSQL_ROOT_USER -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE $DATABASE_NAME"
    echo "Database $DATABASE_NAME dropped and re-created."
    ( "/home/vagrant/www/shell/database-setup.sh" )
fi
