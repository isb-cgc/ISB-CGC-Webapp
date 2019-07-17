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

#
# Wrapper for the script that determines if the VM should be shutdown for being idle
#

source ./bin/setEnvVars.sh
HOME_DIR=$(pwd)

while true; do
    DO_SHUTDOWN=$(python3 ./bin/idle_shutdown.py ${HOME_DIR} idlelogs 1 ${PROJECT} ${MACHINE_NAME} ${SERV_PORT})
    NOW=$(date)
    if [ ${DO_SHUTDOWN} == 'True' ]; then
        echo "${NOW} Shutdown [${DO_SHUTDOWN}] : Shutting Down .."
        sudo poweroff
    else
        echo "${NOW} VM is active ..."
    fi
    sleep 300
done

