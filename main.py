#
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
#

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