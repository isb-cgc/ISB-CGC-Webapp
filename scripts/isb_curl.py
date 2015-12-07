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


Script to authenticate users accessing endpoint APIs from the command line.
Step 1: user runs $ ./isb_auth.py which saves the user's credentials to their root directory
Step 2: user runs $ ./isb_curl.py https://isb-cgc.appspot.com/_ah/api/{endpoint api name e.g. cohort_api}/{endpoint version e.g. v1}/{endpoint name e.g. cohorts_list}
Code from William Forson wdf@google.com
"""

#! /usr/bin/python2.7

import httplib2
import json
import os
import subprocess
import sys

from oauth2client.file import Storage

CREDENTIALS_LOC_ENV = 'ISB_CREDENTIALS'
DEFAULT_CREDENTIALS_LOC = os.path.join(os.path.expanduser("~"), '.isb_credentials')


def check(assertion, msg):
    if not assertion:
        error(msg)


def error(msg):
    sys.stderr.write(msg + '\n')
    sys.exit(1)


def get_credentials_location():
    credentials_location = os.environ.get(CREDENTIALS_LOC_ENV, DEFAULT_CREDENTIALS_LOC)
    check(credentials_location, "couldn't find ISB credentials...try running isb_auth.py")
    return credentials_location


def load_credentials(credentials_location=get_credentials_location()):
    storage = Storage(credentials_location)
    credentials = storage.get()
    check(credentials and not credentials.invalid, 'missing/invalid credentials...try running isb_auth.py')
    return credentials


def get_access_token():
    credentials = load_credentials()
    if credentials.access_token_expired:
        credentials.refresh(httplib2.Http())
    return credentials.access_token


def main():
    args = sys.argv[1:]
    check(args, 'usage: isb_curl.py <curl arguments>')
    access_token = get_access_token()
    curl_args = ['curl', '-H', 'Authorization: Bearer ' + access_token] + args
    os.execvp('curl', curl_args)


if __name__ == '__main__':
  main()
