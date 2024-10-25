export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null

