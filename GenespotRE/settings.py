###
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###
from __future__ import print_function

from builtins import str
from builtins import object
import os
from os.path import join, dirname
import sys
import dotenv
from socket import gethostname, gethostbyname

env_path = '../'
if os.environ.get('SECURE_LOCAL_PATH', None):
    env_path += os.environ.get('SECURE_LOCAL_PATH')

dotenv.read_dotenv(join(dirname(__file__), env_path+'.env'))

APP_ENGINE_FLEX = 'aef-'
APP_ENGINE = 'Google App Engine/'

BASE_DIR                = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)) + os.sep

SHARED_SOURCE_DIRECTORIES = [
    'ISB-CGC-Common'
]

# The Google AppEngine library and the Google Cloud APIs don't play nice. Teach them to get along.
# This unfortunately requires either hardcoding the path to the SDK, or sorting out a way to
# provide an environment variable indicating where it is.
# From https://github.com/GoogleCloudPlatform/python-repo-tools/blob/master/gcp_devrel/testing/appengine.py#L26
def setup_sdk_imports():
    """Sets up appengine SDK third-party imports."""
    sdk_path = os.environ.get('GAE_SDK_PATH', '/usr/lib/google-cloud-sdk')

    # Trigger loading of the Cloud APIs so they're in sys.modules
    import google.cloud

    # The libraries are specifically under platform/google_appengine
    if os.path.exists(os.path.join(sdk_path, 'platform/google_appengine')):
        sdk_path = os.path.join(sdk_path, 'platform/google_appengine')

    # This sets up libraries packaged with the SDK, but puts them last in
    # sys.path to prevent clobbering newer versions
    if 'google' in sys.modules:
        sys.modules['google'].__path__.append(
            os.path.join(sdk_path, 'google'))

    sys.path.append(sdk_path)


# Add the shared Django application subdirectory to the Python module search path
for directory_name in SHARED_SOURCE_DIRECTORIES:
    sys.path.append(os.path.join(BASE_DIR, directory_name))

setup_sdk_imports()

DEBUG                   = (os.environ.get('DEBUG', 'False') == 'True')
DEBUG_TOOLBAR           = (os.environ.get('DEBUG_TOOLBAR', 'False') == 'True')

print("[STATUS] DEBUG mode is "+str(DEBUG), file=sys.stdout)

# Theoretically Nginx allows us to use '*' for ALLOWED_HOSTS but...
ALLOWED_HOSTS = list(set(os.environ.get('ALLOWED_HOST', 'localhost').split(',') + ['localhost', '127.0.0.1', '[::1]', gethostname(), gethostbyname(gethostname()),]))
#ALLOWED_HOSTS = ['*']

SSL_DIR = os.path.abspath(os.path.dirname(__file__))+os.sep

ADMINS                  = ()
MANAGERS                = ADMINS

GCLOUD_PROJECT_ID              = os.environ.get('GCLOUD_PROJECT_ID', '')
GCLOUD_PROJECT_NUMBER          = os.environ.get('GCLOUD_PROJECT_NUMBER', '')
BIGQUERY_PROJECT_ID           = os.environ.get('BIGQUERY_PROJECT_ID', GCLOUD_PROJECT_ID)
BIGQUERY_DATASET_V1         = os.environ.get('BIGQUERY_DATASET_V1', '')
BIGQUERY_DATA_PROJECT_ID  = os.environ.get('BIGQUERY_DATA_PROJECT_ID', GCLOUD_PROJECT_ID)

# Deployment module
CRON_MODULE             = os.environ.get('CRON_MODULE')

# Log Names
SERVICE_ACCOUNT_LOG_NAME = os.environ.get('SERVICE_ACCOUNT_LOG_NAME', 'local_dev_logging')
WEBAPP_LOGIN_LOG_NAME = os.environ.get('WEBAPP_LOGIN_LOG_NAME', 'local_dev_logging')
GCP_ACTIVITY_LOG_NAME = os.environ.get('GCP_ACTIVITY_LOG_NAME', 'local_dev_logging')

BASE_URL                = os.environ.get('BASE_URL', 'https://isb-cgc-test.appspot.com')
BASE_API_URL            = os.environ.get('BASE_API_URL', 'https://api-dot-isb-cgc-test.appspot.com')

# Compute services - Should not be necessary in webapp
PAIRWISE_SERVICE_URL    = os.environ.get('PAIRWISE_SERVICE_URL', None)

# Data Buckets
OPEN_DATA_BUCKET        = os.environ.get('OPEN_DATA_BUCKET', '')
GCLOUD_BUCKET           = os.environ.get('GOOGLE_STORAGE_BUCKET')

# BigQuery cohort storage settings
BIGQUERY_COHORT_DATASET_ID           = os.environ.get('BIGQUERY_COHORT_DATASET_ID', 'cohort_dataset')
BIGQUERY_COHORT_TABLE_ID    = os.environ.get('BIGQUERY_COHORT_TABLE_ID', 'developer_cohorts')
BIGQUERY_COSMIC_DATASET_ID    = os.environ.get('BIGQUERY_COSMIC_DATASET_ID', '')
BIGQUERY_CGC_TABLE_ID    = os.environ.get('BIGQUERY_CGC_TABLE_ID', '')
MAX_BQ_INSERT               = int(os.environ.get('MAX_BQ_INSERT', '500'))

USER_DATA_ON            = bool(os.environ.get('USER_DATA_ON', False))

database_config = {
    'default': {
        'ENGINE': os.environ.get('DATABASE_ENGINE', 'django.db.backends.mysql'),
        'HOST': os.environ.get('DATABASE_HOST', '127.0.0.1'),
        'NAME': os.environ.get('DATABASE_NAME', ''),
        'USER': os.environ.get('DATABASE_USER'),
        'PASSWORD': os.environ.get('DATABASE_PASSWORD')
    }
}

# On the build system, we need to use build-system specific database information

if os.environ.get('CI', None) is not None:
    database_config = {
        'default': {
            'ENGINE': os.environ.get('DATABASE_ENGINE', 'django.db.backends.mysql'),
            'HOST': os.environ.get('DATABASE_HOST_BUILD', '127.0.0.1'),
            'NAME': os.environ.get('DATABASE_NAME_BUILD', ''),
            'PORT': 3306,
            'USER': os.environ.get('DATABASE_USER_BUILD'),
            'PASSWORD': os.environ.get('MYSQL_ROOT_PASSWORD_BUILD')
        }
    }

DATABASES = database_config
DB_SOCKET = database_config['default']['HOST'] if 'cloudsql' in database_config['default']['HOST'] else None

IS_DEV = (os.environ.get('IS_DEV', 'False') == 'True')
IS_APP_ENGINE_FLEX = os.getenv('GAE_INSTANCE', '').startswith(APP_ENGINE_FLEX)
IS_APP_ENGINE = os.getenv('SERVER_SOFTWARE', '').startswith(APP_ENGINE)

# If this is a GAE-Flex deployment, we don't need to specify SSL; the proxy will take
# care of that for us
if 'DB_SSL_CERT' in os.environ and not IS_APP_ENGINE_FLEX:
    DATABASES['default']['OPTIONS'] = {
        'ssl': {
            'ca': os.environ.get('DB_SSL_CA'),
            'cert': os.environ.get('DB_SSL_CERT'),
            'key': os.environ.get('DB_SSL_KEY')
        }
    }

# Default to localhost for the site ID
SITE_ID = 3

if IS_APP_ENGINE_FLEX or IS_APP_ENGINE:
    print("[STATUS] AppEngine Flex detected.", file=sys.stdout)
    SITE_ID = 4


def get_project_identifier():
    return BIGQUERY_PROJECT_ID


# Set cohort table here
if BIGQUERY_COHORT_TABLE_ID is None:
    raise Exception("Developer-specific cohort table ID is not set.")

BQ_MAX_ATTEMPTS             = int(os.environ.get('BQ_MAX_ATTEMPTS', '10'))


# TODO Remove duplicate class.
#
# This class is retained here, as it is required by bq_data_access/v1.
# bq_data_access/v2 uses the class from the bq_data_access/bigquery_cohorts module.
class BigQueryCohortStorageSettings(object):
    def __init__(self, dataset_id, table_id):
        self.dataset_id = dataset_id
        self.table_id = table_id


def GET_BQ_COHORT_SETTINGS():
    return BigQueryCohortStorageSettings(BIGQUERY_COHORT_DATASET_ID, BIGQUERY_COHORT_TABLE_ID)

USE_CLOUD_STORAGE           = os.environ.get('USE_CLOUD_STORAGE', False)

PROCESSING_ENABLED          = os.environ.get('PROCESSING_ENABLED', False)
PROCESSING_JENKINS_URL      = os.environ.get('PROCESSING_JENKINS_URL', 'http://localhost/jenkins')
PROCESSING_JENKINS_PROJECT  = os.environ.get('PROCESSING_JENKINS_PROJECT', 'cgc-processing')
PROCESSING_JENKINS_USER     = os.environ.get('PROCESSING_JENKINS_USER', 'user')
PROCESSING_JENKINS_PASSWORD = os.environ.get('PROCESSING_JENKINS_PASSWORD', '')

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

CSRF_COOKIE_SECURE = bool(os.environ.get('CSRF_COOKIE_SECURE', False))
SESSION_COOKIE_SECURE = bool(os.environ.get('SESSION_COOKIE_SECURE', False))
SECURE_SSL_REDIRECT = bool(os.environ.get('SECURE_SSL_REDIRECT', False))

SECURE_REDIRECT_EXEMPT = []

if SECURE_SSL_REDIRECT:
    # Exempt the health check so it can go through
    SECURE_REDIRECT_EXEMPT = [r'^_ah/(vm_)?health$', ]

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# On Unix systems, a value of None will cause Django to use the same
# timezone as the operating system.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Los_Angeles'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale.
USE_L10N = True

# If you set this to False, Django will not use timezone-aware datetimes.
USE_TZ = True

# Absolute filesystem path to the directory that will hold user-uploaded files.
# Example: "/home/media/media.lawrence.com/media/"
MEDIA_FOLDER = os.environ.get('MEDIA_FOLDER', 'uploads/')
MEDIA_ROOT = os.path.join(os.path.dirname(__file__), '..', '..', MEDIA_FOLDER)
MEDIA_ROOT = os.path.normpath(MEDIA_ROOT)

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash.
# Examples: "http://media.lawrence.com/media/", "http://example.com/media/"
MEDIA_URL = ''

# Absolute path to the directory static files should be collected to.
# Don't put anything in this directory yourself; store your static files
# in apps' "static/" subdirectories and in STATICFILES_DIRS.
# Example: "/home/media/media.lawrence.com/static/"
STATIC_ROOT = ''

# URL prefix for static files.
# Example: "http://media.lawrence.com/static/"
STATIC_URL = os.environ.get('STATIC_URL', '/static/')

GCS_STORAGE_URI = os.environ.get('GCS_STORAGE_URI', 'https://storage.googleapis.com/')

# Additional locations of static files
STATICFILES_DIRS = (
    # Put strings here, like "/home/html/static" or "C:/www/django/static".
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join(BASE_DIR, 'static'),
)

# List of finder classes that know how to find static files in
# various locations.
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

# Make this unique, and don't share it with anybody.
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')

SECURE_HSTS_INCLUDE_SUBDOMAINS = (os.environ.get('SECURE_HSTS_INCLUDE_SUBDOMAINS','True') == 'True')
SECURE_HSTS_PRELOAD = (os.environ.get('SECURE_HSTS_PRELOAD','True') == 'True')
SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS','3600'))

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # For using NDB with Django
    # documentation: https://cloud.google.com/appengine/docs/python/ndb/#integration
    # WE DON'T SEEM TO BE USING NDB SO I'M COMMENTING THIS OUT - PL
    # 'google.appengine.ext.ndb.django_middleware.NdbDjangoMiddleware',
    # 'google.appengine.ext.appstats.recording.AppStatsDjangoMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'GenespotRE.checkreqsize_middleware.CheckReqSize',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'adminrestrict.middleware.AdminPagesRestrictMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'offline.middleware.OfflineMiddleware',
]

ROOT_URLCONF = 'GenespotRE.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'GenespotRE.wsgi.application'

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'GenespotRE',
    'visualizations',
    'seqpeek',
    'sharing',
    'cohorts',
    'projects',
    'genes',
    'variables',
    'workbooks',
    'notebooks',
    'data_upload',
    'analysis',
    'offline',
    'adminrestrict',
)

#############################
#  django-session-security  #
#############################

# testing "session security works at the moment" commit
INSTALLED_APPS += ('session_security',)
SESSION_SECURITY_WARN_AFTER = 540
SESSION_SECURITY_EXPIRE_AFTER = 600
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
MIDDLEWARE.append(
    # for django-session-security -- must go *after* AuthenticationMiddleware
    'session_security.middleware.SessionSecurityMiddleware',
)

###############################
# End django-session-security #
###############################

TEST_RUNNER = 'django.test.runner.DiscoverRunner'

# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
# See http://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse'
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue'
        },
    },
    'formatters': {
        'verbose': {
            'format': '[%(levelname)s] @%(asctime)s in %(module)s/%(process)d/%(thread)d - %(message)s'
        },
        'simple': {
            'format': '[%(levelname)s] @%(asctime)s in %(module)s: %(message)s'
        },
    },
    'handlers': {
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler'
        },
        'console_dev': {
            'level': 'DEBUG',
            'filters': ['require_debug_true'],
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'console_prod': {
            'level': 'DEBUG',
            'filters': ['require_debug_false'],
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'django.request': {
            'handlers': ['mail_admins'],
            'level': 'ERROR',
            'propagate': True,
        },
        'main_logger': {
            'handlers': ['console_dev', 'console_prod'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'allauth': {
            'handlers': ['console_dev', 'console_prod'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'google_helpers': {
            'handlers': ['console_dev', 'console_prod'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'data_upload': {
            'handlers': ['console_dev', 'console_prod'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

##########################
#  Start django-allauth  #
##########################

LOGIN_REDIRECT_URL = '/extended_login/'

INSTALLED_APPS += (
    'accounts',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google')

# Template Engine Settings
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # add any necessary template paths here
        'DIRS': [
            os.path.join(BASE_DIR, 'templates'),
            os.path.join(BASE_DIR, 'templates', 'accounts'),
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            # add any context processors here
            'context_processors': (
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.tz',
                'finalware.context_processors.contextify',
                'GenespotRE.context_processor.additional_context',
            ),
            # add any loaders here; if using the defaults, we can comment it out
            # 'loaders': (
            #     'django.template.loaders.filesystem.Loader',
            #     'django.template.loaders.app_directories.Loader'
            # ),
            'debug': DEBUG,
        },
    },
]

AUTHENTICATION_BACKENDS = (
    # Needed to login by username in Django admin, regardless of `allauth`
    "django.contrib.auth.backends.ModelBackend",

    # `allauth` specific authentication methods, such as login by e-mail
    "allauth.account.auth_backends.AuthenticationBackend",
)

SOCIALACCOUNT_PROVIDERS = \
    { 'google':
        { 'SCOPE': ['profile', 'email'],
          'AUTH_PARAMS': { 'access_type': 'online' }
        }
    }

# Trying to force allauth to only use https
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
# ...but not if this is a local dev build
if IS_DEV:
    ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'http'


##########################
#   End django-allauth   #
##########################

GOOGLE_APPLICATION_CREDENTIALS  = os.path.join(os.path.dirname(os.path.dirname(__file__)), os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')) if os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') else '' # Path to privatekey.json
CLIENT_SECRETS                  = os.path.join(os.path.dirname(os.path.dirname(__file__)), os.environ.get('CLIENT_SECRETS')) if os.environ.get('CLIENT_SECRETS') else ''
WEB_CLIENT_ID                   = os.environ.get('WEB_CLIENT_ID', '') # Client ID from client_secrets.json
IGV_WEB_CLIENT_ID               = os.environ.get('IGV_WEB_CLIENT_ID', WEB_CLIENT_ID)
INSTALLED_APP_CLIENT_ID         = os.environ.get('INSTALLED_APP_CLIENT_ID', '') # Native Client ID
GCP_REG_CLIENT_EMAIL            = os.environ.get('CLIENT_EMAIL','')

#################################
#   For NIH/eRA Commons login   #
#################################

LOGIN_EXPIRATION_MINUTES                = int(os.environ.get('LOGIN_EXPIRATION_MINUTES', 24*60))
OPEN_ACL_GOOGLE_GROUP                   = os.environ.get('OPEN_ACL_GOOGLE_GROUP', '')
GOOGLE_GROUP_ADMIN                      = os.environ.get('GOOGLE_GROUP_ADMIN', '')
SUPERADMIN_FOR_REPORTS                  = os.environ.get('SUPERADMIN_FOR_REPORTS', '')

# TaskQueue used when users go through the ERA flow
LOGOUT_WORKER_TASKQUEUE                  = os.environ.get('LOGOUT_WORKER_TASKQUEUE', '')
CHECK_NIH_USER_LOGIN_TASK_URI            = os.environ.get('CHECK_NIH_USER_LOGIN_TASK_URI', '')

# TaskQueue used by the sweep_nih_user_logins task
LOGOUT_SWEEPER_FALLBACK_TASKQUEUE        = os.environ.get('LOGOUT_SWEEPER_FALLBACK_TASKQUEUE', '')

# PubSub topic for ERA login notifications
PUBSUB_TOPIC_ERA_LOGIN                   = os.environ.get('PUBSUB_TOPIC_ERA_LOGIN', '')

# User project access key
USER_GCP_ACCESS_CREDENTIALS              = os.environ.get('USER_GCP_ACCESS_CREDENTIALS', '')

# Log name for ERA login views
LOG_NAME_ERA_LOGIN_VIEW                  = os.environ.get('LOG_NAME_ERA_LOGIN_VIEW', '')

# Service account blacklist file path
SERVICE_ACCOUNT_BLACKLIST_PATH           = os.environ.get('SERVICE_ACCOUNT_BLACKLIST_PATH', '')

# Google Org whitelist file path
GOOGLE_ORG_WHITELIST_PATH                = os.environ.get('GOOGLE_ORG_WHITELIST_PATH', '')

# Managed Service Account file path
MANAGED_SERVICE_ACCOUNTS_PATH            = os.environ.get('MANAGED_SERVICE_ACCOUNTS_PATH', '')

# DCF Phase I enable flag
DCF_TEST                                 = bool(os.environ.get('DCF_TEST', 'False') == 'True')

# SA via DCF
SA_VIA_DCF                               = bool(os.environ.get('SA_VIA_DCF', 'False') == 'True')

# DCF Monitoring SA
DCF_MONITORING_SA                        = os.environ.get('DCF_MONITORING_SA', '')

#################################
#   For DCF login               #
#################################

DCF_AUTH_URL                             = os.environ.get('DCF_AUTH_URL', '')
DCF_TOKEN_URL                            = os.environ.get('DCF_TOKEN_URL', '')
DCF_USER_URL                             = os.environ.get('DCF_USER_URL', '')
DCF_KEY_URL                              = os.environ.get('DCF_KEY_URL', '')
DCF_GOOGLE_URL                           = os.environ.get('DCF_GOOGLE_URL', '')
DCF_REVOKE_URL                           = os.environ.get('DCF_REVOKE_URL', '')
DCF_LOGOUT_URL                           = os.environ.get('DCF_LOGOUT_URL', '')
DCF_URL_URL                              = os.environ.get('DCF_URL_URL', '')
DCF_CLIENT_SECRETS                       = os.environ.get('DCF_CLIENT_SECRETS', '')
DCF_GOOGLE_SA_REGISTER_URL               = os.environ.get('DCF_GOOGLE_SA_REGISTER_URL', '')
DCF_GOOGLE_SA_VERIFY_URL                 = os.environ.get('DCF_GOOGLE_SA_VERIFY_URL', '')
DCF_GOOGLE_SA_MONITOR_URL                = os.environ.get('DCF_GOOGLE_SA_MONITOR_URL', '')
DCF_GOOGLE_SA_URL                        = os.environ.get('DCF_GOOGLE_SA_URL', '')
DCF_TOKEN_REFRESH_WINDOW_SECONDS         = int(os.environ.get('DCF_TOKEN_REFRESH_WINDOW_SECONDS', 86400))
DCF_LOGIN_EXPIRATION_SECONDS             = int(os.environ.get('DCF_LOGIN_EXPIRATION_SECONDS', 86400))

##############################
#   Start django-finalware   #
##############################

INSTALLED_APPS += (
    'finalware',)

SITE_SUPERUSER_USERNAME = os.environ.get('SUPERUSER_USERNAME', '')
SITE_SUPERUSER_EMAIL = ''
SITE_SUPERUSER_PASSWORD = os.environ.get('SUPERUSER_PASSWORD', '')

############################
#   End django-finalware   #
############################

CONN_MAX_AGE = 60

############################
#   CUSTOM TEMPLATE CONTEXT
############################

############################
#   METRICS SETTINGS
############################

SITE_GOOGLE_ANALYTICS   = bool(os.environ.get('SITE_GOOGLE_ANALYTICS_TRACKING_ID', None) is not None)
SITE_GOOGLE_ANALYTICS_TRACKING_ID = os.environ.get('SITE_GOOGLE_ANALYTICS_TRACKING_ID', '')
METRICS_SPREADSHEET_ID = os.environ.get('METRICS_SPREADSHEET_ID', '')
METRICS_SHEET_ID = os.environ.get('METRICS_SHEET_ID', '0')
METRICS_BQ_DATASET = os.environ.get('METRICS_BQ_DATASET', '')

##############################################################
#   MAXes to prevent size-limited events from causing errors
##############################################################

# Google App Engine has a response size limit of 32M. ~65k entries from the cohort_filelist view will
# equal just under the 32M limit. If each individual listing is ever lengthened or shortened this
# number should be adjusted
MAX_FILE_LIST_REQUEST = 65000

# IGV limit to prevent users from trying ot open dozens of files
MAX_FILES_IGV = 5

# Rough max file size to allow for eg. barcode list upload, to revent triggering RequestDataTooBig
FILE_SIZE_UPLOAD_MAX = 1950000

#################################
# caMicroscope Viewer settings
#################################
CAMIC_VIEWER = os.environ.get('CAMIC_VIEWER', None)
IMG_THUMBS_URL = os.environ.get('IMG_THUMBS_URL', None)

#################################
# DICOM Viewer settings
#################################
DICOM_VIEWER = os.environ.get('DICOM_VIEWER', None)

#################################
# NOTEBOOK settings
#################################
# NOTEBOOK_VIEWER = os.environ.get('NOTEBOOK_VIEWER', None)
NOTEBOOK_VIEWER = ''
# NOTEBOOK_ENV_LOC = os.path.join(BASE_DIR, os.environ.get('NOTEBOOK_ENV_PATH', None))
# NOTEBOOK_SL_PATH = os.path.join(BASE_DIR, os.environ.get('NOTEBOOK_SL_PATH', None))
#################################
# SOLR settings
#################################
SOLR_URL = os.environ.get('SOLR_URL', None)

##############################################################
#   MailGun Email Settings
##############################################################

EMAIL_SERVICE_API_URL = os.environ.get('EMAIL_SERVICE_API_URL', '')
EMAIL_SERVICE_API_KEY = os.environ.get('EMAIL_SERVICE_API_KEY', '')
NOTIFICATION_EMAIL_FROM_ADDRESS = os.environ.get('NOTIFICATOON_EMAIL_FROM_ADDRESS', '')

# Explicitly check for known items
BLACKLIST_RE = r'((?i)<script>|(?i)</script>|!\[\]|!!\[\]|\[\]\[\".*\"\]|(?i)<iframe>|(?i)</iframe>)'

# IndexD settings
INDEXD_URI = os.environ.get('INDEXD_URI', None)
INDEXD_REQ_LIMIT = int(os.environ.get('INDEXD_REQ_LIMIT', '100'))


if DEBUG and DEBUG_TOOLBAR:
    INSTALLED_APPS += ('debug_toolbar',)
    MIDDLEWARE.append('debug_toolbar.middleware.DebugToolbarMiddleware',)
    DEBUG_TOOLBAR_PANELS = [
        'debug_toolbar.panels.versions.VersionsPanel',
        'debug_toolbar.panels.timer.TimerPanel',
        'debug_toolbar.panels.settings.SettingsPanel',
        'debug_toolbar.panels.headers.HeadersPanel',
        'debug_toolbar.panels.request.RequestPanel',
        'debug_toolbar.panels.sql.SQLPanel',
        'debug_toolbar.panels.staticfiles.StaticFilesPanel',
        'debug_toolbar.panels.templates.TemplatesPanel',
        'debug_toolbar.panels.cache.CachePanel',
        'debug_toolbar.panels.signals.SignalsPanel',
        'debug_toolbar.panels.logging.LoggingPanel',
        'debug_toolbar.panels.redirects.RedirectsPanel',
    ]
    SHOW_TOOLBAR_CALLBACK = True
    INTERNAL_IPS = (os.environ.get('INTERNAL_IP', ''),)
