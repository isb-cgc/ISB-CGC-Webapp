# Location of the .env file
# This is NOT a relative path and should NOT be the same value as SECURE_LOCAL_PATH
# This should be an absolute path on the VM.
# The default value assumes a SECURE_LOCAL_PATH setting of ../parenDir/secure_files/
if [ ! -f "/home/vagrant/www/secure_path.env" ]; then
    echo "No secure_path.env found - using default value of /home/vagrant/secure_files/.env."
    echo "If your .env is not at this location, you must make a secure_path.env file with the SECURE_LOCAL_PATH"
    echo "value as its only entry and place it in the root directory (/home/vagrant/www)."
    export ENV_FILE_PATH=/home/vagrant/secure_files/.env
else
    echo "secure_path.env setting found."
    export ENV_FILE_PATH=$(cat /home/vagrant/www/secure_path.env)
    echo ".env file assumed to be found at ${ENV_FILE_PATH}"
fi
