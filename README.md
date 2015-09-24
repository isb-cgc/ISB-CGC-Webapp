# ISB CGC Webapp
This is the repository of code for the web application developed by the Institute for Systems Biology for the Cancer Genomics Cloud Pilot Project.

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
- oauth2client
- openid
- pyasn1
- pyasn1_modules
- pysftp.py
- pytz (pytz-gae)
- requests==2.3 (in order to work with django-allauth)
- requests_oauthlib
- rsa
- simplejson
- six
- uritemplate
- zoneinfo

NOTE: Google's Python Development Server does NOT come with pycrypto and must be added to local virtual environment used to run dev_appserver.py. It is included when the app is deployed, so there is no need to zip it and include in /lib folder.

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
  - dev_2015-07-09_metadata_attr_samples.sql
  Otherwise, please refer to Deploying to New Cloud Project for instructions on how to generate private keys and client secrets.
5. Set up python virtual environment with Python 2.7, Django 1.7.1, MySQL 5.6:
6. `pip install django==1.7.1`
7. `pip install MySQL-python` - You may need to install MySQL if it is not already installed. It is recommended to use [homebrew](http://brew.sh/) if you are on OS X.
8. Create databases dev, stage, test, and prod (this is not strictly necessary), but all subsequent operations on databases should be done for all the databases you plan to use.
9. `pip install pycrypto` - Needed as previously noted
10. In GenespotRE/secret_settings.py change the local database settings to match your local settings. You will also need to change other settings if not using isb-cgc as your Google Cloud Project (Pointing to correct .pem and .json files, and DEVELOPER_COHORT_TABLE_ID should be set to a unique table in a dataset in Big Query). You may need to change the name of the user, and password to match your local settings. Do not commit these changes.  Do similarly for scripts/add_site_ids.py and scripts/add_alldata_cohort.py. You can add additionaly sets of settings to the secret settings file if you like. Use an environment variable set in app.yaml and manage.py to switch between settings.
11. run `python manage.py makemigrations` - Setting up Django models
12. run `python manage.py migrate` - Setting up Django models
13. run `python manage.py createsuperuser` and leave the superuser's email blank.
14. Enter a mysql shell and run `CREATE USER 'django'@'localhost' IDENTIFIED BY 'PASSWORD'`
    and `GRANT SELECT, INSERT, UPDATE, DELETE ON <DATABASE NAME>.* TO 'django'@'localhost'`. Remember to set the password appropriately.
15. run `python scripts/add_site_ids.py`, making sure the settings in the script are correct to your environment.
16. Import metadata_samples and metadata_attr tables with `mysql -u root -p <databasename> < 7-23-15_metadata_attr_samples.sql` .
17. Import the feature definition tables by using a .sql dump file. There are multiple feature definition tables that are required.
  - feature_defs_cnvr
  - feature_defs_gexp
  - feature_defs_gnab
  - feature_defs_meth
  - feature_defs_mirn
  - feature_defs_rppa
18. run `dev_appserver.py .`
19. Go to [http://localhost:8080/](http://localhost:8080) and hope for the best!
20. If the site works, go to [http://localhost:8080/admin](http://localhost:8080/admin) and enter the superuser name and password you created.
  - Open the Social Applications table in admin to add a new Social Application. Make the provider Google, name it whatever you want ('Google' is fine), copy and paste the client_id and client_secret from our client_secrets.json file into the Social Application's Client id and Secret key fields. Leave the Key field blank. 
  - Then select isb-cgc.appspot.com, localhost:8000, and localhost:8080 in the Available sites field and move them to the Chosen sites field.
  
When running the app through dev_appserver.py, it is simulating the environment on the cloud. It is recommended to run the app this way, and not through the django manage.py runserver in order to simulate how it will run when deployed.

When app is running, api is also running at the same time. It is currently set up to look at local MySQL database if running locally, so make sure you have MySQL running. You can explore your local api [here](http://localhost:8080/_ah/api/explorer).
The main api endpoints can be explored at [https://isb-cgc.appspot.com/_ah/api/explorer](https://isb-cgc.appspot.com/_ah/api/explorer)
The development api endpoints can be explored at [https://dev-dot-isb-cgc.appspot.com/_ah/api/explorer](https://dev-dot-isb-cgc.appspot.com/_ah/api/explorer)

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
  
