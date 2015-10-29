export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null

# Install and update apt-get info
echo "Preparing System..."
apt-get -y install software-properties-common
export CLOUD_SDK_REPO=cloud-sdk-`lsb_release -c -s`
echo "deb http://packages.cloud.google.com/apt $CLOUD_SDK_REPO main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
# Add apt-get repository to update python from 2.7.6 (default) to latest 2.7.x
add-apt-repository -y ppa:fkrull/deadsnakes-python2.7
curl --silent https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -
apt-get update -qq

# Install apt-get dependencies
echo "Installing Dependencies..."
apt-get install -qq -y unzip libffi-dev libssl-dev libmysqlclient-dev python2.7 python2.7-dev git
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
mkdir /home/vagrant/www/lib/endpoints/ 2> /dev/null
cp /home/vagrant/google_appengine/lib/endpoints-1.0/endpoints/* /home/vagrant/www/lib/endpoints/
echo "Google App Engine Installed"

# Install Google Cloud SDK
echo "Installing Google Cloud SDK..."
apt-get -qq install google-cloud-sdk
echo "Google Cloud SDK Installed"