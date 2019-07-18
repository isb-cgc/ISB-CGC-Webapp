echo "Installing dependencies for Feature Def and/or CloudSQL table export"

export HOME="$(pwd)"
export APPROOT="$(pwd)/ISB-CGC-WebApp"

apt-get -y --force-yes install software-properties-common
apt-get update -qq

# Install git
echo "Installing Git..."
apt-get install git

echo "Cloning repos..."
git clone -b master https://github.com/isb-cgc/ISB-CGC-Common.git
git clone -b master https://github.com/isb-cgc/ISB-CGC-WebApp.git

# Remove .pyc files; these can sometimes stick around and if a 
# model has changed names it will cause various load failures
find . -type f -name '*.pyc' -delete

echo "Install primary dependencies..."
apt-get install -qq -y --force-yes unzip libffi-dev libssl-dev libmysqlclient-dev mysql-client-5.6 python-dev ruby g++ gcc

# Install PIP + libraries
echo "Installing pip..."
curl --silent https://bootstrap.pypa.io/get-pip.py | python

echo "Installing Python Libraries..."
# Install PyCrypto in here so that GitHub won't constantly error about it
pip install pycrypto==2.6.1 -t ${HOME}/ISB-CGC-WebApp/lib --upgrade --only-binary all
pip install -q -r ${APPROOT}/requirements.txt -t ${APPROOT}/lib --upgrade --only-binary all

# Install Google App Engine
echo "Installing Google App Engine..."
wget https://storage.googleapis.com/appengine-sdks/featured/google_appengine_1.9.69.zip -O ${HOME}/google_appengine.zip
unzip -n -qq ./google_appengine.zip -d $HOME

# Update PATH and PYTHONPATH
export PYTHONPATH=${APPROOT}:${APPROOT}/lib:${HOME}/ISB-CGC-Common
export PATH=$PATH:${HOME}/google_appengine/

echo "PYTHONPATH: ${PYTHONPATH}"
echo "PATH: ${PATH}"

# Install the CloudSQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy
mkdir /cloudsql; sudo chmod 777 /cloudsql
./cloud_sql_proxy -dir=/cloudsql &

echo "...done."
echo "Remember to copy over the .env and service account credentials appropriate for the tier you will be working with."