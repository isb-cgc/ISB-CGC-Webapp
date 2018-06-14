if [ -n "$CI" ]; then
    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}

    # Clone dependencies
    git clone -b isb-cgc-uat https://github.com/isb-cgc/ISB-CGC-Common.git

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
    add-apt-repository -y ppa:jonathonf/python-2.7
    apt-get update -qq
    apt-get install -qq -y --force-yes python2.7
fi

# Install apt-get dependencies
echo "Installing Dependencies..."
apt-get install -qq -y --force-yes unzip libffi-dev libssl-dev mysql-client libmysqlclient-dev python2.7-dev git ruby g++
echo "Dependencies Installed"

# Install PIP + Dependencies
echo "Installing pip..."
curl --silent https://bootstrap.pypa.io/get-pip.py | python

# If this is local development, clean out lib for a re-structuring
if [ -z "${CI}" ]; then
    # Clean out lib to prevent confusion over multiple builds in local development
    # and prep for local install
    echo "Emptying out ${HOMEROOT}/lib/ ..."
    rm -rf "${HOMEROOT}/lib/*"
    mkdir "${HOMEROOT}/lib/endpoints_lib/"
fi

# Install our primary python libraries
# If we're not on CircleCI, or we are but the lib directory isn't there (cache miss), install lib
if [ -z "${CI}" ] || [ ! -d "lib" ]; then
    echo "Installing Python Libraries..."
    pip install -q -r ${HOMEROOT}/requirements.txt -t ${HOMEROOT}/lib --upgrade --only-binary all
else
    echo "Using restored cache for Python Libraries"
fi

if [ -z "${CI}" ]; then
    # Install the Endpoints library for API usage (separate directory because the WebApp doesn't need it
    echo "Installing Google Endpoints for local API..."
    pip install -t "${HOMEROOT}/lib/endpoints_lib/" google-endpoints==3.0.0 --only-binary --ignore-installed

    # Delete the offending collision packages (socketserver and queue) which create issues with six
    echo "Removing colliding packages (socketserver and queue)"
    rm -rf "${HOMEROOT}/lib/endpoints_lib/queue"
    rm -rf "${HOMEROOT}/lib/endpoints_lib/socketserver"
fi

if [ "$DEBUG" = "True" ] && [ "$DEBUG_TOOLBAR" = "True" ]; then
    echo "Installing Django Debug Toolbar for local dev..."
    pip install -q django-debug-toolbar -t ${HOMEROOT}/lib --only-binary all
fi

echo "Libraries Installed"

# Install SASS
gem install sass

# Install Google App Engine
# If we're not on CircleCI or we are but google_appengine isn't there, install it
if [ -z "${CI}" ] || [ ! -d "google_appengine" ]; then
    echo "Installing Google App Engine..."
    wget https://storage.googleapis.com/appengine-sdks/featured/google_appengine_1.9.69.zip -O ${HOME}/google_appengine.zip
    unzip -n -qq ${HOME}/google_appengine.zip -d $HOME
    export PATH=$PATH:${HOME}/google_appengine/
    echo "Google App Engine Installed"
else
    echo "Using restored cache for Google App Engine."
fi

# Install Google Cloud SDK
# If we're not on CircleCI or we are but google-cloud-sdk isn't there, install it
if [ -z "${CI}" ] || [ ! -d "google-cloud-sdk" ]; then
    echo "Installing Google Cloud SDK..."
    export CLOUDSDK_CORE_DISABLE_PROMPTS=1
    curl https://sdk.cloud.google.com | bash
    export PATH=$PATH:${HOME}/google-cloud-sdk/bin
    echo 'export PATH=$PATH:${HOME}/google-cloud-sdk/bin' | tee -a ${HOME}/.bash_profile
    echo "Google Cloud SDK Installed"
else
    echo "Using restored cache for Google Cloud SDK."
fi
