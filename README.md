# UI-prototyping
ISB-CGC UI prototyping

This project uses Google App Engine, Python 2.7, Django 1.7.1, and MySQL 5.6

This app is set up to run and deploy on various Google Cloud Projects. It uses a zip version of Django instead of the natively supported version.

These are the required libraries that are not included (this should be zipped and placed in a /lib/ directory in the root of this project) Some of these libraries have been modified to work with Google App Engine. Please ask a developer at the ISB for the libraries or more information.
- allauth
- apiclient
- cloudstorage
- django==1.7.1
- ecdsa
- googleapiclient
- httplib2
- identitytoolkit
- endpoints==1.0
- oauth2client
- openid
- pyasn1
- pyasn1_modules
- requests==2.3 (in order to work with django-allauth)
- requests_oauthlib
- rsa
- simplejson
- six
- uritemplate
- zoneinfo

This project also includes the Endpoints API that the django application is running off of. Different versions of the application can access different version of the api as described [here](https://cloud.google.com/appengine/docs/python/endpoints/test_deploy#accessing_backend_api_versions_deployed_to_non-default_application_versions)

# Installation Instructions For Local Development (OSX, Linux Distributions)

1. Download [Google App Engine SDK for Python](https://cloud.google.com/appengine/downloads#Google_App_Engine_SDK_for_Python) and install. Be sure to add the google_appengine directory to your PATH.
`export PATH=$PATH:/path/to/google_appengine`
2. Download [Google Cloud SDK](https://cloud.google.com/sdk/) and install. Make sure that the edited .bash_profile or .bashrc file is pointing to the right location of google-cloud-sdk directory.
3. Authenticate the Google Cloud Platform by running
`gcloud auth login`
4. If you are using isb-cgc as your Google Cloud Project, you will need access to the ISB-CGC Google Drive directory (please ask project members for this information) to download the following:
  - privatekey.pem (This was generated from a .p12 file downloaded from within the isb-cgc project)
  - privatekey.json
  - lib.zip 
  - client_secrets.json
  - google_api_key.txt (This should be placed in the genome_browser directory.)
  - client_cert.pem, client_key.pem, server_ca.pem, all in GenespotRE/
  - local-sqldump_10-22-2015.sql.gz
  Otherwise, please refer to Deploying to New Cloud Project for instructions on how to generate private keys and client secrets.
5. Set up python virtual environment with Python 2.7, Django 1.7.1, MySQL 5.6:
6. `pip install django==1.7.1`
7. `pip install MySQL-python` - You may need to install MySQL if it is not already installed. It is recommended to use [homebrew](http://brew.sh/) if you are on OS X.
8. You should probably be okay importing the MySQL dump from drive:
   'mysql -uroot -p < local-sqldump_10-22-2015.sql'
9. `pip install pycrypto` - Needed as previously noted
10. In GenespotRE/secret_settings.py change the local database settings to match your local settings. You will also need to change other settings if not using isb-cgc as your Google Cloud Project (Pointing to correct .pem and .json files, and DEVELOPER_COHORT_TABLE_ID should be set to a unique table in a dataset in Big Query). You may need to change the name of the user, and password to match your local settings. Do not commit these changes.  Do similarly for scripts/add_site_ids.py and scripts/add_alldata_cohort.py. You can add additionaly sets of settings to the secret settings file if you like. Use an environment variable set in app.yaml and manage.py to switch between settings.
11. run `python manage.py makemigrations` - Setting up Django models
12. run `python manage.py migrate` - Setting up Django models.  If you get errors from mysql being unwilling to create things that already exist, or delete things that don't exist, you can try using the --fake at the end. 
13. If you did not use a sql dump, and have not done so before, run `python manage.py createsuperuser` and leave the superuser's email blank.  Running this more than once will create multiple superusers which will produce a bug.
14. If you did no use a sql dump, enter a mysql shell and run `CREATE USER 'django'@'localhost' IDENTIFIED BY 'PASSWORD'` and `GRANT SELECT, INSERT, UPDATE, DELETE ON <DATABASE NAME>.* TO 'django'@'localhost'`. Remember to set the password appropriately.

LOCAL TEST:

L1. For a local test, run 'gcloud preview app run ./app.yaml' and go
to [http://localhost:8080/](http://localhost:8080), hoping for the
best!

L2. If the site works, go to [http://localhost:8080/admin](http://localhost:8080/admin) and enter the superuser name and password you created.
  - Open the Social Applications table in admin to add a new Social Application. Make the provider Google, name it whatever you want ('Google' is fine), copy and paste the client_id and client_secret from our client_secrets.json file into the Social Application's Client id and Secret key fields. Leave the Key field blank.
  - Then select isb-cgc.appspot.com, localhost:8000, and localhost:8080 in the Available sites field and move them to the Chosen sites field.

L3. When app is running, api is also running at the same time. It is currently set up to look at local MySQL database if running locally, so make sure you have MySQL running. You can explore your local api [here](http://localhost:8080/_ah/api/explorer).

CLOUD TEST:

C1. For a cloud test, set your own module in app.yaml, ensuring that 'module: MOD' and " 'VERSION_NAME': 'MOD' " are consistent.  MOD will be used below in the URIs, etc.

C2. Check in the Developer's Console, and ensure that the following URLs are in the Redirect URIs:
- https://MOD-dot-isb-cgc.appspot.com
- http://MOD-dot-isb-cgc.appspot.com
- https://MOD-dot-isb-cgc.appspot.com/accounts/google/login/callback/
- http://MOD-dot-isb-cgc.appspot.com/accounts/google/login/callback/

C3. From the shell, run 'gcloud preview app deploy ./app.yaml --set-default' and go
to https://MOD-dot-isb-cgc.appspot.com.

C4. The main api endpoints can be explored at https://MOD-dot-isb-cgc.appspot.com/_ah/api/explorer

C5 When you are finished working with instances, and no longer need them, please delete the version, through the Developers Console: 
  - (along the left hand side) Dev Console > Compute > App Engine > Versions
  - Select the MOD Module (top left of main panel: whichever ne you used)
  - Put a checkmark by each and choose delete.  Once all non-defaults
    are deleted, you will be allowed to delete the default Version.
  - We get charged $$ for having lots of zombie vm's running, so clean up!


# Working on front-end html and css
Make sure SASS is installed. SASS files are compiled from sass/ into the static/css/ directory.

For SASS: run this from root directory
```
sass --watch sass/main.sass:static/css/main.css
```

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
