if ( "/home/vagrant/www/shell/get_env.sh" ) ; then
    export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
else
    echo "[ERROR] Environment variable file not found! Build cannot proceed."
    exit 1
fi

if [ "$IS_DEV" = "True" ]; then
    if [ "$DATABASE_HOST" != "localhost" ] || [ -n "$DB_SSL_CERT" ]; then
        echo "[ERROR] IS_DEV set to true but DATABASE_HOST is a non-localhost value (${DATABASE_HOST}) or the SSL certs are set (${DB_SSL_CERT})!"
        echo "[ERROR] This is dangerous, as the Vagrant build process could destroy a remote database. DO NOT run the Vagrant build against a remote database!"
        exit 1
    fi
fi
