from __future__ import print_function
import os
from os.path import join, dirname
import dotenv
env_path = '../'
if os.environ.get('SECURE_LOCAL_PATH', None):
    env_path += os.environ.get('SECURE_LOCAL_PATH')

dotenv.read_dotenv(join(dirname(__file__), env_path+'.env'))


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
            'USER': os.environ.get('DATABASE_USER_BUILD'),
            'PASSWORD': os.environ.get('MYSQL_ROOT_PASSWORD_BUILD')
        }
    }


SETTINGS = {
    'DATABASE': {
        database_config
    },
}

if 'DB_SSL_CERT' in os.environ:
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
        print(setting, ' is not a valid setting.')
        return None