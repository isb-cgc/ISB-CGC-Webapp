export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null

echo "Killing any running processes..."
sudo killall -9 sass 2> /dev/null
sleep 10
echo "Starting SASS compiler..."
sass --watch /home/vagrant/www/sass/main.sass:/home/vagrant/www/static/css/main.css > /home/vagrant/parentDir/outputSASS.log 2> /home/vagrant/parentDir/errorSASS.log &
