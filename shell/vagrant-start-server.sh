export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
if [ -z "${SECURE_LOCAL_PATH}" ] || [ "${SECURE_LOCAL_PATH}" == "" ] ; then
    echo "[ERROR] SECURE_LOCAL_PATH not found, but this is a VM build! Something might be wrong with your .env file"
    echo "or your secure_files directory."
    exit 1
fi

echo "Killing any running processes..."
sudo killall -9 sass 2> /dev/null
sleep 10
echo "Starting SASS compiler..."
sass --poll --watch /home/vagrant/www/sass/main.sass:/home/vagrant/www/static/css/main.css > /home/vagrant/parentDir/outputSASS.log 2> /home/vagrant/parentDir/errorSASS.log &
