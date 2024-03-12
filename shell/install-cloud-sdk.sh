# This script was created to resolve an issue with CloudSDK no longer installing from CircleCI
# script run blocks. Unclear why that's happening but here we are. -- SMP 3/11/24

export DEBIAN_FRONTEND=noninteractive

echo "Preparing System..."
apt-get -y --force-yes install software-properties-common ca-certificates apt-transport-https
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