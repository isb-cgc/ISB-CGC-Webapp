# -*- mode: ruby -*-
# vi: set ft=ruby :
Vagrant.configure(2) do |config|
  config.vm.box_url = "https://app.vagrantup.com/ubuntu/boxes/bionic64"
  config.vm.box = "ubuntu/bionic64"

  # WebApp ports
  config.vm.network "forwarded_port", guest: 8085, host: 8085
  config.vm.network "forwarded_port", guest: 8005, host: 8005

  config.vm.synced_folder ".", "/home/vagrant/www"
  config.vm.synced_folder "../", "/home/vagrant/parentDir"
  config.vm.synced_folder "../secure_files", "/home/vagrant/secure_files"

  # Map Common for the WebApp
  config.vm.synced_folder "../IDC-Common", "/home/vagrant/www/IDC-Common"

  # Map API so it can use this VM
  config.vm.synced_folder "../IDC-API", "/home/vagrant/API"

  config.vm.provision :shell, inline: "echo 'source /home/vagrant/www/shell/env.sh' > /etc/profile.d/sa-environment.sh", :run => 'always'
  config.vm.provision "shell", path: 'shell/install-deps.sh'
  config.vm.provision "shell", path: 'shell/create-database.sh'
  config.vm.provision "shell", path: 'shell/database-setup.sh'
  config.vm.provision "shell", path: 'shell/vagrant-start-server.sh'
  config.vm.provision "shell", path: 'shell/vagrant-set-env.sh'
end