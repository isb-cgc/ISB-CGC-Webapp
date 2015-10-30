if [ -n "$CI" ]; then
export HOME=/home/ubuntu
export HOMEROOT=/home/ubuntu/ISB-CGC-WebApp
else
export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null
export HOME=/home/vagrant
export HOMEROOT=/home/vagrant/www
fi

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
pip install -q -r ${HOMEROOT}/requirements.txt -t ${HOMEROOT}/lib --upgrade --only-binary all
echo "Libraries Installed"

# Install Google App Engine
echo "Installing Google App Engine..."
wget -q https://storage.googleapis.com/appengine-sdks/featured/google_appengine_1.9.27.zip -O ${HOME}/google_appengine.zip
unzip -nq ${HOME}/google_appengine.zip -d $HOME
export PATH=$PATH:${HOME}/google_appengine/
mkdir ${HOMEROOT}/lib/endpoints/ 2> /dev/null
cp ${HOME}/google_appengine/lib/endpoints-1.0/endpoints/* ${HOMEROOT}/lib/endpoints/
echo "Google App Engine Installed"

# Install Google Cloud SDK
echo "Installing Google Cloud SDK..."
apt-get -qq install google-cloud-sdk
echo "Google Cloud SDK Installed"