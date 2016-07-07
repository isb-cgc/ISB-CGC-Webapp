# -*- mode: ruby -*-
# vi: set ft=ruby :
Vagrant.configure(2) do |config|
  config.vm.box = "phusion/ubuntu-14.04-amd64"
  
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.network "forwarded_port", guest: 8000, host: 8000
  
  # Port forwarding for ISB-CGC-API dev_appserver
  config.vm.network "forwarded_port", guest: 19080, host: 19080
  config.vm.network "forwarded_port", guest: 19000, host: 19000

  config.vm.synced_folder ".", "/home/vagrant/www"
  config.vm.synced_folder "../", "/home/vagrant/parentDir"

  # Map API and Common for the web application
  config.vm.synced_folder "../ISB-CGC-API", "/home/vagrant/www/ISB-CGC-API"
  config.vm.synced_folder "../ISB-CGC-Common", "/home/vagrant/www/ISB-CGC-Common"

  # Map Common for API (for running in dev_appserver)
  config.vm.synced_folder "../ISB-CGC-Common", "/home/vagrant/parentDir/ISB-CGC-API/ISB-CGC-Common"

  config.vm.provision "shell", path: 'shell/install-deps.sh'
  config.vm.provision "shell", path: 'shell/create-database.sh'
  config.vm.provision "shell", path: 'shell/database-setup.sh'
  config.vm.provision "shell", path: 'shell/vagrant-start-server.sh'
  config.vm.provision "shell", path: 'shell/vagrant-set-env.sh'
end