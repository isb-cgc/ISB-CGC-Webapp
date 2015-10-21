import os

### MVM STUFF
SSL_DIR = os.path.abspath(os.path.dirname(__file__))+os.sep
if 'VERSION_NAME' in os.environ:
    VER = os.getenv('VERSION_NAME')
else:
    VER = 'DEV'
###

SETTINGS = {
    'SECRET_KEY': '', # Django SECRET_KEY
    'DEBUG': True,
    'PROJECT_ID': '000000000000', # Google Cloud Project ID #
    'BQ_PROJECT_ID': '000000000000', # Google Cloud Project ID #

    'CLOUD_BASE_URL': 'http://'+VER+'-dot-isb-cgc.appspot.com', # Deployed url
    'CLOUD_API_URL': 'https://'+VER+'-dot-isb-cgc.appspot.com', # Deployed api url

    'LOCAL_BASE_URL': 'http://localhost:8000', # Localhost url


    # BigQuery cohort storage settings
    'COHORT_DATASET_ID': 'cohort_dataset', # BigQuery dataset for storing cohorts
    'DEVELOPER_COHORT_TABLE_ID': 'developer_cohorts', # For projects with multiple developers, set up a BQ table for each developer
    'CLOUD_COHORT_TABLE': 'cohorts_table', # BigQuery table for deployed app cohorts. This should be created in the dataset for storing cohorts

    # Database settings
    'CLOUD_DATABASE': {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'HOST': '<ip-of-cloudsql-instance>',
            'NAME': '<name-of-database-in-cloudsql>',
            'USER': '<username>',
            'PASSWORD': '<password>',
            'PORT': 3306,
            'OPTIONS': {
                'ssl': {
                    'ca': SSL_DIR + 'server-ca.pem',
                    'cert': SSL_DIR + 'client-cert.pem',
                    'key': SSL_DIR + 'client-key.pem'
                }
            }
        }
    },
    'CLOUD_DATABASE_LOCAL_CONNECTION': {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'HOST': '<ip-of-cloudsql-instance>',
            'NAME': '<name-of-database-in-cloudsql>',
            'USER': '<username>',
            'PASSWORD': '<password>'
        }
    },
    'LOCAL_DATABASE': {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': '<local-database-name>',
            'USER': '<username>',
            'PASSWORD': '<password>'
        }
    },
    'TEST_DATABASE': {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': '<testing-database-name>',
            'USER': '<username>',
            'PASSWORD': '<password>'
        }
    },
    'BIGQUERY_DATASET': 'isb_cgc', # ??? Who is using this ???
    'BIGQUERY_DATASET2': 'tcga_data_open', # Name of BigQuery dataset containing open tcga data
    'BIGQUERY_PROJECT_NAME': 'isb-cgc', # Name of project that owns BigQuery datasets

    'GOOGLE_APPLICATION_CREDENTIALS': '', # Path to privatekey.json
    'CLIENT_SECRETS': '', # Path to client_secrets.json
    'PEM_FILE': '', # Path to privatekey.pem
    'CLIENT_EMAIL': 'example@developer.gserviceaccount.com', # Client email from client_secrets.json
    'WEB_CLIENT_ID': 'example.apps.googleusercontent.com', # Client ID from client_secrest.json
    'INSTALLED_APP_CLIENT_ID': 'example.apps.googleusercontent.com', # Native Client ID

    'DBGAP_AUTHENTICATION_LIST_FILENAME': '', # Name of file containing dbGaP Authentication list
    'DBGAP_AUTHENTICATION_LIST_BUCKET': '', # name of bucket containing dbGap Authentication list file
    'ACL_GOOGLE_GROUP': '', # Google group used for ACL list
    'ERA_LOGIN_URL': '', # Url to Python SAML virtul machine
    'IPV4': '', # IP address of CloudSQL database

    # Compute services
    'PAIRWISE_SERVICE_URL': '',

    # Cloud Storage Buckets
    'OPEN_DATA_BUCKET': '',
    'CONTROLLED_DATA_BUCKET': ''
}

def get(setting):
    if setting in SETTINGS:
        return SETTINGS[setting]
    else:
        print setting, ' is not a valid setting.'
        return None