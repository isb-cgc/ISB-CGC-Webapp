#! /usr/bin/python2.7
'''
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


isb_curl can be called by commandline or used as a library

Use the endpoint URL structure in the API Documentation
https://docs.google.com/document/d/1TJFtjfUJMaYjIckSi6W0eV4Qa5t6uYg14u-Z2nfXoHM/

URL = https://isb-cgc.appspot.com/_ah/api/{API-NAME}/{VERSION}/{ENDPOINT}
  e.g. for the "cohorts_list" endpoint:
  https://isb-cgc.appspot.com/_ah/api/cohort_api/v1/cohorts_list


A. Command Line:
   python ./isb_auth.py # saves the user's credentials to their root directory
   python ./isb_curl.py URL?key1val1&key2=val2... # see below for URL...


B. in code / ipython:
   import isb_curl
   URL = '...' # <-- see above
   pdict = {'key':val,'key2':val2,...} # <---- edit this!!!
   isb_curl.get( URL, pdict , method='GET')
      

C. Datalab:

We apologize, but isb_curl is not currently reliable in Google Cloud
Datalab.  Please use `isb_auth.py -v` to get your token on your local
machine, then use the requests library directly; e.g.:

datalab> import requests, json
datalab> token = u'ya29.IBTDVR9Wzyo1ew9TTy...' # <--- copy & paste from your machine!
datalab> url = 'https://mvm-dot-isb-cgc.appspot.com/_ah/api/cohort_api/v1/cohorts_list'
datalab> r = requests.get(url,data={'token':token})
datalab> output_dict = json.loads( r.json() )

'''

import httplib2, json, re, requests
import os, sys
from subprocess import PIPE, Popen
from oauth2client.file import Storage
import isb_auth

CREDENTIALS_LOC_ENV = 'ISB_CREDENTIALS'
DEFAULT_CREDENTIALS_LOC = os.path.join(os.path.expanduser("~"), '.isb_credentials')

def cmd(command):
    process = Popen(
        args=command,
        stdout=PIPE,
        shell=True
        )
    return process.communicate()[0]

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

def get(url,pdict={},method='GET'):
    if 'token' not in pdict.keys(): pdict['token'] = str(get_access_token())
    token = pdict['token']
    head = {'Authorization': 'Bearer '+token}
    if method=='GET':
        r = requests.get(url,headers=head,params=pdict)
    elif method=='POST':
        check(pdict,"Using method='POST' requires non-empty pdict!") 
        r = requests.post(url,headers=head,data=pdict)
    return r.json()

# this allows us to call this from command line
if __name__ == '__main__':
    if len(sys.argv)!=2: sys.exit("Wrong # of arguments -- URL only")
    print get(''.join(sys.argv[1]) , {})
