export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null

echo "Killing any running processes..."
sudo killall -9 sass 2> /dev/null
sudo killall -9 python 2> /dev/null
sleep 10
echo "Starting SASS compiler..."
sass --watch /home/vagrant/www/sass/main.sass:/home/vagrant/www/static/css/main.css > /home/vagrant/parentDir/outputSASS.log 2> /home/vagrant/parentDir/errorSASS.log &
echo "Starting server..."
touch /home/vagrant/parentDir/output.log
/home/vagrant/google_appengine/dev_appserver.py --skip_sdk_update_check --use_mtime_file_watcher=True --host 0.0.0.0 --admin_host 0.0.0.0 /home/vagrant/www > /home/vagrant/parentDir/output.log 2> /home/vagrant/parentDir/error.log &
# TODO: Yeah... this isn't the proper way to do this, but the curl wait doesn't want to work
sleep 8
echo "Server Started"