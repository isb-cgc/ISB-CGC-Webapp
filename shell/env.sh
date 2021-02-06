# Location of the .env file
# This is NOT a relative path and should NOT be the same value as SECURE_LOCAL_PATH
# This should be an absolute path on the VM.
# The default value assumes a SECURE_LOCAL_PATH setting of ../parenDir/secure_files/
if [ ! -f "/home/vagrant/www/secure_path.env" ]; then
    echo "No secure_path.env found - using default value of /home/vagrant/parentDir/secure_files/.env."
    export ENV_FILE_PATH=/home/vagrant/parentDir/secure_files/.env
else
    echo "secure_path.env setting found."
    export ENV_FILE_PATH=$(cat /home/vagrant/www/secure_path.env)
fi
