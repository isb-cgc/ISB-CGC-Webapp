# -*- mode: ruby -*-
# vi: set ft=ruby :
Vagrant.configure(2) do |config|
  config.vm.provider "virtualbox" do |vb|
     # Display the VirtualBox GUI when booting the machine
     # vb.gui = true

     # Customize the amount of memory on the VM:
     vb.memory = "2048"

     vb.customize ["modifyvm", :id, "--uart1", "0x3F8", "4"]
     vb.customize ["modifyvm", :id, "--uartmode1", "file", File::NULL]

     vb.customize ["modifyvm", :id, "--nestedpaging", "off"]
     vb.customize ["modifyvm", :id, "--cpus", 2]
     vb.customize ["modifyvm", :id, "--paravirtprovider", "hyperv"]
   end

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