import os
from os.path import join, dirname
import dotenv
env_path = '../'
if os.environ.get('SECURE_LOCAL_PATH', None):
    env_path += os.environ.get('SECURE_LOCAL_PATH')

dotenv.read_dotenv(join(dirname(__file__), env_path+'.env'))


SETTINGS = {
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