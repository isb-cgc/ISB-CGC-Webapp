# IDC Web Application

The IDC Web Application is currently under development

# Installation Instructions For Local Development

The system uses [Vagrant](https://www.vagrantup.com/) to setup a consistent, platform independent development environment. To setup your development environment to run locally, you will need to install the following:

 * [Vagrant](https://www.vagrantup.com/downloads.html)
 * [Oracle VirtualBox](https://www.virtualbox.org/wiki/Downloads)<br>*If you are on Windows 8 or above, you will need to make sure you have version 5.0.9 or above to support the network interface. This may involve downloading a [test build](https://www.virtualbox.org/wiki/Testbuilds)*
 * [PyCharm Pro](https://www.jetbrains.com/pycharm/) (Recommended)

From there perform the following steps...

 1. Once you've installed PyCharm and cloned the repositories, create a directory within the `PycharmProjects` directory (the parent directory of your repositories) called `secure_files/idc`.
 2. Copy the `sample.env` file to a file named `.env` in `secure_files/idc`. The setup process **requires** this name and this path.
 3. Fill out the `.env` file with the proper values
   * For most **development** environments, `MYSQL_ROOT_PASSWORD` and `DATABASE_PASSWORD` can be the same, and `DATABASE_USER` can be `root`
   * `GCLOUD_PROJECT_ID`, `OAUTH2_CLIENT_SECRET`, `OAUTH2_CLIENT_ID`, and the application credentials file will be obtained from one of the other developers as part of 
   an initial set of starter files.

## Configuring PyCharm

PyCharm Pro can be used to run your Web Application as a native Django application.

### Setup

 1. Go to your PyCharm Settings (On Mac, Go to Preferences; `CMD+,`)
 2. Select **Project: IDC-Webapp > Project Interpreter**
 3. Click the icon next to the Project Interpreter drop down at the top of the main area
 4. Click Add Remote
 5. Select Vagrant (if it asks to start the machine, say yes)
 6. Set the Python interpreter path to `/home/vagrant/www/shell/python-su.sh` and click Ok
    - Be sure you are **not** using `/user/bin/python3.X` or similar.
    - The remote interpreter script brings in the PythonPath when launched.
 7. Click Ok to save
 10. Go to **Run > Edit Configurations**
 11. If there is not a Django Configuration, add one
 12. Set the host to `0.0.0.0` and the port to `8086`.
 13. Set the Python Interpreter to the Vagrant Machine (if it is not set to that already)
 14. Set the working directory to `/home/vagrant/www`
 15. Click `...` next to the `Environment variables:`, box and add the following values:
     - `SECURE_LOCAL_PATH = ../parentDir/secure_files/idc/` (you **MUST** have the trailing `/`)
     - `PYTHONPATH = /home/vagrant/www:/home/vagrant/www/lib:/home/vagrant/www/IDC-Common`
     - `VM_PYTHONPATH = /home/vagrant/www:/home/vagrant/www/lib:/home/vagrant/www/IDC-Common`
     - `DJANGO_SETTINGS_MODULE = idc.settings`
     - `PYTHONUNBUFFERED = 1`
 16. Click ok to save

You will need to set the `shell/python-su.sh` file to be executable. You can do this via the vagrant machine's command line with the command `chmod +x /home/vagrant/www/shell/python-su.sh`
(This step is done for you by `vagrant-set-env.sh` when the VM image is first built.)

### Running

To run your server in PyCharm:

 1. Make sure your Vagrant machine is running by going to **Tools > Vagrant > Up**
  * If this is the first time you've built the VM, it can be time consuming.
  * Our VMs are currently running Debian 12 (Bookworm) LTS, which is what the app deploys under as well.
 2. Once the VM is built, you will need to update the kernel headers and Guest Additions
  * Kernel header update: `sudo apt-get -y install dkms build-essential linux-headers-$(uname -r)`
    * NOTE: you may get a 'package not found' error here; if so, you'll need to look up the current header package for this install and use that instead.
  * Guest Additions ISO mounting and installation: https://docs.bitnami.com/virtual-machine/faq/configuration/install-virtualbox-guest-additions/
 3. Next, set the `shell/python-su.sh` script to executable in the vagrant machine's command line with the command `chmod +x /home/vagrant/www/shell/python-su.sh`
 4. You can now click on the Run or Debug icons in the toolbar (upper-right corner of the PyCharm GUI)
  * Your server will start and the PyCharm console should show all the logs and output from the system. 
  * If you are running in debug, you can also use breakpoints to stop the execution and examine variables and code as it runs.

## Adding Python Dependencies

To add Python Libraries or Dependencies, you should add them to the requirements.txt file and they will automatically be pulled down when a new developer starts the system.
 * Double-check any new libraries to make sure they don't introduce conflicts.
 * Note that sometimes a library will function fine on a local build but fail on the deployment, so always test on the mvm deployment as soon as your PR has been merged into master.

To update your existing python dependencies because of a change, or to pull down additional libraries you need, SSH into the virtual machine and run `pip3 install`. Through PyCharm, you can take the following steps:

 1. Click **Tools > Start SSH session...**
 2. Select the Vagrant VM Connection you set up
 3. Type `cd www; sudo pip install -r requirements.txt --upgrade -t lib/`

Or from the command line, you can do this by doing the following:

 1. Open a terminal in the project directory
 2. Type `vagrant ssh` to login to the virtual machine
 3. Change directory to the `www` directory (`/home/vagrant/www/` is the full path)
 4. Run `pip install -r requirements.txt --upgrade -t lib/`
