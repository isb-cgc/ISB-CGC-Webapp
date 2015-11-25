"""

Copyright 2015, Institute for Systems Biology

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

SETTINGS = {
    'SECRET_KEY': '', # Django SECRET_KEY
    'DEBUG': True,
    'PROJECT_ID': '000000000000', # Google Cloud Project ID #
    'BQ_PROJECT_ID': '000000000000', # Google Cloud Project ID #

    'CLOUD_BASE_URL': 'http://example.appspot.com', # Deployed url
    'CLOUD_API_URL': 'https://example.appspot.com', # Deployed api url

    'LOCAL_BASE_URL': 'http://localhost:8000', # Localhost url


    # BigQuery cohort storage settings
    'COHORT_DATASET_ID': 'cohort_dataset', # BigQuery dataset for storing cohorts
    'DEVELOPER_COHORT_TABLE_ID': 'developer_cohorts', # For projects with multiple developers, set up a BQ table for each developer
    'CLOUD_COHORT_TABLE': 'cohorts_table', # BigQuery table for deployed app cohorts. This should be created in the dataset for storing cohorts

    # Database settings
    'CLOUD_DATABASE': {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'HOST': '/cloudsql/<your-database-instance>',
            'NAME': '<name-of-database-in-cloudsql>',
            'USER': '<username>'
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
    'IPV4': '173.194.225.46', # ??? Who is using this ???
}

def get(setting):
    if setting in SETTINGS:
        return SETTINGS[setting]
    else:
        print setting, ' is not a valid setting.'
        return None