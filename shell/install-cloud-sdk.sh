export DEBIAN_FRONTEND=noninteractive

echo "Preparing System..."
apt-get -y --force-yes install software-properties-common ca-certificates apt-transport-https
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv A8D3785C
wget "https://repo.mysql.com/mysql-apt-config_0.8.29-1_all.deb" -P /tmp
dpkg --install /tmp/mysql-apt-config_0.8.29-1_all.deb

apt-get update -qq

# Install Google Cloud SDK
# If we're not on CircleCI or we are but google-cloud-sdk isn't there, install it
if [ -z "${CI}" ] || [ ! -d "/usr/lib/google-cloud-sdk" ]; then
    echo "Installing Google Cloud SDK..."
    export CLOUDSDK_CORE_DISABLE_PROMPTS=1
    echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
    apt-get update -qq
    apt-get -y install google-cloud-sdk
    echo "Google Cloud SDK Installed"
fi