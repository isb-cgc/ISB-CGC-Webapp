if [ -n "$CI" ]; then
    export HOME=/home/ubuntu/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/ubuntu/${CIRCLE_PROJECT_REPONAME}

    # Clone dependencies
    git clone -b master https://github.com/isb-cgc/ISB-CGC-Common.git

    # Remove .pyc files; these can sometimes stick around and if a
    # model has changed names it will cause various load failures
    find . -type f -name '*.pyc' -delete

else
    export $(cat /home/vagrant/www/.env | grep -v ^# | xargs) 2> /dev/null
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
fi

# Install and update apt-get info
echo "Preparing System..."
apt-get -y --force-yes install software-properties-common
if [ -n "$CI" ]; then
    # CI Takes care of Python update
    apt-get update -qq
else
    # Add apt-get repository to update python from 2.7.6 (default) to latest 2.7.x
    add-apt-repository -y ppa:fkrull/deadsnakes-python2.7
    apt-get update -qq
    apt-get install -qq -y --force-yes python2.7
fi

# Install apt-get dependencies
echo "Installing Dependencies..."
apt-get install -qq -y --force-yes unzip libffi-dev libssl-dev libmysqlclient-dev python2.7-dev git ruby g++
echo "Dependencies Installed"

# Install PIP + Dependencies
echo "Installing Python Libraries..."
curl --silent https://bootstrap.pypa.io/get-pip.py | python
if [ -z "$CI" ]; then
    # Clean out lib to prevent confusion over multiple builds in local development
    rm -rf "${HOMEROOT}/lib/*"
fi
pip install -q -r ${HOMEROOT}/requirements.txt -t ${HOMEROOT}/lib --upgrade --only-binary all
if [ "$DEBUG" = "True" ] && [ "$DEBUG_TOOLBAR" = "True" ]; then
    pip install -q django-debug-toolbar -t ${HOMEROOT}/lib --only-binary all
fi

echo "Libraries Installed"

# Install SASS
gem install sass

# Install Google App Engine
echo "Installing Google App Engine..."
wget https://storage.googleapis.com/appengine-sdks/featured/google_appengine_1.9.69.zip -O ${HOME}/google_appengine.zip
unzip -n -qq ${HOME}/google_appengine.zip -d $HOME
export PATH=$PATH:${HOME}/google_appengine/
# If we are in circleCI, we place the endpoints library into a directory where the Dockerfile can find it...
if [ -n "$CI" ]; then
    mkdir ${HOMEROOT}/endpoints/ 2> /dev/null
    cp ${HOME}/google_appengine/lib/endpoints-1.0/endpoints/* ${HOMEROOT}/endpoints/
else
# ...otherwise, we place it directly into /lib/ with the other libraries
    mkdir ${HOMEROOT}/lib/endpoints/ 2> /dev/null
    cp ${HOME}/google_appengine/lib/endpoints-1.0/endpoints/* ${HOMEROOT}/lib/endpoints/
fi

ls ${HOMEROOT}

echo "Google App Engine Installed"

# Install Google Cloud SDK
echo "Installing Google Cloud SDK..."
export CLOUDSDK_CORE_DISABLE_PROMPTS=1
curl https://sdk.cloud.google.com | bash
export PATH=$PATH:${HOME}/google-cloud-sdk/bin
echo 'export PATH=$PATH:${HOME}/google-cloud-sdk/bin' | tee -a ${HOME}/.bash_profile
echo "Google Cloud SDK Installed"