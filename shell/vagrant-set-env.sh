#!/bin/bash
echo 'export PYTHONPATH=/home/vagrant/www:/home/vagrant/www/lib:/home/vagrant/www/IDC-Common' | tee -a /home/vagrant/.bash_profile
echo 'export SECURE_LOCAL_PATH=../parentDir/secure_files/idc/' | tee -a /home/vagrant/.bash_profile
echo 'export DJANGO_SETTINGS_MODULE=idc.settings' | tee -a /home/vagrant/.bash_profile
source /home/vagrant/.bash_profile
chmod +x /home/vagrant/www/shell/python-su.sh
