#!/usr/bin/env bash

# Copyright 2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

GCLOUD_BUCKET=$(curl http://metadata.google.internal/computeMetadata/v1/instance/attributes/NOTEBOOK_GS_BUCKET -H "Metadata-Flavor: Google")
echo "Copy setEnvVars.sh ..."
gsutil cp gs://${GCLOUD_BUCKET}/setEnvVars.sh .
source ./setEnvVars.sh

if [ -f /etc/supervisor/conf.d/notebook.conf ]; then
    # python3 /home/${USER_NAME}/bin/cmd_server.py 2>&1 > /home/${USER_NAME}/log/cmd-server-out.log &
    exit 0
fi
echo "Copy install.sh"
gsutil cp gs://${GCLOUD_BUCKET}/install.sh .
echo "Copy passhash.txt"
gsutil cp gs://${GCLOUD_BUCKET}/passhash.txt .
echo "Copy certSubj.txt"
gsutil cp gs://${GCLOUD_BUCKET}/certSubj.txt .

# echo "Copy cmd_server.py"
# gsutil cp gs://${GCLOUD_BUCKET}/cmd_server.py .


#
# Get the idle monitor scripts and idle shutdown script up to the machine:
#

echo "Uploading idle monitor and shutdown scripts"
gsutil cp gs://${GCLOUD_BUCKET}/cpuLogger.sh .
gsutil cp gs://${GCLOUD_BUCKET}/idle_checker.py .
gsutil cp gs://${GCLOUD_BUCKET}/idle_log_wrapper.sh .
gsutil cp gs://${GCLOUD_BUCKET}/idle_shutdown.py .
gsutil cp gs://${GCLOUD_BUCKET}/shutdown_wrapper.sh .

chmod u+x install.sh

echo "Run install.sh"
./install.sh
rm intall.sh
gsutil -m rm -r gs://${GCLOUD_BUCKET}
