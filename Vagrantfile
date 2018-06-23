# -*- mode: ruby -*-
# vi: set ft=ruby :
Vagrant.configure(2) do |config|
  config.vm.box_url = "https://app.vagrantup.com/phusion/ubuntu-14.04-amd64"
  config.vm.box = "phusion/ubuntu-14.04-amd64"
  # WebApp ports
  config.vm.network "forwarded_port", guest: 8080, host: 8100
  config.vm.network "forwarded_port", guest: 8000, host: 8000
  # API ports
  config.vm.network "forwarded_port", guest: 8090, host: 8090
  config.vm.network "forwarded_port", guest: 9000, host: 9000

  config.vm.synced_folder ".", "/home/vagrant/www"
  config.vm.synced_folder "../", "/home/vagrant/parentDir"

  # Map Common for the WebApp
  config.vm.synced_folder "../ISB-CGC-Common", "/home/vagrant/www/ISB-CGC-Common"

  # Map Common and lib for API
  config.vm.synced_folder "../ISB-CGC-Common", "/home/vagrant/parentDir/ISB-CGC-API/ISB-CGC-Common"
  config.vm.synced_folder "../ISB-CGC-WebApp/lib", "/home/vagrant/parentDir/ISB-CGC-API/lib"

  # Map Common for Cron
  config.vm.synced_folder "../ISB-CGC-Common", "/home/vagrant/parentDir/ISB-CGC-Cron/ISB-CGC-Common"

  config.vm.provision "shell", path: 'shell/install-deps.sh'
  config.vm.provision "shell", path: 'shell/create-database.sh'
  config.vm.provision "shell", path: 'shell/database-setup.sh'
  config.vm.provision "shell", path: 'shell/vagrant-start-server.sh'
  config.vm.provision "shell", path: 'shell/vagrant-set-env.sh'
end