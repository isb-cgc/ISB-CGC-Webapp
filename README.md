# ISB-CGC Web Application

The ISB-CGC Web Application provides a GUI for browsing, curating, and analyzing TCGA, TARGET, and CCLE data. It is built in Django 1.11 (Python 3) with MySQL 5.7, and is deployed on Google AppEngine Flex.

# Installation Instructions For Local Development

The system uses [Vagrant](https://www.vagrantup.com/) to setup a consistent, platform independent development environment. To setup your development environment to run locally, you will need to install the following:

 * [Vagrant](https://www.vagrantup.com/downloads.html)
 * [Oracle VirtualBox](https://www.virtualbox.org/wiki/Downloads)<br>*If you are on Windows 8 or above, you will need to make sure you have version 5.0.9 or above to support the network interface. This may involve downloading a [test build](https://www.virtualbox.org/wiki/Testbuilds)*
 * [PyCharm Pro](https://www.jetbrains.com/pycharm/) (Recommended)

From there perform the following steps...

 1. Once you've installed PyCharm and cloned the repositories (this repository and [ISB-CGC-Common](https://github.com/isb-cgc/ISB-CGC-Common), create a directory within the `PycharmProjects` directory (the parent directory of your repositories) called `secure_files/`.
 2. Copy the `sample.env` file to a file named `.env` in `secure_files/`
 3. Fill out the `.env` file with the proper values
   * For most **development** environments, `MYSQL_ROOT_PASSWORD` and `DATABASE_PASSWORD` can be the same, and `DATABASE_USER` can be `root`
   * `GCLOUD_PROJECT_ID`, `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` will be obtained from one of the other developers, as part of the initial set of information in your `.env` file.

## Configuring PyCharm

PyCharm Pro can be used to run your server through Vagrant and the Google App Engine.

### Setup

 1. Go to your PyCharm Settings (On Mac, Go to Preferences; `CMD+,`)
 2. Select **Project: ISB-CGC-Webapp > Project Interpreter**
 3. Click the icon next to the Project Interpreter drop down at the top of the main area
 4. Click Add Remote
 5. Select Vagrant (if it asks to start the machine, say yes)
 6. Set the Python interpreter path to `/home/vagrant/www/shell/python-su.sh` and click Ok
 7. Go to **Run > Edit Configurations**
 8. If there is not a Django Configuration, add one
 9. Set the host to `0.0.0.0` and the port to `8080`. 
 10. Set the Python Interpreter to the Vagrant Machine (if it is not set to that already); do NOT use any local interpreters installed on your host computer.
 11. Set the working directory to `/home/vagrant/www`
 12. Click `...` next to the `Environment variables:`, box and add the following values:
     `SECURE_LOCAL_PATH = ../parentDir/secure_files/`
     `PYTHONPATH = /home/vagrant/www:/home/vagrant/www/lib:/home/vagrant/www/ISB-CGC-Common`
     `VM_PYTHONPATH = /home/vagrant/www:/home/vagrant/www/lib:/home/vagrant/www/ISB-CGC-Common`
     `DJANGO_SETTINGS_MODULE = isb_cgc.settings`
     `PYTHONUNBUFFERED = 1`
 13. Click ok to save

**Note for OSX:** You will need to set *all* the scripts in the `shell/` directory to executable from your OSX terminal, using `chmod +x *.sh`   

 17. Obtain the necessary set of secure_files from one of the current developers, and the values needed for the developer .env file.

### Running

To run your server in PyCharm:

 1. Make sure your Vagrant machine is running by going to **Tools > Vagrant > Up**
  * If this is the first time you've built the VM, it can be time consuming.
  * Our VMs are currently running Ubuntu 16 LTS, which is what the app deploys under as well.
 2. Once the VM has built, set the `shell/python-su.sh` script to executable in the vagrant machine's command line with the command `chmod +x /home/vagrant/www/shell/python-su.sh`
 3. You can now click on the Run or Debug icons in the toolbar (upper-right corner of the PyCharm GUI)
  * Your server will start and the PyCharm console should show all the logs and output from the system. 
  * If you are running in debug, you can also use breakpoints to stop the execution and examine variables and code as it runs.

**NOTE:** The WebApp will be accessible at http://localhost:8080, but not at 0.0.0.0 or 127.0.0.1

## Adding Python Dependencies

To add Python Libraries or Dependencies, you should add them to the requirements.txt file and they will automatically be pulled down when a new developer starts the system.
 * Double-check any new libraries to make sure they don't introduce conflicts.
 * Note that sometimes a library will function fine on a local build but fail on the deployment, so always test on the mvm deployment as soon as your PR has been merged into master.
 * Ensure that the licensing doesn't conflict with the project's current license type.

To update your existing python dependencies because of a change, or to pull down additional libraries you need, SSH into the virtual machine and run `pip3 install`. Through PyCharm, you can take the following steps:

 1. Click **Tools > Start SSH session...**
 2. Select the Vagrant VM Connection you set up
 3. Type `cd www; sudo pip3 install -r requirements.txt -t lib/ --upgrade --only-binary all`

Or from the command line, you can do this by doing the following (OSX):

 1. Open a terminal in the project directory
 2. Type `vagrant ssh` to login to the virtual machine
 3. Change directory to the `www` directory (`/home/vagrant/www/` is the full path)
 4. Run `pip3 install -r requirements.txt -t lib/ --upgrade --only-binary all`

