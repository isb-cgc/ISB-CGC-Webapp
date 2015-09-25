import sys
import os

sys.path.append(os.path.join(os.getcwd(), "lib", "allauth.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "cloudstorage.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "django.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "ecdsa.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "googleapiclient.zip"))  # use v >=1.4.0
sys.path.append(os.path.join(os.getcwd(), "lib", "httplib2.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "oauth2client.zip"))  # use v >=1.4.7
sys.path.append(os.path.join(os.getcwd(), "lib", "openid.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "paramiko.zip"))  # for pysftp
sys.path.append(os.path.join(os.getcwd(), "lib", "pysftp.py.zip"))
# NOTE __init__ file in paramiko has one import statement commented out line 56 from paramiko.proxy import ProxyCommand
# this is to prevent subprocess from running in GAE
sys.path.append(os.path.join(os.getcwd(), "lib", "pyasn1.zip"))  # for GOOGLE_APPLICATION_CREDENTIALS
sys.path.append(os.path.join(os.getcwd(), "lib", "pyasn1_modules.zip"))  # for GOOGLE_APPLICATION_CREDENTIALS
sys.path.append(os.path.join(os.getcwd(), "lib", "pytz.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "requests.zip"))  # replaced v2.6 with v2.3 for django-allauth
sys.path.append(os.path.join(os.getcwd(), "lib", "requests_oauthlib.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "rsa.zip"))  # for GOOGLE_APPLICATION_CREDENTIALS
sys.path.append(os.path.join(os.getcwd(), "lib", "simplejson.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "six.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "uritemplate.zip"))
sys.path.append(os.path.join(os.getcwd(), "lib", "zoneinfo.zip"))
