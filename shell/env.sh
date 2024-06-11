###
# Copyright 2015-2023, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

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
