echo 'export PYTHONPATH=/home/vagrant/www:/home/vagrant/www/lib:/home/vagrant/www/ISB-CGC-Common' | tee -a /home/vagrant/.bash_profile
echo 'export SECURE_LOCAL_PATH=../parentDir/secure_files/' | tee -a /home/vagrant/.bash_profile
chmod +x /home/vagrant/www/shell/python-su.sh
