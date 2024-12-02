###
# Copyright 2015-2023, Institute for Systems Biology
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
import re
import datetime
from os.path import join, dirname, exists
import sys
import dotenv
from socket import gethostname, gethostbyname


SECURE_LOCAL_PATH = os.environ.get('SECURE_LOCAL_PATH', '')

if not exists(join(dirname(__file__), '../{}.env'.format(SECURE_LOCAL_PATH))):
    print("[ERROR] Couldn't open .env file expected at {}!".format(
        join(dirname(__file__), '../{}.env'.format(SECURE_LOCAL_PATH)))
    )
    print("[ERROR] Exiting settings.py load - check your Pycharm settings and secure_path.env file.")
    exit(1)

dotenv.read_dotenv(join(dirname(__file__), '../{}.env'.format(SECURE_LOCAL_PATH)))

APP_ENGINE_FLEX = 'aef-'
APP_ENGINE = 'Google App Engine/'

BASE_DIR                = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)) + os.sep

SHARED_SOURCE_DIRECTORIES = [
    'IDC-Common'
]

# Add the shared Django application subdirectory to the Python module search path
for directory_name in SHARED_SOURCE_DIRECTORIES:
    sys.path.append(os.path.join(BASE_DIR, directory_name))

DEBUG                   = (os.environ.get('DEBUG', 'False') == 'True')
CONNECTION_IS_LOCAL     = (os.environ.get('DATABASE_HOST', '127.0.0.1') == 'localhost')
IS_CIRCLE               = (os.environ.get('CI', None) is not None)
DEBUG_TOOLBAR           = ((os.environ.get('DEBUG_TOOLBAR', 'False') == 'True') and CONNECTION_IS_LOCAL)
LOCAL_RESPONSE_PAGES    = (os.environ.get('LOCAL_RESPONSE_PAGES', 'False') == 'True')

IMG_QUOTA = os.environ.get('IMG_QUOTA', '137')

print("[STATUS] DEBUG mode is {}".format(str(DEBUG)), file=sys.stdout)

RESTRICT_ACCESS          = (os.environ.get('RESTRICT_ACCESS', 'True') == 'True')
RESTRICTED_ACCESS_GROUPS = os.environ.get('RESTRICTED_ACCESS_GROUPS', '').split(',')

if RESTRICT_ACCESS:
    print("[STATUS] Access to the site is restricted to members of the {} group(s).".format(", ".join(RESTRICTED_ACCESS_GROUPS)), file=sys.stdout)
else:
    print("[STATUS] Access to the site is NOT restricted!", file=sys.stdout)

# Theoretically Nginx allows us to use '*' for ALLOWED_HOSTS but...
ALLOWED_HOSTS = list(set(os.environ.get('ALLOWED_HOST', 'localhost').split(',') + ['localhost', '127.0.0.1', '[::1]', gethostname(), gethostbyname(gethostname()),]))
print("Allowed hosts are: {}".format(ALLOWED_HOSTS))

SSL_DIR = os.path.abspath(os.path.dirname(__file__))+os.sep

ADMINS                  = ()
MANAGERS                = ADMINS

# For Django 3.2, we need to specify our default auto-increment type for PKs
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

GCLOUD_PROJECT_ID              = os.environ.get('GCLOUD_PROJECT_ID', '')
GCLOUD_PROJECT_NUMBER          = os.environ.get('GCLOUD_PROJECT_NUMBER', '')
BIGQUERY_PROJECT_ID            = os.environ.get('BIGQUERY_PROJECT_ID', GCLOUD_PROJECT_ID)
BIGQUERY_DATA_PROJECT_ID       = os.environ.get('BIGQUERY_DATA_PROJECT_ID', GCLOUD_PROJECT_ID)
BIGQUERY_USER_DATA_PROJECT_ID  = os.environ.get('BIGQUERY_USER_DATA_PROJECT_ID', GCLOUD_PROJECT_ID)
BIGQUERY_USER_MANIFEST_DATASET = os.environ.get('BIGQUERY_USER_MANIFEST_DATASET', 'dev_user_dataset')
BIGQUERY_USER_MANIFEST_TIMEOUT = int(os.environ.get('BIGQUERY_USER_MANIFEST_TIMEOUT', '7'))
PUBSUB_USER_MANIFEST_TOPIC     = "projects/{}/topics/{}".format(GCLOUD_PROJECT_ID, os.environ.get('PUBSUB_USER_MANIFEST_TOPIC', 'user-manifest'))
USER_MANIFESTS_FOLDER          = os.environ.get('USER_MANIFESTS_FOLDER', 'user-manifests')
RESULT_BUCKET                  = os.environ.get('RESULT_BUCKET', 'idc-dev-files')

# Deployment module
CRON_MODULE             = os.environ.get('CRON_MODULE')

# Log Names
WEBAPP_LOGIN_LOG_NAME         = os.environ.get('WEBAPP_LOGIN_LOG_NAME', 'local_dev_logging')
COHORT_CREATION_LOG_NAME      = os.environ.get('COHORT_CREATION_LOG_NAME', 'local_dev_logging')

BASE_URL                = os.environ.get('BASE_URL', 'https://idc-dev.appspot.com')
BASE_API_URL            = os.environ.get('BASE_API_URL', 'https://api-dot-idc-dev.appspot.com')
API_HOST                = os.environ.get('API_HOST', 'api-dot-idc-dev.appspot.com')

# Compute services - Should not be necessary in webapp
PAIRWISE_SERVICE_URL    = os.environ.get('PAIRWISE_SERVICE_URL', None)

# Data Buckets
# GCLOUD_BUCKET           = os.environ.get('GOOGLE_STORAGE_BUCKET', 'FAKE_BUCKET')
# AWS_BUCKET              = os.environ.get('AWS_BUCKET', 'FAKE_BUCKET')

DCF_GUID_SUFFIX           = os.environ.get('DCF_GUID_SUFFIX', '')

# BigQuery cohort storage settings
BIGQUERY_COHORT_DATASET_ID           = os.environ.get('BIGQUERY_COHORT_DATASET_ID', 'cohort_dataset')
BIGQUERY_COHORT_TABLE_ID             = os.environ.get('BIGQUERY_COHORT_TABLE_ID', 'developer_cohorts')
BIGQUERY_IDC_TABLE_ID                = os.environ.get('BIGQUERY_IDC_TABLE_ID', '')
MAX_BQ_INSERT                        = int(os.environ.get('MAX_BQ_INSERT', '500'))
USER_DATA_ON                         = bool(os.environ.get('USER_DATA_ON', 'False') == 'True')

database_config = {
    'default': {
        'ENGINE': os.environ.get('DATABASE_ENGINE', 'django.db.backends.mysql'),
        'HOST': os.environ.get('DATABASE_HOST', '127.0.0.1'),
        'NAME': os.environ.get('DATABASE_NAME', 'dev'),
        'USER': os.environ.get('DATABASE_USER', 'django-user'),
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
# AppEngine var is set in the app.yaml so this should be false for CI and local dev apps
IS_APP_ENGINE = bool(os.getenv('IS_APP_ENGINE', 'False') == 'True')
# $CI is set only on CircleCI run VMs so this should not have a value outside of a deployment build
IS_CI = bool(os.getenv('CI', None) is not None)

VERSION = "{}.{}".format("local-dev", datetime.datetime.now().strftime('%Y%m%d%H%M'))

if exists(join(dirname(__file__), '../version.env')):
    dotenv.read_dotenv(join(dirname(__file__), '../version.env'))
else:
    if IS_DEV:
        import git
        try:
            repo = git.Repo(path="/home/vagrant/www/", search_parent_directories=True)
            VERSION = "{}.{}.{}".format("local-dev", datetime.datetime.now().strftime('%Y%m%d%H%M'),
                                        str(repo.head.object.hexsha)[-6:])
        except Exception as e:
            print("[ERROR] While trying to set local/developer git version: ")
            print(e)
            VERSION = "{}.{}.{}".format("local-dev", datetime.datetime.now().strftime('%Y%m%d%H%M'), "unavailable")

APP_VERSION = os.environ.get("APP_VERSION", VERSION)

DEV_TIER = bool(DEBUG or re.search(r'^local-dev\.', APP_VERSION))

print("[STATUS] DEV_TIER setting is {}".format(DEV_TIER))

# If this is a GAE-Flex deployment, we don't need to specify SSL; the proxy will take
# care of that for us
if 'DB_SSL_CERT' in os.environ and not IS_APP_ENGINE:
    DATABASES['default']['OPTIONS'] = {
        'ssl': {
            'ca': os.environ.get('DB_SSL_CA'),
            'cert': os.environ.get('DB_SSL_CERT'),
            'key': os.environ.get('DB_SSL_KEY')
        }
    }

# Default to localhost for the site ID
SITE_ID = 2

if IS_APP_ENGINE:
    print("[STATUS] AppEngine Flex detected.", file=sys.stdout)
    SITE_ID = int(os.environ.get('SITE_ID', '3'))

def get_project_identifier():
    return BIGQUERY_PROJECT_ID

# Set cohort table here
if BIGQUERY_COHORT_TABLE_ID is None:
    raise Exception("Developer-specific cohort table ID is not set.")

BQ_MAX_ATTEMPTS             = int(os.environ.get('BQ_MAX_ATTEMPTS', '10'))

API_USER = os.environ.get('API_USER', 'api_user')
API_AUTH_KEY = os.environ.get('API_AUTH_KEY', 'Token')
API_AUTH_HEADER = os.environ.get('API_AUTH_HEADER', 'HTTP_AUTHORIZATION')

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

USE_CLOUD_STORAGE              = bool(os.environ.get('USE_CLOUD_STORAGE', 'False') == 'True')

SECURE_PROXY_SSL_HEADER        = ('HTTP_X_FORWARDED_PROTO', 'https')

CSRF_COOKIE_SECURE             = bool(os.environ.get('CSRF_COOKIE_SECURE', 'True') == 'True')
SESSION_COOKIE_SECURE          = bool(os.environ.get('SESSION_COOKIE_SECURE', 'True') == 'True')
SECURE_SSL_REDIRECT            = bool(os.environ.get('SECURE_SSL_REDIRECT', 'True') == 'True')

# Exempt the health check so it can go through
SECURE_REDIRECT_EXEMPT = [r'^_ah/(vm_)?health$', ] if SECURE_SSL_REDIRECT else []

DOMAIN_REDIRECT_TO = os.environ.get('DOMAIN_REDIRECT_TO', None)
DOMAIN_REDIRECT_FROM = os.environ.get('DOMAIN_REDIRECT_FROM', None)

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
STATIC_ROOT = 'static_collex'

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
    'django.contrib.staticfiles.finders.AppDirectoriesFinder'

)


# Make this unique, and don't share it with anybody.
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', '')

SECURE_HSTS_INCLUDE_SUBDOMAINS = (os.environ.get('SECURE_HSTS_INCLUDE_SUBDOMAINS','True') == 'True')
SECURE_HSTS_PRELOAD            = (os.environ.get('SECURE_HSTS_PRELOAD','True') == 'True')
SECURE_HSTS_SECONDS            = int(os.environ.get('SECURE_HSTS_SECONDS','3600'))

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'idc.domain_redirect_middleware.DomainRedirectMiddleware',
    'django.middleware.gzip.GZipMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'idc.checkreqsize_middleware.CheckReqSize',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'adminrestrict.middleware.AdminPagesRestrictMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'idc.team_only_middleware.TeamOnly',
    # Uncomment the next line for simple clickjacking protection:
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'request_logging.middleware.LoggingMiddleware',
    'offline.middleware.OfflineMiddleware'
]

ROOT_URLCONF = 'idc.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'idc.wsgi.application'

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'django.contrib.humanize',
    'anymail',
    'idc',
    'data_upload',
    'sharing',
    'cohorts',
    'idc_collections',
    'offline',
    'adminrestrict',
    'axes'
)

#############################
#  django-session-security  #
#############################
INSTALLED_APPS += ('session_security',)
SESSION_SECURITY_WARN_AFTER        = int(os.environ.get('SESSION_SECURITY_WARN_AFTER','540'))
SESSION_SECURITY_EXPIRE_AFTER      = int(os.environ.get('SESSION_SECURITY_EXPIRE_AFTER','600'))
SESSION_EXPIRE_AT_BROWSER_CLOSE    = True
MIDDLEWARE.append(
    # for django-session-security -- must go *after* AuthenticationMiddleware
    'session_security.middleware.SessionSecurityMiddleware',
)
###############################
# End django-session-security #
###############################

TEST_RUNNER = 'django.tesbut.runner.DiscoverRunner'

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
            'handlers': ['console_dev', 'console_prod'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'main_logger': {
            'handlers': ['console_dev', 'console_prod'],
            'level': 'DEBUG',
            'propagate': True,
        },
        'axes': {
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
    },
}

# Force allauth to only use https
ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'https'
# ...but not if this is a local dev build
if IS_DEV:
    ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'http'

##########################
#  Start django-allauth  #
##########################

LOGIN_REDIRECT_URL = '/extended_login/'

INSTALLED_APPS += (
    'accounts',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'rest_framework.authtoken'
)

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
                'idc.context_processor.additional_context',
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
    # Prevent login hammering
    "axes.backends.AxesBackend",
    # Local account logins
    "django.contrib.auth.backends.ModelBackend",
    # `allauth` specific authentication methods (Google)
    "allauth.account.auth_backends.AuthenticationBackend",
)

SOCIALACCOUNT_PROVIDERS = \
    { 'google':
        { 'SCOPE': ['profile', 'email'],
          'AUTH_PARAMS': { 'access_type': 'online' }
        }
    }

ACCOUNT_AUTHENTICATION_METHOD = "email"
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = bool(os.environ.get('ACCOUNT_USERNAME_REQUIRED', 'False') == 'True')
ACCOUNT_EMAIL_VERIFICATION = os.environ.get('ACCOUNT_EMAIL_VERIFICATION', 'mandatory').lower()

ACCOUNT_EMAIL_SUBJECT_PREFIX = "[Imaging Data Commons] "
ACCOUNTS_PASSWORD_EXPIRATION = os.environ.get('ACCOUNTS_PASSWORD_EXPIRATION',120) # Max password age in days
ACCOUNTS_PASSWORD_HISTORY = os.environ.get('ACCOUNTS_PASSWORD_HISTORY', 5) # Max password history kept
ACCOUNTS_ALLOWANCES = list(set(os.environ.get('ACCOUNTS_ALLOWANCES','').split(',')))

##########################
#   End django-allauth   #
##########################

##########################
# Django local auth      #
##########################
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 16,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'idc.validators.PasswordComplexityValidator',
        'OPTIONS': {
            'min_length': 16,
            'special_char_list': '!@#$%^&*+:;?'
        }
    },
    {
        'NAME': 'idc.validators.PasswordReuseValidator'
    }
]

#########################################
# Cache Setting                         #
#########################################

if not IS_DEV:
    CACHE_IP = os.environ.get("CACHE_IP","127.0.0.1")
    CACHE_PORT = os.environ.get("CACHE_PORT","6379")
    REDIS_AUTH = os.environ.get("REDIS_AUTH","")
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": "redis://{REDIS_IP}:{REDIS_PORT}/0".format(
                REDIS_IP=CACHE_IP,
                REDIS_PORT=CACHE_PORT
            ),
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
            }
        }
    }
else:
    CACHES = {
        "default": {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache'
        }
    }


#########################################
# Axes Settings
#########################################
AXES_HANDLER = 'axes.handlers.cache.AxesCacheHandler' if not IS_DEV else 'axes.handlers.dummy.AxesDummyHandler'
AXES_META_PRECEDENCE_ORDER = [
    'HTTP_X_FORWARDED_FOR',
    'REMOTE_ADDR',
]
AXES_PROXY_COUNT = 1
AXES_COOLOFF_TIME = int(os.environ.get('AXES_COOLOFF_TIME', '5'))
AXES_USERNAME_FORM_FIELD = "email"
AXES_LOCKOUT_TEMPLATE = os.environ.get('AXES_LOCKOUT_TEMPLATE', 'accounts/account/login_lockout.html')

#########################################
# Request Logging
#########################################
REQUEST_LOGGING_MAX_BODY_LENGTH = int(os.environ.get('REQUEST_LOGGING_MAX_BODY_LENGTH', '1000'))
REQUEST_LOGGING_ENABLE_COLORIZE = bool(os.environ.get('REQUEST_LOGGING_ENABLE_COLORIZE', 'False') == 'True')


#########################################
#   MailGun Email Settings for requests #
#########################################
#
# These settings allow use of MailGun as a simple API call
EMAIL_SERVICE_API_URL = os.environ.get('EMAIL_SERVICE_API_URL', '')
EMAIL_SERVICE_API_KEY = os.environ.get('EMAIL_SERVICE_API_KEY', '')
NOTIFICATION_EMAIL_FROM_ADDRESS = os.environ.get('NOTIFICATOON_EMAIL_FROM_ADDRESS', 'info@canceridc.dev')

#########################
# django-anymail        #
#########################
#
# Anymail lets us use the Django mail system with mailgun (eg. in local account email verification)
ANYMAIL = {
    "MAILGUN_API_KEY": EMAIL_SERVICE_API_KEY,
    "MAILGUN_SENDER_DOMAIN": 'mg.canceridc.dev',  # your Mailgun domain, if needed
}
EMAIL_BACKEND = "anymail.backends.mailgun.EmailBackend"
DEFAULT_FROM_EMAIL = NOTIFICATION_EMAIL_FROM_ADDRESS
SERVER_EMAIL = "info@canceridc.dev"

GOOGLE_APPLICATION_CREDENTIALS  = join(dirname(__file__), '../{}{}'.format(SECURE_LOCAL_PATH,os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '')))
OAUTH2_CLIENT_ID                = os.environ.get('OAUTH2_CLIENT_ID', '')
OAUTH2_CLIENT_SECRET            = os.environ.get('OAUTH2_CLIENT_SECRET', '')

if not exists(GOOGLE_APPLICATION_CREDENTIALS):
    print("[ERROR] Google application credentials file wasn't found! Provided path: {}".format(GOOGLE_APPLICATION_CREDENTIALS))
    exit(1)

#################################
#   For NIH/eRA Commons login   #
#################################
GOOGLE_GROUP_ADMIN                      = os.environ.get('GOOGLE_GROUP_ADMIN', '')
SUPERADMIN_FOR_REPORTS                  = os.environ.get('SUPERADMIN_FOR_REPORTS', '')


##############################
#   Start django-finalware   #
##############################
#
# This should only be done on a local system which is running against its own VM, or during CircleCI testing.
# Deployed systems will already have a site superuser so this would simply overwrite that user.
# NEVER ENABLE this in production!
#
if (IS_DEV and CONNECTION_IS_LOCAL) or IS_CIRCLE:
    INSTALLED_APPS += (
        'finalware',)

    SITE_SUPERUSER_USERNAME = os.environ.get('SUPERUSER_USERNAME', '')
    SITE_SUPERUSER_EMAIL = ''
    SITE_SUPERUSER_PASSWORD = os.environ.get('SUPERUSER_PASSWORD')
#
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
SITE_GOOGLE_ANALYTICS             = bool(os.environ.get('SITE_GOOGLE_ANALYTICS_TRACKING_ID', None) is not None)
SITE_GOOGLE_ANALYTICS_TRACKING_ID = os.environ.get('SITE_GOOGLE_ANALYTICS_TRACKING_ID', '')
RESEARCH_STUDY                    = bool(os.environ.get('RESEARCH_STUDY', 'False') == 'True')

##############################################################
#   MAXes to prevent size-limited events from causing errors
##############################################################

# Google App Engine has a response size limit of 32M. ~65k entries from the cohort_filelist view will
# equal just under the 32M limit. If each individual listing is ever lengthened or shortened this
# number should be adjusted
MAX_FILE_LIST_REQUEST = int(os.environ.get('MAX_FILE_LIST_REQUEST', '65000'))
MAX_BQ_RECORD_RESULT = int(os.environ.get('MAX_BQ_RECORD_RESULT', '5000'))
MAX_SOLR_RECORD_REQUEST = int(os.environ.get('MAX_SOLR_RECORD_REQUEST', '2000'))

# Rough max file size to allow for eg. barcode list upload, to prevent triggering RequestDataTooBig
FILE_SIZE_UPLOAD_MAX = 1950000

#################################
# DICOM Viewer settings
#################################
DICOM_VIEWER = os.environ.get('DICOM_VIEWER', None)

#################################
# SOLR settings
#################################
SOLR_URI            = os.environ.get('SOLR_URI', '')
SOLR_LOGIN          = os.environ.get('SOLR_LOGIN', '')
SOLR_PASSWORD       = os.environ.get('SOLR_PASSWORD', '')
SOLR_CERT           = join(dirname(dirname(__file__)), "{}{}".format(SECURE_LOCAL_PATH, os.environ.get('SOLR_CERT', '')))
DEFAULT_FETCH_COUNT = os.environ.get('DEFAULT_FETCH_COUNT', 10)


# Explicitly check for known problems in descrpitions and names provided by users
DENYLIST_RE = r'((?i)<script>|(?i)</script>|!\[\]|!!\[\]|\[\]\[\".*\"\]|(?i)<iframe>|(?i)</iframe>)'
ATTRIBUTE_DISALLOW_RE = r'([^a-zA-Z0-9_])'

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

# AxesMiddleware should be the last middleware in the MIDDLEWARE list.
# It only formats user lockout messages and renders Axes lockout responses
# on failed user authentication attempts from login views.
# If you do not want Axes to override the authentication response
# you can skip installing the middleware and use your own views.
MIDDLEWARE.append('axes.middleware.AxesMiddleware',)

OHIF_V2_PATH=os.environ.get('OHIF_V2_PATH','')
OHIF_V3_PATH=os.environ.get('OHIF_V3_PATH','')
VOLVIEW_PATH=os.environ.get('VOLVIEW_PATH','')

SLIM_VIEWER_PATH=os.environ.get('SLIM_VIEWER_PATH','')

SUPPORT_EMAIL=os.environ.get('SUPPORT_EMAIL','')

# Log the version of our app
print("[STATUS] Application Version is {}".format(APP_VERSION))
