export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null

# Install apt-get dependencies
echo "Installing Dependencies..."
apt-get update -qq
apt-get install -qq -y unzip libffi-dev libssl-dev libmysqlclient-dev python2.7-dev git
echo "Dependencies Installed"

# Install PIP + Dependencies
echo "Installing Python Libraries..."
curl --silent https://bootstrap.pypa.io/get-pip.py | python
pip install -q -r /home/vagrant/www/requirements.txt -t /home/vagrant/www/lib --upgrade --only-binary all
echo "Libraries Installed"

# Install Google App Engine
echo "Installing Google App Engine..."
wget -q https://storage.googleapis.com/appengine-sdks/featured/google_appengine_1.9.27.zip -O /home/vagrant/google_appengine.zip
unzip -nq /home/vagrant/google_appengine.zip -d /home/vagrant
export PATH=$PATH:/home/vagrant/google_appengine/
echo "Google App Engine Installed"

# Install Google Cloud SDK
echo "Installing Google Cloud SDK..."
export CLOUD_SDK_REPO=cloud-sdk-`lsb_release -c -s`
echo "deb http://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
curl --silent https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
apt-get -qq update
apt-get -qq install google-cloud-sdk
echo "Google Cloud SDK Installed"