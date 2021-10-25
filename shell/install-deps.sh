if [ -n "$CI" ]; then
    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}

    # Clone dependencies
    COMMON_BRANCH=master
    if [[ ${CIRCLE_BRANCH} =~ isb-cgc-(prod|uat|test).* ]]; then
        COMMON_BRANCH=$(awk -F- '{print $1"-"$2"-"$3}' <<< ${CIRCLE_BRANCH})
    fi
    echo "Cloning ISB-CGC-Common branch ${COMMON_BRANCH}..."
    git clone -b ${COMMON_BRANCH} https://github.com/isb-cgc/ISB-CGC-Common.git
else
    if ( "/home/vagrant/www/shell/get_env.sh" ) ; then
        export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
        # Confirm some relevant values to ensure we found a valid .env
        if [ -z "${SECURE_LOCAL_PATH}" ] || [ "${SECURE_LOCAL_PATH}" == "" ] ; then
            echo "[ERROR] SECURE_LOCAL_PATH not found, but this is a VM build! Something might be wrong with your .env file"
            echo "or your secure_files directory."
            exit 1
        fi
    else
        exit 1
    fi
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
fi

# Remove .pyc files; these can sometimes stick around and if a
# model has changed names it will cause various load failures
find . -type f -name '*.pyc' -delete

# Install and update apt-get info
echo "Preparing System..."
apt-get -y --force-yes install software-properties-common
if [ -n "$CI" ]; then
    # Use these next 4 lines to update mysql public build key
    echo 'download mysql public build key'
    apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 5072E1F5
#    wget -O - -q 'https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x8C718D3B5072E1F5' | grep -v '>' | grep -v '<' | grep -v '{' > mysql_pubkey.asc
#    apt-key add mysql_pubkey.asc || exit 1
    echo 'mysql build key update done.'
    wget https://dev.mysql.com/get/mysql-apt-config_0.8.9-1_all.deb
    apt-get install -y lsb-release
    dpkg -i mysql-apt-config_0.8.9-1_all.deb
fi




apt-get update -qq
apt-get install ca-certificates

# Install apt-get dependencies
echo "Installing Dependencies..."
apt-get install -y --force-yes unzip libffi-dev libssl-dev git ruby g++ curl dos2unix

# CircleCI provides a Python 3.7 image, but locally, we have to do that ourselves.
if [ -z "${CI}" ]; then
    # Update to Python 3.7
    add-apt-repository ppa:deadsnakes/ppa
    apt update
    apt install -y --force-yes python3.7

    # Set Python 3.7 as the python3 version
    update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.7 1

    apt-get install -y --force-yes python3.7-venv python3.7-distutils python3.7-dev
fi

apt-get install -y --force-yes python3-mysqldb libmysqlclient-dev libpython3-dev build-essential
apt-get install -y --force-yes mysql-client

echo "Dependencies Installed"

# If this is local development, clean out lib for a re-structuring 
if [ -z "${CI}" ]; then
    # Clean out lib to prevent confusion over multiple builds in local development
    # and prep for local install
    echo "Emptying out ${HOMEROOT}/lib/ ..."
    rm -rf "${HOMEROOT}/lib/"
fi

# Install PIP + Dependencies
echo "Installing pip3..."
curl --silent https://bootstrap.pypa.io/get-pip.py | python3

# Install our primary python libraries
# If we're not on CircleCI, or we are but the lib directory isn't there (cache miss), install lib
if [ -z "${CI}" ] || [ ! -d "lib" ]; then
    echo "Installing Python Libraries..."
    pip3 install -r ${HOMEROOT}/requirements.txt -t ${HOMEROOT}/lib --upgrade --only-binary all
else
    echo "Using restored cache for Python Libraries"
fi

if [ "$DEBUG" = "True" ] && [ "$DEBUG_TOOLBAR" = "True" ]; then
    echo "Installing Django Debug Toolbar for local dev..."
    pip3 install -q django-debug-toolbar -t ${HOMEROOT}/lib --only-binary all
fi

echo "Libraries Installed"

# Install SASS
gem install sass

# Install Google Cloud SDK
# If we're not on CircleCI or we are but google-cloud-sdk isn't there, install it
if [ -z "${CI}" ] || [ ! -d "/usr/lib/google-cloud-sdk" ]; then
    echo "Installing Google Cloud SDK..."
    export CLOUDSDK_CORE_DISABLE_PROMPTS=1
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    apt-get install apt-transport-https ca-certificates
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
    apt-get update && apt-get -y install google-cloud-sdk
    apt-get -y install google-cloud-sdk-app-engine-python
    echo "Google Cloud SDK Installed"
fi
