import os
from os.path import join, dirname
import dotenv
dotenv.read_dotenv(join(dirname(__file__), '../.env'))


SETTINGS = {
    'SECRET_KEY': os.environ.get('DJANGO_SECRET_KEY'), # Django SECRET_KEY
    'DEBUG': True,
    'PROJECT_ID': os.environ.get('GCLOUD_PROJECT_ID'), # Google Cloud Project ID #
    'BQ_PROJECT_ID': os.environ.get('BIGQUERY_PROJECT_ID', os.environ.get('GCLOUD_PROJECT_ID')), # Google Cloud Project ID #

    # TODO: Should be deleted at some point in favor of merged settings
    'CLOUD_BASE_URL': os.environ.get('CLOUD_BASE_URL', 'http://isb-cgc.appspot.com/'), # Deployed url
    'CLOUD_API_URL': os.environ.get('CLOUD_API_URL', 'https://api-dot-isb-cgc.appspot.com/'), # Deployed api url
    'LOCAL_BASE_URL': os.environ.get('BASE_URL', 'http://localhost:8000'), # Localhost url

    'BASE_URL': os.environ.get('BASE_URL', 'http://localhost:8000'), # Localhost url
    'API_URL': os.environ.get('API_URL', 'http://localhost:8000'), # Localhost api url


    # BigQuery cohort storage settings
    # TODO: Should be deleted at some point in favor of merged settings
    'COHORT_DATASET_ID': os.environ.get('COHORT_DATASET_ID', 'cohort_dataset'), # BigQuery dataset for storing cohorts
    'DEVELOPER_COHORT_TABLE_ID': os.environ.get('DEVELOPER_COHORT_TABLE_ID', 'developer_cohorts'), # For projects with multiple developers, set up a BQ table for each developer
    'CLOUD_COHORT_TABLE': os.environ.get('COHORT_TABLE', 'cohorts_table'), # BigQuery table for deployed app cohorts. This should be created in the dataset for storing cohorts

    'COHORT_TABLE': os.environ.get('COHORT_TABLE', 'cohorts_table'), # BigQuery table for cohorts

    # Database settings
    # TODO: Should be deleted at some point in favor of merged settings
    'CLOUD_DATABASE': {
        'default': {
            'ENGINE': os.environ.get('DATABASE_ENGINE', 'django.db.backends.mysql'),
            'HOST': os.environ.get('DATABASE_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DATABASE_PORT', 3306),
            'NAME': os.environ.get('DATABASE_NAME', 'dev'),
            'USER': os.environ.get('DATABASE_USER'),
            'PASSWORD': os.environ.get('DATABASE_PASSWORD')
        }
    },
    'CLOUD_DATABASE_LOCAL_CONNECTION': {
        'default': {
            'ENGINE': os.environ.get('DATABASE_ENGINE', 'django.db.backends.mysql'),
            'HOST': os.environ.get('DATABASE_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DATABASE_PORT', 3306),
            'NAME': os.environ.get('DATABASE_NAME', 'dev'),
            'USER': os.environ.get('DATABASE_USER'),
            'PASSWORD': os.environ.get('DATABASE_PASSWORD')
        }
    },
    'LOCAL_DATABASE': {
        'default': {
            'ENGINE': os.environ.get('DATABASE_ENGINE', 'django.db.backends.mysql'),
            'HOST': os.environ.get('DATABASE_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DATABASE_PORT', 3306),
            'NAME': os.environ.get('DATABASE_NAME', 'dev'),
            'USER': os.environ.get('DATABASE_USER'),
            'PASSWORD': os.environ.get('DATABASE_PASSWORD')
        }
    },
    'TEST_DATABASE': {
        'default': {
            'ENGINE': os.environ.get('DATABASE_ENGINE', 'django.db.backends.mysql'),
            'HOST': os.environ.get('DATABASE_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DATABASE_PORT', 3306),
            'NAME': os.environ.get('DATABASE_NAME', 'test'),
            'USER': os.environ.get('DATABASE_USER'),
            'PASSWORD': os.environ.get('DATABASE_PASSWORD')
        }
    },

    'DATABASE': {
        'default': {
            'ENGINE': os.environ.get('DATABASE_ENGINE', 'django.db.backends.mysql'),
            'HOST': os.environ.get('DATABASE_HOST', '127.0.0.1'),
            'PORT': os.environ.get('DATABASE_PORT', 3306),
            'NAME': os.environ.get('DATABASE_NAME', 'dev'),
            'USER': os.environ.get('DATABASE_USER'),
            'PASSWORD': os.environ.get('DATABASE_PASSWORD')
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
    'CONTROLLED_DATA_BUCKET': '',

    'SU_USER': os.environ.get('SUPERUSER_USERNAME', 'isb'),
    'SU_PASS': os.environ.get('SUPERUSER_PASSWORD'),
}

def get(setting):
    #TODO: This should throw an exception
    if setting in SETTINGS:
        return SETTINGS[setting]
    else:
        print setting, ' is not a valid setting.'
        return None