export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null

echo "Starting server..."
sudo killall python 2> /dev/null
touch /home/vagrant/parentDir/output.log
/home/vagrant/google_appengine/dev_appserver.py --skip_sdk_update_check --host 0.0.0.0 --admin_host 0.0.0.0 /home/vagrant/www > /home/vagrant/parentDir/output.log 2> /home/vagrant/parentDir/error.log &
echo "Server Started"