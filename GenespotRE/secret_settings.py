import os
from os.path import join, dirname
import dotenv
dotenv.read_dotenv(join(dirname(__file__), '../.env'))


SETTINGS = {
    'SECRET_KEY': os.environ.get('DJANGO_SECRET_KEY', ''), # Django SECRET_KEY
    'DEBUG': os.environ.get('DEBUG', False),
    'PROJECT_ID': os.environ.get('GCLOUD_PROJECT_ID'), # Google Cloud Project ID #
    'BQ_PROJECT_ID': os.environ.get('BIGQUERY_PROJECT_ID', os.environ.get('GCLOUD_PROJECT_ID')), # Google Cloud Project ID #
    'PROJECT_NAME': os.environ.get('GCLOUD_PROJECT_NAME'),

    'REQUEST_PROJECT_EMAIL': os.environ.get('REQUEST_PROJECT_EMAIL', 'request@example.com'),

    # TODO: Should be deleted at some point in favor of merged settings
    'CLOUD_BASE_URL': os.environ.get('CLOUD_BASE_URL', 'http://isb-cgc.appspot.com/'), # Deployed url
    'CLOUD_API_URL': os.environ.get('CLOUD_API_URL', 'https://api-dot-isb-cgc.appspot.com/'), # Deployed api url
    'LOCAL_BASE_URL': os.environ.get('BASE_URL', 'http://localhost:8000'), # Localhost url

    'BASE_URL': os.environ.get('BASE_URL', 'http://localhost:8000'), # Localhost url
    'API_URL': os.environ.get('API_URL', 'http://localhost:8000'), # Localhost api url
    'ALLOWED_HOST': os.environ.get('ALLOWED_HOST', 'localhost'),


    # BigQuery cohort storage settings
    # TODO: Should be deleted at some point in favor of merged settings
    'COHORT_DATASET_ID': os.environ.get('COHORT_DATASET_ID', 'cohort_dataset'), # BigQuery dataset for storing cohorts
    'DEVELOPER_COHORT_TABLE_ID': os.environ.get('DEVELOPER_COHORT_TABLE_ID', 'developer_cohorts'), # For projects with multiple developers, set up a BQ table for each developer
    'CLOUD_COHORT_TABLE': os.environ.get('CLOUD_COHORT_TABLE', 'cohorts_table'), # BigQuery table for deployed app cohorts. This should be created in the dataset for storing cohorts

    'COHORT_TABLE': os.environ.get('CLOUD_COHORT_TABLE', 'cohorts_table'), # BigQuery table for cohorts

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
    #'BIGQUERY_PROJECT_NAME': 'isb-cgc', # Name of project that owns BigQuery datasets
    'BIGQUERY_PROJECT_NAME': os.environ.get('GCLOUD_PROJECT_NAME'),

    'GOOGLE_APPLICATION_CREDENTIALS': os.path.join(os.path.dirname(os.path.dirname(__file__)), os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')) if os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') else '', # Path to privatekey.json
    'CLIENT_SECRETS': os.path.join(os.path.dirname(os.path.dirname(__file__)), os.environ.get('CLIENT_SECRETS')) if os.environ.get('CLIENT_SECRETS') else '', # Path to client_secrets.json
    'PEM_FILE': os.path.join(os.path.dirname(os.path.dirname(__file__)), os.environ.get('PEM_FILE')) if os.environ.get('PEM_FILE') else '', # Path to privatekey.pem
    'CLIENT_EMAIL': os.environ.get('CLIENT_EMAIL', ''), # Client email from client_secrets.json
    'WEB_CLIENT_ID': os.environ.get('WEB_CLIENT_ID', ''), # Client ID from client_secrest.json
    'INSTALLED_APP_CLIENT_ID': os.environ.get('INSTALLED_APP_CLIENT_ID', ''), # Native Client ID

    'FAKE_DBGAP_AUTHENTICATION_LIST_FILENAME': os.environ.get('FAKE_DBGAP_AUTHENTICATION_LIST_FILENAME', ''),
    'DBGAP_AUTHENTICATION_LIST_FILENAME': os.environ.get('DBGAP_AUTHENTICATION_LIST_FILENAME', ''), # Name of file containing dbGaP Authentication list
    'DBGAP_AUTHENTICATION_LIST_BUCKET': os.environ.get('DBGAP_AUTHENTICATION_LIST_BUCKET', ''), # name of bucket containing dbGap Authentication list file
    'ACL_GOOGLE_GROUP': os.environ.get('ACL_GOOGLE_GROUP', ''), # Google group used for ACL list
    'OPEN_ACL_GOOGLE_GROUP': os.environ.get('OPEN_ACL_GOOGLE_GROUP', ''), # Google group used for ACL list
    'ERA_LOGIN_URL': os.environ.get('ERA_LOGIN_URL', ''), # Url to Python SAML virtul machine
    'IPV4': os.environ.get('IPV4', ''), # IP address of CloudSQL database

    # Compute services
    'PAIRWISE_SERVICE_URL': os.environ.get('PAIRWISE_SERVICE_URL'),

    # Cloud Storage Buckets
    'OPEN_DATA_BUCKET': os.environ.get('OPEN_DATA_BUCKET'),
    'CONTROLLED_DATA_BUCKET': os.environ.get('CONTROLLED_DATA_BUCKET'),

    'USE_CLOUD_STORAGE': os.environ.get('USE_CLOUD_STORAGE', 'False'),
    'GCLOUD_BUCKET': os.environ.get('GOOGLE_STORAGE_BUCKET'),
    'MEDIA_FOLDER': os.environ.get('MEDIA_FOLDER', 'uploads/'),

    # IGV Project ID
    'IGV_PROJECT_ID': os.environ.get('IGV_PROJECT_ID'),

    # Processing
    'PROCESSING_ENABLED': os.environ.get('PROCESSING_ENABLED', False),
    'PROCESSING_JENKINS_URL': os.environ.get('PROCESSING_JENKINS_URL', 'http://localhost/jenkins'),
    'PROCESSING_JENKINS_PROJECT': os.environ.get('PROCESSING_JENKINS_PROJECT', 'cgc-processing'),
    'PROCESSING_JENKINS_USER': os.environ.get('PROCESSING_JENKINS_USER', 'user'),
    'PROCESSING_JENKINS_PASSWORD': os.environ.get('PROCESSING_JENKINS_PASSWORD', ''),

    # SAML setting
    'SAML_FOLDER': os.environ.get('SAML_FOLDER'),

    'SU_USER': os.environ.get('SUPERUSER_USERNAME', 'isb'),
    'SU_PASS': os.environ.get('SUPERUSER_PASSWORD', 'isbcgctest'),

    'SITE_GOOGLE_TAG_MANAGER_ID' : os.environ.get('SITE_GOOGLE_TAG_MANAGER_ID', False),
    'SITE_GOOGLE_ANALYTICS' : os.environ.get('SITE_GOOGLE_ANALYTICS_ID', False),
}

if os.environ.has_key('DB_SSL_CERT'):
    SETTINGS['DATABASE']['default']['OPTIONS'] = {
        'ssl': {
            'ca': os.environ.get('DB_SSL_CA'),
            'cert': os.environ.get('DB_SSL_CERT'),
            'key': os.environ.get('DB_SSL_KEY')
        }
    }

def get(setting):
    #TODO: This should throw an exception
    if setting in SETTINGS:
        return SETTINGS[setting]
    else:
        print setting, ' is not a valid setting.'
        return None