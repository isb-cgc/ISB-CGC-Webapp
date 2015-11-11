# UI-prototyping
ISB-CGC UI prototyping

This project uses Google App Engine, Python 2.7, Django 1.7.1, and MySQL 5.6

This app is set up to run and deploy on various Google Cloud Projects.

# Installation Instructions For Local Development

The system uses [Vagrant](https://www.vagrantup.com/) to setup a consistent, platform independent development environment. To setup your development environment to run locally, you will need to install the following:

 * [Vagrant](https://www.vagrantup.com/downloads.html)
 * [Oracle VirtualBox](https://www.virtualbox.org/wiki/Downloads)<br>*If you are on Windows 8 or above, you will need to make sure you have version 5.0.9 or above to support the network interface. This may involve downloading a [test build](https://www.virtualbox.org/wiki/Testbuilds)*
 * [PyCharm Pro](https://www.jetbrains.com/pycharm/) (Recommended)

From there simply perform these steps.

 1. Copy the `sample.env` file to a file named `.env` in the root directory
 2. Fill out the `.env` file with the proper values
   * For most development environments, `MYSQL_ROOT_PASSWORD` and `DATABASE_PASSWORD` can be the same, and `DATABASE_USER` can be `root`
   * `GCLOUD_PROJECT_ID` is available after creating a project in the [Google Cloud Dashboard](https://console.developers.google.com/)
   * `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` can also be obtained in the Google Cloud Dashboard by going to API & Auth > Credentials > Add New > OAuth 2.0 Client > Web Application
   * Be sure when developing locally that you have 127.0.0.1 in the list of allowed domains for the OAuth 2.0 key

## Configuring PyCharm

PyCharm Pro can be used to run your server through Vagrant and the Google App Engine.

### Setup

 1. Go to your PyCharm Settings (On Mac, Go to Preferences; `CMD+,`)
 2. Select **Project: ISB-CGC-Webapp > Project Interpreter**
 3. Click the icon next to the Project Interpreter drop down at the top of the main area
 4. Click Add Remote
 5. Select Vagrant (if it asks to start the machine, say yes)
 6. Set the Python interpreter path to `/home/vagrant/www/shell/python-su.sh` and click Ok
 7. Select **Languages & Frameworks > Google App Engine**
 8. Change the SDK directory to `/home/vagrant/google_appengine/`
 9. Click Ok to save
 10. Go to **Run > Edit Configurations**
 11. If there is not an App Engine server Configuartion, add one
 12. Set the host to `0.0.0.0`
 13. Set Additional Options to `--skip_sdk_update_check --use_mtime_file_watcher=True --admin_host 0.0.0.0 /home/vagrant/www`
   * Optionally set PyCharm to run a browser at url `http://127.0.0.1:8080/`
 14. Set the Python Interpreter to the Vagrant Machine (if it is not set to that already)
 15. Set the working directory to `\home\vagrant\www`
 16. Click ok to save

You will also need to set the *shell/python-su.sh* file to be executable. You can do this in the vagrant machines command line with the command `chmod +x /home/vagrant/www/shell/python-su.sh`

### Running

To run your server in PyCharm:

 1. Make sure your Vagrant machine is running by going to **Tools > Vagrant > Up**
 2. Click on the Run or Debug icons in the toolbar
 3. Click Run or Debug button on the configuration dialog
 4. Click Continue Anyway to run the machine

Your server will start and the PyCharm console should show all the logs and output from the system. If you are running in debug, you can also use breakpoints to stop the execution and examine variables and code as it runs.

## Adding Python Dependencies

To add Python Libraries or Dependencies, you should add them to the requirements.txt file and they will automatically be pulled down when a new developer starts the system.

To update your existing python dependencies because of a change or to pull down additional libraries you need, SSH into the virtual machine and run `pip install`. Through PyCharm, you can take the following steps.

 1. Click **Tools > Start SSH session...**
 2. Select the Vagrant VM Connection you set up
 3. Type `cd www; pip install -r requirements.txt --upgrade -t lib/`

Or from the command line, you can do this by doing the following

 1. Open a terminal in the project directory
 2. Type `vagrant ssh` to login to the virtual machine
 3. Change directory to the `www` directory (`/home/vagrant/www/` is the full path)
 4. Run `pip install -r requirements.txt --upgrade -t lib/`

# Deploying to a new Google Cloud Project

NOTE: These are only instructions for setting up the AppEngine application and does not include Computational or BigQuery instructions.

1. Under APIs & Auth --> APIs
  - Enable Identity Toolkit API
2. Under Apis & Auth --> Credentials
  - Create a new Client ID
    - Select Web Application
    - Javascript Origins should include
      - http://localhost:8000
      - http://localhost:8080
      - http://YOUR-APP-ID.appspot.com/
    - Redirect URIs
      - http://localhost:8000
      - http://localhost:8000/accounts/google/login/callback/
      - http://localhost:8080
      - http://localhost:8080/accounts/google/login/callback/
      - http://YOUR-APP-ID.appspot.com/accounts/google/login/callback
      - https://YOUR-APP-ID.appspot.com/accounts/google/login/callback
    - Once created, you should Download JSON and place it in the root of your code directory.
  - Create another Client ID
    - Select Service Account
    - Select P12 Key
    - Once created, it should automatically download a .p12 file. You will need to convert this into a PEM key and place it in the root of your code directory.
    - Also Generate a new JSON key and place it in the root of your code directory.
  - Create A new Public API Access
    - Create a Server Key and A Browser Key
3. Under Storage --> Cloud SQL
  - Create a new instance
    - Open the advanced options.
    - Provide it a name.
    - Select the region and at least a Tier of D2 for better performance.
    - Use MySQL Database version 5.6.
    - Set billing to Package.
    - Activation policy should be Always On. (reduces spin up time on each read)
    - Assign an IPv4 address to the instance.
    - Add an allowed network. It is useful to add the network of your local development computer.
    - By default, your App Engine Application ID should already be allowed.
4. Update your settings file to point to the correct private key files.
5. In the settings file, update the server database settings to use your Cloud SQL settings.
6. In the settings file, make sure that it checks the environment variable for SETTINGS_MODE == 'prod'. Check to see that the database settings used in this case are correct for your Cloud SQL instance. This will be used to run migrations on the Cloud SQL instance from your local development machine.
7. In your terminal, run `SETTINGS_MODE='prod' ./manage.py syncdb`. This should create the necessary Django tables in your Cloud SQL instance. It will also prompt you to create a super user.
8. Import the necessary metadata tables and feature_defs table.
9. For the cron job to work, you need to get the file NIH_FTP.txt, currently not stored in Drive. See @medullaskyline. Also see special instructions for the paramiko library in appengine_config.py.
10. The Cloud Project should now be ready for you to deploy. Either deploy from the Google App Engine Launcher, or through the terminal `appcfg.py update` in the root directory of your project.
11. Go to `http://<YOUR-APP-ID>.appspot.com/` and hope for the best!
12. If the site works, go to `http://<YOUR-APP-ID>.appspot.com/admin` and enter the superuser name and password you created.
  - Open the Social Applications table in admin to add a new Social Application. Make the provider Google, name it whatever you want ('Google' is fine), copy and paste the client_id and client_secret from our client_secrets.json file into the Social Application's Client id and Secret key fields. Leave the Key field blank.
  - Then select isb-cgc.appspot.com, localhost:8000, and localhost:8080 in the Available sites field and move them to the Chosen sites field.
