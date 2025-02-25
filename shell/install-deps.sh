if [ -n "$CI" ]; then
    echo "Check our Python and Ubuntu versions since they keep getting updated without warning..."

    ls -l /usr/bin/python3*
    cat /etc/os-release

    export HOME=/home/circleci/${CIRCLE_PROJECT_REPONAME}
    export HOMEROOT=/home/circleci/${CIRCLE_PROJECT_REPONAME}

    # Clone dependencies
    COMMON_BRANCH=master
    if [[ ${CIRCLE_BRANCH} =~ idc-(prod|uat|test).* ]]; then
        COMMON_BRANCH=$(awk -F- '{print $1"-"$2}' <<< ${CIRCLE_BRANCH})
    elif [[ ${CIRCLE_BRANCH} == "expr" ]]; then
        COMMON_BRANCH=expr
    fi
    echo "Cloning IDC-Common branch ${COMMON_BRANCH}..."
    git clone -b ${COMMON_BRANCH} https://github.com/ImagingDataCommons/IDC-Common.git
else
    if ( "/home/vagrant/www/shell/get_env.sh" ) ; then
        export $(cat ${ENV_FILE_PATH} | grep -v ^# | xargs) 2> /dev/null
    else
        exit 1
    fi
    export HOME=/home/vagrant
    export HOMEROOT=/home/vagrant/www
fi

export DEBIAN_FRONTEND=noninteractive

# Remove .pyc files; these can sometimes stick around and if a
# model has changed names it will cause various load failures
find . -type f -name '*.pyc' -delete

apt-get update -qq

# Install and update apt-get info
echo "Preparing System..."
apt-get -y --force-yes install software-properties-common ca-certificates gnupg
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv A8D3785C
wget "https://repo.mysql.com/mysql-apt-config_0.8.29-1_all.deb" -P /tmp
dpkg --install /tmp/mysql-apt-config_0.8.29-1_all.deb

apt-get update -qq

apt-get install mysql-client

# Install apt-get dependencies
echo "Installing Dependencies..."
apt-get install -y --force-yes unzip libffi-dev libssl-dev git ruby g++ curl dos2unix
apt-get install -y --force-yes python3-distutils python3-mysqldb libmysqlclient-dev libpython3-dev build-essential
apt-get install -y --force-yes python3-pip

echo "Dependencies Installed"

# If this is local development, clean out lib for a re-structuring 
if [ -z "${CI}" ]; then
    # Clean out lib to prevent confusion over multiple builds in local development
    # and prep for local install
    echo "Emptying out ${HOMEROOT}/lib/ ..."
    rm -rf "${HOMEROOT}/lib/"
    echo "Confirming clearance of lib:"
    ls ${HOMEROOT}/lib/
fi

# Install our primary python libraries
# If we're not on CircleCI, or we are but the lib directory isn't there (cache miss), install lib
if [ -z "${CI}" ] || [ ! -d "lib" ]; then
    echo "Installing Python Libraries..."
    pip install -r ${HOMEROOT}/requirements.txt -t ${HOMEROOT}/lib --upgrade --only-binary all
else
    echo "Using restored cache for Python Libraries"
fi

if [ -z "${CI}" ]; then
    echo "Installing responses library for unit tests, but not for deployment..."
    pip install -q responses -t ${HOMEROOT}/lib --only-binary all
fi

if [ "$DEBUG" = "True" ] && [ "$DEBUG_TOOLBAR" = "True" ]; then
    echo "Installing Django Debug Toolbar for local dev..."
    pip install -q django-debug-toolbar==3.2.4 -t ${HOMEROOT}/lib --only-binary all
fi

if [ "$IS_DEV" = "True" ]; then
    echo "Installing GitPython for local dev version display..."
    pip install -q gitpython -t ${HOMEROOT}/lib --only-binary all
fi

echo "Libraries Installed"

# Install Google Cloud SDK
# If we're not on CircleCI or we are but google-cloud-sdk isn't there, install it
if [ -z "${CI}" ] || [ ! -d "/usr/lib/google-cloud-sdk" ]; then
    echo "Installing Google Cloud SDK..."
    export CLOUDSDK_CORE_DISABLE_PROMPTS=1
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    apt-get -y install apt-transport-https ca-certificates
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
    apt-get update -qq
    apt-get -y install google-cloud-sdk
    apt-get -y install google-cloud-sdk-app-engine-python
    echo "Google Cloud SDK Installed"
fi

# Run dos2unix on the files in shell/ because of line terminator shenanigans with Windows
echo "Running dos2unix on shell/*.sh..."
dos2unix ${HOMEROOT}/shell/*.sh

echo "Loading Git Hooks"
if [ -z "${CI}" ] && [ -d "${HOMEROOT}/git-hooks/" ]; then
    cp -r ${HOMEROOT}/git-hooks/* ${HOMEROOT}/.git/hooks/
fi

# Create the application deployment version
if [ -n "${CI}" ]; then
    if [ "$DEPLOYMENT_TIER" = "PROD" ]; then
        TIER=canceridc
    else
        TIER=${DEPLOYMENT_TIER,,}
    fi
    echo "APP_VERSION=${TIER}.$(date '+%Y%m%d%H%M').${APP_SHA}" > ${HOMEROOT}/version.env
fi