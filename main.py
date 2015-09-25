# Standard Python imports.
import os
import sys
import logging

# AppEngine imports.
from google.appengine.ext.webapp import util

# Import various parts of Django.
from django.core.wsgi import get_wsgi_application


# Create a Django application for WSGI.
application = get_wsgi_application()


def real_main():
  """Main program."""
  # Run the WSGI CGI handler with that application.
  util.run_wsgi_app(application)



# Set this to profile_main to enable profiling.
main = real_main


if __name__ == '__main__':
  main()