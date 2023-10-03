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

if [ -z "${ENV_FILE_PATH}" ] || [ ! -f "${ENV_FILE_PATH}" ]; then
    echo "Environment variables file wasn't found - doublecheck secure_path.env and make sure it is a valid, VM-relative path!"
    echo "Current value of ENV_FILE_PATH is: ${ENV_FILE_PATH}"
    echo "WINDOWS USERS: If you are on a Windows host box and seeing this message, you may need to run dos2unix on your shell scripts to fix the line terminators."
    exit 1
fi
exit 0