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

source ./setEnvVars.sh
apt-get update
apt-get install -y python3-pip
apt-get install -y python3-venv
apt-get install -y tcpdump
apt-get install -y daemontools

user_not_exists=$(id -u ${USER_NAME} > /dev/null 2>&1; echo $?)
if [ "$user_not_exists" -eq 1 ]; then
    echo "Add user"
    useradd -m ${USER_NAME}
fi

echo "log in as user"
sudo -u ${USER_NAME} bash <<END_OF_BASH
cd ~


python3 -m pip install pandas
#
# Install google.cloud
#
python3 -m pip install google-cloud-monitoring
#
# Get jupyter installed:
#
python3 -m pip install jupyter
#
# Was seeing issues on first install (early 2019), these fixed problems. Are they still needed?
#
python3 -m pip install --upgrade --user nbconvert
python3 -m pip install --upgrade --user tornado==5.1.1
#
# Get ready for certs:
#
echo 'mkdir .jupyter'
cd ~
mkdir .jupyter
#
# Generate self-signed cert on the VM:
#
echo 'generate self-signed cert'
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -subj "$(cat /certSubj.txt)" -keyout ~/.jupyter/mykey.key -out ~/.jupyter/mycert.pem


#
# Get config set up for remote access:
#
~/.local/bin/jupyter notebook --generate-config
cat >> ~/.jupyter/jupyter_notebook_config.py <<END_OF_CONFIG
c = get_config()
c.NotebookApp.ip = '*'
c.NotebookApp.open_browser = False
c.NotebookApp.port = ${SERV_PORT}
c.NotebookApp.allow_origin = '*'
c.NotebookApp.allow_remote_access = True
c.NotebookApp.certfile = u'/home/${USER_NAME}/.jupyter/mycert.pem'
c.NotebookApp.keyfile = u'/home/${USER_NAME}/.jupyter/mykey.key'
c.NotebookApp.password = u'$(cat /passhash.txt)'
c.NotebookApp.tornado_settings = { 'headers': { 'Content-Security-Policy': "frame-ancestors 'self' http://localhost:8080" } }

END_OF_CONFIG

#
# Build directories, move scripts into place:
#
mkdir ~/log
mkdir ~/bin
mkdir ~/idlelogs

END_OF_BASH
rm /passhash.txt
rm /certSubj.txt
mv /cpuLogger.sh /home/${USER_NAME}/bin/.
mv /idle_checker.py /home/${USER_NAME}/bin/.
mv /idle_log_wrapper.sh /home/${USER_NAME}/bin/.
mv /idle_shutdown.py /home/${USER_NAME}/bin/.
mv /shutdown_wrapper.sh /home/${USER_NAME}/bin/.
mv /setEnvVars.sh /home/${USER_NAME}/bin/.

chmod u+x /home/${USER_NAME}/bin/cpuLogger.sh
chmod u+x /home/${USER_NAME}/bin/idle_log_wrapper.sh
chmod u+x /home/${USER_NAME}/bin/shutdown_wrapper.sh

#
# Supervisor. Apparently, the apt-get gets us the system init.d install, while we
# need to do the pip upgrade to get ourselves to 3.3.1:
#
apt-get install -y supervisor
python3 -m pip install --upgrade supervisor

# Daemon to run notebook server

cat >> /home/${USER_NAME}/notebook.conf <<END_OF_SUPER
[program:notebooks]
directory=/home/${USER_NAME}
command=/home/${USER_NAME}/.local/bin/jupyter notebook
autostart=true
autorestart=true
user=${USER_NAME}
stopasgroup=true
stderr_logfile=/home/${USER_NAME}/log/notebook-err.log
stdout_logfile=/home/${USER_NAME}/log/notebook-out.log
END_OF_SUPER

# Daemon to log VM activity stats

cat >> /home/${USER_NAME}/idlelog.conf <<END_OF_SUPER_IDLELOG
[program:idlelog]
directory=/home/${USER_NAME}
command=bash /home/${USER_NAME}/bin/idle_log_wrapper.sh
autostart=true
autorestart=true
user=${USER_NAME}
stopasgroup=true
stderr_logfile=/home/${USER_NAME}/log/idlelog-err.log
stdout_logfile=/home/${USER_NAME}/log/idlelog-out.log
END_OF_SUPER_IDLELOG

# Daemon to shutdown idle machine

cat >> /home/${USER_NAME}/idleshut.conf <<END_OF_SUPER_SHUTDOWN
[program:idleshut]
directory=/home/${USER_NAME}
command=bash /home/${USER_NAME}/bin/shutdown_wrapper.sh
autostart=true
autorestart=true
user=${USER_NAME}
stopasgroup=true
stderr_logfile=/home/${USER_NAME}/log/shutdownlog-err.log
stdout_logfile=/home/${USER_NAME}/log/shutdownlog-out.log
END_OF_SUPER_SHUTDOWN

#
# Supervisor config files:
#
mv /home/${USER_NAME}/notebook.conf /etc/supervisor/conf.d/
mv /home/${USER_NAME}/idlelog.conf /etc/supervisor/conf.d/
mv /home/${USER_NAME}/idleshut.conf /etc/supervisor/conf.d/


#
# Get the virtual environment installed:
#
cd /home/${USER_NAME}

python3 -m venv virtualEnv
source virtualEnv/bin/activate
pip install ipykernel
python -m ipykernel install --user --name=virtualEnv
deactivate

# for i in $(seq 1 5)
# do
#  python3 -m venv virtualEnv${i}
#  source virtualEnv${i}/bin/activate
#  pip install ipykernel
#  python -m ipykernel install --user --name=virtualEnv${i}
#  deactivate
# done

cd /home/${USER_NAME}
supervisorctl reread
supervisorctl update

