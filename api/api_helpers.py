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

"""

import sys

import os
import MySQLdb
import httplib2
from oauth2client.client import GoogleCredentials, AccessTokenCredentials
from django.conf import settings
from googleapiclient.discovery import build


debug = settings.DEBUG

# Database connection
def sql_connection():
    env = os.getenv('SERVER_SOFTWARE')
    database = settings.DATABASES['default']
    if env.startswith('Google App Engine/'):
        # Connecting from App Engine
        try:
            db = MySQLdb.connect(
                host = database['HOST'],
                port = 3306,
                db = database['NAME'],
                user = database['USER'],
                passwd = database['PASSWORD'],
                ssl = database['OPTIONS']['ssl'])            
        except:
            print >> sys.stderr, "Unexpected ERROR in sql_connection(): ", sys.exc_info()[0]
            #return HttpResponse( traceback.format_exc() ) 
            raise # if you want to soldier bravely on despite the exception, but comment to stderr
    else:
        # Connecting to localhost
        try:
            db = MySQLdb.connect(
                host='127.0.0.1',
                db=database['NAME'],
                user=database['USER'],
                passwd=database['PASSWORD'])
        except:
            print >> sys.stderr, "Unexpected ERROR in sql_connection(): ", sys.exc_info()[0]
            #return HttpResponse( traceback.format_exc() )
            raise # if you want to soldier bravely on despite the exception, but comment to stderr

    return db


def sql_age_by_ranges(value):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    result = ''
    if not isinstance(value, basestring):
        #value is a list of ranges
        first = True
        if 'None' in value:
            result += 'age_at_initial_pathologic_diagnosis is null or '
            value.remove('None')
        for val in value:
            if first:
                result += ''
                first = False
            else:
                result += ' or'
            if str(val) == '10 to 39':
                result += ' (age_at_initial_pathologic_diagnosis >= 10 and age_at_initial_pathologic_diagnosis < 40)'
            elif str(val) == '40 to 49':
                result += ' (age_at_initial_pathologic_diagnosis >= 40 and age_at_initial_pathologic_diagnosis < 50)'
            elif str(val) == '50 to 59':
                result += ' (age_at_initial_pathologic_diagnosis >= 50 and age_at_initial_pathologic_diagnosis < 60)'
            elif str(val) == '60 to 69':
                result += ' (age_at_initial_pathologic_diagnosis >= 60 and age_at_initial_pathologic_diagnosis < 70)'
            elif str(val) == '70 to 79':
                result += ' (age_at_initial_pathologic_diagnosis >= 70 and age_at_initial_pathologic_diagnosis < 80)'
            elif str(val).lower() == 'over 80':
                result += ' (age_at_initial_pathologic_diagnosis >= 80)'

    else:
        #value is a single range
        if str(value) == '10 to 39':
            result += ' (age_at_initial_pathologic_diagnosis >= 10 and age_at_initial_pathologic_diagnosis < 40)'
        elif str(value) == '40 to 49':
            result += ' (age_at_initial_pathologic_diagnosis >= 40 and age_at_initial_pathologic_diagnosis < 50)'
        elif str(value) == '50 to 59':
            result += ' (age_at_initial_pathologic_diagnosis >= 50 and age_at_initial_pathologic_diagnosis < 60)'
        elif str(value) == '60 to 69':
            result += ' (age_at_initial_pathologic_diagnosis >= 60 and age_at_initial_pathologic_diagnosis < 70)'
        elif str(value) == '70 to 79':
            result += ' (age_at_initial_pathologic_diagnosis >= 70 and age_at_initial_pathologic_diagnosis < 80)'
        elif str(value).lower() == 'over 80':
            result += ' (age_at_initial_pathologic_diagnosis >= 80)'
        elif str(value) == 'None':
            result += ' age_at_initial_pathologic_diagnosis is null'

    # print '\n\nresult is ' + result
    return result

def gql_age_by_ranges(q, key, value):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    result = ''
    if not isinstance(value, basestring):
        # value is a list of ranges
        first = True
        for val in value:
            if first:
                first = False
            else:
                result += ' or'
            if str(val) == '10to39':
                result += ' (%s >= 10 and %s < 40)' % (key, key)
            elif str(val) == '40to49':
                result += ' (%s >= 40 and %s < 50)' % (key, key)
            elif str(val) == '50to59':
                result += ' (%s >= 50 and %s < 60)' % (key, key)
            elif str(val) == '60to69':
                result += ' (%s >= 60 and %s < 70)' % (key, key)
            elif str(val) == '70to79':
                result += ' (%s >= 70 and %s < 80)' % (key, key)
            elif str(val).lower() == 'over80':
                result += ' (%s >= 80)' % key
    else:
        # value is a single range
        if str(value) == '10to39':
            result += ' (%s >= 10 and %s < 40)' % (key, key)
        elif str(value) == '40to49':
            result += ' (%s >= 40 and %s < 50)' % (key, key)
        elif str(value) == '50to59':
            result += ' (%s >= 50 and %s < 60)' % (key, key)
        elif str(value) == '60to69':
            result += ' (%s >= 60 and %s < 70)' % (key, key)
        elif str(value) == '70to79':
            result += ' (%s >= 70 and %s < 80)' % (key, key)
        elif str(value).lower() == 'over80':
            result += ' (%s >= 80)' % key
    return result

def normalize_ages(ages):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    result = []
    new_age_list = {'10 to 39': 0, '40 to 49': 0, '50 to 59': 0, '60 to 69': 0, '70 to 79': 0, 'Over 80': 0, 'None': 0}
    for age in ages:
        # print 'type(age):'
        # print type(age)
        if type(age) != dict:

            if age.value != 'None':
                int_age = float(age.value)
                if int_age < 40:
                    new_age_list['10 to 39'] += int(age.count)
                elif int_age < 50:
                    new_age_list['40 to 49'] += int(age.count)
                elif int_age < 60:
                    new_age_list['50 to 59'] += int(age.count)
                elif int_age < 70:
                    new_age_list['60 to 69'] += int(age.count)
                elif int_age < 80:
                    new_age_list['70 to 79'] += int(age.count)
                else:
                    new_age_list['Over 80'] += int(age.count)
            else:
                new_age_list['None'] += int(age.count)
        else:
            print age

    for key, value in new_age_list.items():
        result.append({'count': value, 'value': key})
    return result

def applyFilter(field, dict):
# this one gets called a lot...
#    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    query_dict = dict.copy()
    if field in dict:
        query_dict.pop(field, None)
        if len(query_dict) > 0:
            where_clause = build_where_clause(query_dict)
        else:
            where_clause = None
    else:
        where_clause = build_where_clause(dict)

    return where_clause

def build_where_clause(dict, alt_key_map=False):
# this one gets called a lot
#    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    first = True
    query_str = ''
    big_query_str = ''  # todo: make this work for non-string values -- use {}.format
    value_tuple = ()
    key_order = []
    for key, value in dict.items():
        # Check if we need to map to a different column name for a given key
        if alt_key_map and key in alt_key_map:
            key = alt_key_map[key]
            if 'values' in value:
                value = value['values']
        # Multitable where's will come in with : in the name. Only grab the column piece for now
        elif ':' in key:
            key = key.split(':')[-1]
            if 'values' in value:
                value = value['values']
        # Multitable filter lists don't come in as string as they can contain arbitrary text in values
        elif isinstance(value, basestring):
            # If it's a list of values, split it into an array
            if ',' in value:
                value = value.split(',')

        key_order.append(key)

        # If it's first in the list, don't append an "and"
        if first:
            first = False
        else:
            query_str += ' and'
            big_query_str += ' and'

        # If it's age ranges, give it special treament due to normalizations
        if key == 'age_at_initial_pathologic_diagnosis':
            query_str += ' (' + sql_age_by_ranges(value) + ') '

        # If it's a list of items for this key, create an or subclause
        elif isinstance(value, list):
            has_null = False
            if 'None' in value:
                has_null = True
                query_str += ' (%s is null or' % key
                big_query_str += ' (%s is null or' % key
                value.remove('None')
            query_str += ' %s in (' % key
            big_query_str += ' %s in (' % key
            i = 0
            for val in value:
                value_tuple = value_tuple + (val.strip(),)
                if i == 0:
                    query_str += '%s'
                    big_query_str += '"' + str(val) + '"'
                    i += 1
                else:
                    query_str += ',%s'
                    big_query_str += ',' + '"' + str(val) + '"'
            query_str += ')'
            big_query_str += ')'
            if has_null:
                query_str += ')'
                big_query_str += ')'

        # If it's looking for None values
        elif value == 'None':
            query_str += ' %s is null' % key
            big_query_str += ' %s is null' % key

        # For the general case
        else:
            if key == 'fl_archive_name':
                big_query_str += ' %s like' % key
                big_query_str += ' "%' + value + '%"'
            elif key == 'fl_data_level':
                big_query_str += ' %s=%s' % (key, value)
            elif type(value) == bool:
                big_query_str += ' %s=%r' % (key, value)
            else:
                query_str += ' %s=' % key
                big_query_str += ' %s=' % key
                query_str += '%s'
                big_query_str += '"%s"' % value
                value_tuple = value_tuple + (value.strip(),)
    return {'query_str': query_str, 'value_tuple': value_tuple, 'key_order': key_order, 'big_query_str': big_query_str}


def possible_future_authorization_function():
    # will put a decorator on this to ensure user has correct authorization before running
    # such as if they are dbgap authorized
    from oauth2client.client import flow_from_clientsecrets
    from oauth2client.file import Storage
    from oauth2client import tools
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    flow = flow_from_clientsecrets(settings.CLIENT_SECRETS, scope='https://www.googleapis.com/auth/bigquery')
    ## in future, make storage file temporary somehow?
    storage = Storage('bigquery_credentials.dat')
    credentials = storage.get()

    if credentials is None or credentials.invalid:
        credentials = tools.run_flow(flow, storage, tools.argparser.parse_args([]))
    http = httplib2.Http()
    http = credentials.authorize(http)
    service = build('bigquery', 'v2', http=http)
    return service


def authorize_credentials_with_Google():
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    # documentation: https://developers.google.com/accounts/docs/application-default-credentials
    SCOPES = ['https://www.googleapis.com/auth/bigquery']
    # credentials = GoogleCredentials.get_application_default().create_scoped(SCOPES)
    credentials = GoogleCredentials.from_stream(settings.GOOGLE_APPLICATION_CREDENTIALS).create_scoped(SCOPES)
    http = httplib2.Http()
    http = credentials.authorize(http)
    service = build('bigquery', 'v2', http=http)
    if debug: print >> sys.stderr,' big query authorization '+sys._getframe().f_code.co_name
    return service

# TODO refactor to remove duplicate code
def authorize_credentials_with_google_from_file(credentials_path):
    if debug: print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    # documentation: https://developers.google.com/accounts/docs/application-default-credentials
    SCOPES = ['https://www.googleapis.com/auth/bigquery']
    credentials = GoogleCredentials.from_stream(credentials_path).create_scoped(SCOPES)
    http = httplib2.Http()
    http = credentials.authorize(http)
    service = build('bigquery', 'v2', http=http)

    return service


def get_user_email_from_token(access_token):
    print >> sys.stderr,'Called '+sys._getframe().f_code.co_name
    user_email = None
    credentials = AccessTokenCredentials(access_token, 'test-user')
    http = credentials.authorize(httplib2.Http())
    user_info_service = build('oauth2', 'v2', http=http)
    user_info = user_info_service.userinfo().get().execute()
    if 'email' in user_info:
        user_email = user_info['email']
    return user_email
