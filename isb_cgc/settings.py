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
    'ISB-CGC-Common'
]

# Add the shared Django application subdirectory to the Python module search path
for directory_name in SHARED_SOURCE_DIRECTORIES:
    sys.path.append(os.path.join(BASE_DIR, directory_name))

DEBUG                   = (os.environ.get('DEBUG', 'False') == 'True')
CONNECTION_IS_LOCAL     = (os.environ.get('DATABASE_HOST', '127.0.0.1') == 'localhost')
IS_CIRCLE               = (os.environ.get('CI', None) is not None)
DEBUG_TOOLBAR           = ((os.environ.get('DEBUG_TOOLBAR', 'False') == 'True') and CONNECTION_IS_LOCAL)

print("[STATUS] DEBUG mode is "+str(DEBUG), file=sys.stdout)

# Theoretically Nginx allows us to use '*' for ALLOWED_HOSTS but...
ALLOWED_HOSTS = list(set(os.environ.get('ALLOWED_HOST', 'localhost').split(',') + ['localhost', '127.0.0.1', '[::1]', gethostname(), gethostbyname(gethostname()),]))
print("ALLOWED_HOSTS: {}".format(ALLOWED_HOSTS))
#ALLOWED_HOSTS = ['*']

SSL_DIR = os.path.abspath(os.path.dirname(__file__))+os.sep

ADMINS                  = ()
MANAGERS                = ADMINS

# For Django 3.2, we need to specify our default auto-increment type for PKs
DEFAULT_AUTO_FIELD = 'django.db.models.AutoField'

GCLOUD_PROJECT_ID              = os.environ.get('GCLOUD_PROJECT_ID', '')
GCLOUD_PROJECT_NUMBER          = os.environ.get('GCLOUD_PROJECT_NUMBER', '')
BIGQUERY_PROJECT_ID            = os.environ.get('BIGQUERY_PROJECT_ID', GCLOUD_PROJECT_ID)
BIGQUERY_DATASET_V1            = os.environ.get('BIGQUERY_DATASET_V1', '')
BIGQUERY_DATA_PROJECT_ID       = os.environ.get('BIGQUERY_DATA_PROJECT_ID', GCLOUD_PROJECT_ID)
BIGQUERY_FEEDBACK_DATASET      = os.environ.get('BIGQUERY_FEEDBACK_DATASET', '')
BIGQUERY_FEEDBACK_TABLE        = os.environ.get('BIGQUERY_FEEDBACK_TABLE', '')

# Deployment module
CRON_MODULE             = os.environ.get('CRON_MODULE')

# Log Names
WEBAPP_LOGIN_LOG_NAME = os.environ.get('WEBAPP_LOGIN_LOG_NAME', 'local_dev_logging')
DCF_REFRESH_LOG_NAME = os.environ.get('DCF_REFRESH_LOG_NAME', 'local_dev_logging')
DCF_SA_REG_LOG_NAME = os.environ.get('DCF_SA_REG_LOG_NAME', 'local_dev_logging')

BASE_URL                = os.environ.get('BASE_URL', 'https://dev.isb-cgc.org')
BASE_API_URL            = os.environ.get('BASE_API_URL', 'https://api-dot-dev.isb-cgc.org/v4')

# Data Buckets
OPEN_DATA_BUCKET        = os.environ.get('OPEN_DATA_BUCKET', '')
GCLOUD_BUCKET           = os.environ.get('GOOGLE_STORAGE_BUCKET')

# BigQuery cohort storage settings
BIGQUERY_CGC_TABLE_ID    = os.environ.get('BIGQUERY_CGC_TABLE_ID', '')
BQ_FILE_MANIFEST_TABLE_ID_HG19 = os.environ.get('BQ_FILE_MANIFEST_TABLE_ID_HG19', '')
BQ_FILE_MANIFEST_TABLE_ID_HG38 = os.environ.get('BQ_FILE_MANIFEST_TABLE_ID_HG38', '')

BQ_TCGA_BIOCLIN_TABLE_ID = os.environ.get('BQ_TCGA_BIOCLIN_TABLE_ID', '')
BQ_TARGET_BIOCLIN_TABLE_ID = os.environ.get('BQ_TARGET_BIOCLIN_TABLE_ID', '')
BQ_CCLE_BIOCLIN_TABLE_ID = os.environ.get('BQ_CCLE_BIOCLIN_TABLE_ID', '')
BQ_BEATAML_BIOCLIN_TABLE_ID = os.environ.get('BQ_BEATAML_BIOCLIN_TABLE_ID', '')
BQ_FM_BIOCLIN_TABLE_ID = os.environ.get('BQ_FM_BIOCLIN_TABLE_ID', '')
BQ_OHSU_BIOCLIN_TABLE_ID = os.environ.get('BQ_OHSU_BIOCLIN_TABLE_ID', '')
BQ_MMRF_BIOCLIN_TABLE_ID = os.environ.get('BQ_MMRF_BIOCLIN_TABLE_ID', '')
BQ_GPRP_BIOCLIN_TABLE_ID = os.environ.get('BQ_GPRP_BIOCLIN_TABLE_ID', '')

MAX_BQ_INSERT               = int(os.environ.get('MAX_BQ_INSERT', '500'))

BQ_FILE_MANIFEST_TABLE_ID = {
    'HG19': BQ_FILE_MANIFEST_TABLE_ID_HG19,
    'HG38': BQ_FILE_MANIFEST_TABLE_ID_HG38
}

BQ_PROG_BIOCLIN_TABLE_ID = {
    'TCGA': BQ_TCGA_BIOCLIN_TABLE_ID,
    'TARGET': BQ_TARGET_BIOCLIN_TABLE_ID,
    'CCLE': BQ_CCLE_BIOCLIN_TABLE_ID,
    'BEATAML1.0': BQ_BEATAML_BIOCLIN_TABLE_ID,
    'FM': BQ_FM_BIOCLIN_TABLE_ID,
    'OHSU': BQ_OHSU_BIOCLIN_TABLE_ID,
    'MMRF': BQ_MMRF_BIOCLIN_TABLE_ID,
    'GPRP': BQ_GPRP_BIOCLIN_TABLE_ID
}

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
IS_UAT = (os.environ.get('IS_UAT', 'False') == 'True')
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


BQ_MAX_ATTEMPTS             = int(os.environ.get('BQ_MAX_ATTEMPTS', '10'))
USE_CLOUD_STORAGE           = os.environ.get('USE_CLOUD_STORAGE', False)

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

BQ_ECOSYS_STATIC_URL = os.environ.get('BQ_ECOSYS_STATIC_URL', 'https://storage.googleapis.com/webapp-static-files-isb-cgc-dev/bq_ecosys/')

CITATIONS_STATIC_URL = os.environ.get('CITATIONS_STATIC_URL', 'https://storage.googleapis.com/webapp-static-files-isb-cgc-dev/static/citations/')

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
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'isb_cgc.checkreqsize_middleware.CheckReqSize',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'adminrestrict.middleware.AdminPagesRestrictMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # Uncomment the next line for simple clickjacking protection:
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'offline.middleware.OfflineMiddleware',
]

ROOT_URLCONF = 'isb_cgc.urls'

# Python dotted path to the WSGI application used by Django's runserver.
WSGI_APPLICATION = 'isb_cgc.wsgi.application'

INSTALLED_APPS = (
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.sites',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'django.contrib.admindocs',
    'anymail',
    'isb_cgc',
    'sharing',
    'cohorts',
    'projects',
    'genes',
    'offline',
    'adminrestrict',
)

#############################
#  django-session-security  #
#############################

INSTALLED_APPS += ('session_security',)
SESSION_SECURITY_WARN_AFTER = int(os.environ.get('SESSION_SECURITY_WARN_AFTER','540'))
SESSION_SECURITY_EXPIRE_AFTER = int(os.environ.get('SESSION_SECURITY_EXPIRE_AFTER','600'))
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
    'allauth.socialaccount.providers.google',
    'rest_framework.authtoken')

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
                'isb_cgc.context_processor.additional_context',
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
# ...but not if this is a local dev build.
if IS_DEV:
    ACCOUNT_DEFAULT_HTTP_PROTOCOL = 'http'


##########################
#   End django-allauth   #
##########################

# Deployed systems have app credentials on the VM, but a local system will need a JSON key present to
# download anything necessary, like the SQL table file.
GOOGLE_APPLICATION_CREDENTIALS = None
if IS_DEV and CONNECTION_IS_LOCAL:
    GOOGLE_APPLICATION_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', '')

    if not exists(GOOGLE_APPLICATION_CREDENTIALS):
        print("[ERROR] Google application credentials file wasn't found! Provided path: {}".format(GOOGLE_APPLICATION_CREDENTIALS))
        exit(1)

# Client ID used for OAuth2 - this is for IGV and the test database
OAUTH2_CLIENT_ID = os.environ.get('OAUTH2_CLIENT_ID', '')

# Client ID used for OAuth2 - this is for the test database
OAUTH2_CLIENT_SECRET = os.environ.get('OAUTH2_CLIENT_SECRET', '')

#################################
#   For NIH/eRA Commons login   #
#################################

OPEN_ACL_GOOGLE_GROUP                   = os.environ.get('OPEN_ACL_GOOGLE_GROUP', '')
GOOGLE_GROUP_ADMIN                      = os.environ.get('GOOGLE_GROUP_ADMIN', '')
SUPERADMIN_FOR_REPORTS                  = os.environ.get('SUPERADMIN_FOR_REPORTS', '')

# Log name for ERA login views
LOG_NAME_ERA_LOGIN_VIEW                  = os.environ.get('LOG_NAME_ERA_LOGIN_VIEW', '')

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
#
# This should only be done on a local system which is running against its own VM. Deployed systems will already have
# a site superuser so this would simply overwrite that user. Don't enable this in production!
if (IS_DEV and CONNECTION_IS_LOCAL) or IS_CIRCLE:
    INSTALLED_APPS += (
        'finalware',)

    SITE_SUPERUSER_USERNAME = os.environ.get('SUPERUSER_USERNAME', 'isb')
    SITE_SUPERUSER_EMAIL = ''
    SITE_SUPERUSER_PASSWORD = os.environ.get('SUPERUSER_PASSWORD')

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
# Viewer settings
#################################
DICOM_VIEWER = os.environ.get('DICOM_VIEWER', None)
SLIM_VIEWER = os.environ.get('SLIM_VIEWER', None)

#################################
# SOLR settings
#################################
SOLR_URI = os.environ.get('SOLR_URI', '')
SOLR_LOGIN = os.environ.get('SOLR_LOGIN', '')
SOLR_PASSWORD = os.environ.get('SOLR_PASSWORD', '')
SOLR_CERT = join(dirname(dirname(__file__)), "{}{}".format(SECURE_LOCAL_PATH, os.environ.get('SOLR_CERT', '')))

##############################################################
#   MailGun Email Settings
##############################################################
EMAIL_SERVICE_API_URL = os.environ.get('EMAIL_SERVICE_API_URL', '')
EMAIL_SERVICE_API_KEY = os.environ.get('EMAIL_SERVICE_API_KEY', '')
NOTIFICATION_EMAIL_FROM_ADDRESS = os.environ.get('NOTIFICATOON_EMAIL_FROM_ADDRESS', '')
NOTIFICATION_EMAIL_TO_ADDRESS = os.environ.get('NOTIFICATION_EMAIL_TO_ADDRESS', '')

#########################
# django-anymail        #
#########################
#
# Anymail lets us use the Django mail system with mailgun (eg. in local account email verification)
ANYMAIL = {
    "MAILGUN_API_KEY": EMAIL_SERVICE_API_KEY,
    "MAILGUN_SENDER_DOMAIN": 'mg.isb-cgc.org',  # your Mailgun domain, if needed
}
EMAIL_BACKEND = "anymail.backends.mailgun.EmailBackend"
DEFAULT_FROM_EMAIL = NOTIFICATION_EMAIL_FROM_ADDRESS
SERVER_EMAIL = "info@isb-cgc.org"

# Cron user settings
CRON_USER = os.environ.get('CRON_USER', 'cron_user')
CRON_AUTH_KEY = os.environ.get('CRON_AUTH_KEY', 'Token')

# Explicitly check for known items
BLACKLIST_RE = r'((?i)<script>|(?i)</script>|!\[\]|!!\[\]|\[\]\[\".*\"\]|(?i)<iframe>|(?i)</iframe>)'

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

MITELMAN_URL = os.environ.get('MITELMAN_URL', 'https://mitelmandatabase.isb-cgc.org/')
TP53_URL = os.environ.get('TP53_URL', 'https://tp53.isb-cgc.org/')

##########################
# OAUTH PLATFORM         #
##########################
IDP        = os.environ.get('IDP', 'fence')
# RAS TOKEN MAX LIFE 25 DAYS
DCF_UPSTREAM_EXPIRES_IN_SEC = os.environ.get('DCF_UPSTREAM_EXPIRES_IN_SEC', '1296000')
DCF_REFRESH_TOKEN_EXPIRES_IN_SEC = os.environ.get('DCF_REFRESH_TOKEN_EXPIRES_IN_SEC', '2592000')
