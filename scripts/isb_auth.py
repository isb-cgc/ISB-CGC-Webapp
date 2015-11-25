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

from argparse import ArgumentParser
import os

from oauth2client.client import OAuth2WebServerFlow
from oauth2client import tools
from oauth2client.file import Storage

VERBOSE = False
# for native application - same as settings.INSTALLED_APP_CLIENT_ID
CLIENT_ID = '907668440978-0ol0griu70qkeb6k3gnn2vipfa5mgl60.apps.googleusercontent.com'
# NOTE: this is NOT actually a 'secret' -- we're using the 'installed
# application' OAuth pattern here
CLIENT_SECRET = 'To_WJH7-1V-TofhNGcEqmEYi'

EMAIL_SCOPE = 'https://www.googleapis.com/auth/userinfo.email'
DEFAULT_STORAGE_FILE = os.path.join(os.path.expanduser("~"), '.isb_credentials')


def maybe_print(msg):
    if VERBOSE:
        print msg


def get_credentials(storage, oauth_flow_args=[]):
    credentials = storage.get()
    if not credentials or credentials.invalid:
        maybe_print('credentials missing/invalid, kicking off OAuth flow')
        flow = OAuth2WebServerFlow(CLIENT_ID, CLIENT_SECRET, EMAIL_SCOPE)
        flow.auth_uri = flow.auth_uri.rstrip('/') + '?approval_prompt=force'
        credentials = tools.run_flow(flow, storage, tools.argparser.parse_args(oauth_flow_args))
    return credentials


def main():
    global VERBOSE
    args = parse_args()
    oauth_flow_args = [args.noauth_local_webserver] if args.noauth_local_webserver else []
    VERBOSE = args.verbose
    maybe_print('--verbose: printing extra information')
    storage = Storage(args.storage_file)
    credentials = get_credentials(storage, oauth_flow_args=oauth_flow_args)
    maybe_print('credentials stored in ' + args.storage_file)
    maybe_print('access_token: ' + credentials.access_token)
    maybe_print('refresh_token: ' + credentials.refresh_token)


def parse_args():
    parser = ArgumentParser()
    parser.add_argument('--storage_file', '-s', default=DEFAULT_STORAGE_FILE, help='storage file to use for the credentials (default is {})'.format(DEFAULT_STORAGE_FILE))
    parser.add_argument('--verbose', '-v', dest='verbose', action='store_true', help='display credentials storage location, access token, and refresh token')
    parser.set_defaults(verbose=False)
    parser.add_argument('--noauth_local_webserver', action='store_const', const='--noauth_local_webserver')

    return parser.parse_args()


if __name__ == '__main__':
  main()
