# -*- mode: ruby -*-
# vi: set ft=ruby :
Vagrant.configure(2) do |config|
  config.vm.box_url = "https://app.vagrantup.com/phusion/ubuntu-14.04-amd64"
  config.vm.box = "phusion/ubuntu-14.04-amd64"

  # WebApp ports
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.network "forwarded_port", guest: 8000, host: 8000

  config.vm.synced_folder ".", "/home/vagrant/www"
  config.vm.synced_folder "../", "/home/vagrant/parentDir"

  # Map Common for the WebApp
  config.vm.synced_folder "../ISB-CGC-Common", "/home/vagrant/www/ISB-CGC-Common"
  config.vm.synced_folder "../secure_files", "/home/vagrant/www/secure_files"

  config.vm.provision "shell", path: 'shell/install-deps.sh'
  config.vm.provision "shell", path: 'shell/create-database.sh'
  config.vm.provision "shell", path: 'shell/database-setup.sh'
  config.vm.provision "shell", path: 'shell/vagrant-start-server.sh'
  config.vm.provision "shell", path: 'shell/vagrant-set-env.sh'
end