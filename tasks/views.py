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

import io
import os
import re
import json
import StringIO
import csv
import logging
import sys
import pytz

import pysftp

import pexpect  # comment this out when running in gae
import datetime

from django.http import HttpResponse
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect
from django.core.exceptions import MultipleObjectsReturned, ObjectDoesNotExist
from django.conf import settings
from django.http import StreamingHttpResponse

from googleapiclient import http
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload
from google_helpers.directory_service import get_directory_resource
from google_helpers.reports_service import get_reports_resource
from google_helpers.storage_service import get_storage_resource, get_special_storage_resource
from google_helpers.resourcemanager_service import get_crm_resource
from google_helpers.logging_service import get_logging_resource
from google_helpers.bigquery_service import get_bigquery_service
from google.appengine.api.taskqueue import Task, Queue

from oauth2client.client import GoogleCredentials
# from gcloud import storage, bigquery
from google_helpers import storage_service, bigquery_service
import pandas as pd
import uuid

from accounts.models import NIH_User
from api.api_helpers import sql_connection

import pprint

debug = settings.DEBUG

logger = logging.getLogger(__name__)

FALLBACK_QUEUE_NAME = 'logout-sweeper'
ACL_GOOGLE_GROUP = settings.ACL_GOOGLE_GROUP

LOGIN_EXPIRATION_SECONDS = 30

# we want to give each login's "regular" cleanup task a chance to check the
# corresponding user record for expiry before allowing the "sweeper" job to push
# a job onto the "fallback" queue (primarily to make it easier to detect actual
# errors), so the sweeper adds an hour of padding to the expiration check.
VERY_EXPIRED_SECONDS = 60 * 60


def get_nih_authorized_list(request):
    try:
        f = open('NIH_FTP.txt')
        contents = f.read()
        json_content = json.loads(contents)
        host = str(json_content['host'])
        username = str(json_content['username'])
        password = str(json_content['password'])
        filename = str(json_content['filename'])

        sftp_conn = pysftp.Connection(host=host, username=username, password=password)

        output = StringIO.StringIO()
        sftp_conn.sftp_client.getfo(filename, output)
        contents = output.getvalue()


        storage_service = get_storage_resource()
        media = http.MediaIoBaseUpload(io.BytesIO(contents), 'text/plain')
        filename = settings.DBGAP_AUTHENTICATION_LIST_FILENAME
        bucket_name = settings.DBGAP_AUTHENTICATION_LIST_BUCKET

        req = storage_service.objects().insert(bucket=bucket_name,
                                               name=filename,
                                               media_body=media
                                               )
        req.execute()

        sftp_conn.close()
        scrub_nih_users(contents)

        return HttpResponse('')

    except Exception, e:
        return HttpResponse(e)


# scrub ACL_GOOGLE_GROUP of user emails that don't have an NIH_username corresponding to the dbGaP_authorized_list
def scrub_nih_users(dbGaP_authorized_list):
        rows = [row.strip() for row in dbGaP_authorized_list.split('\n') if row.strip()]

        directory_service, directory_http_auth = get_directory_resource()
        result = directory_service.members().list(groupKey=ACL_GOOGLE_GROUP).execute(http=directory_http_auth)

        members = [] if 'members' not in result else result['members']
        # loop through everyone in ACL_GOOGLE_GROUP
        for member in members:
            email = member['email']
            logger.info("Checking user {} on ACL_GOOGLE_GROUP list".format(email))
            # skip email  907668440978-oskt05du3ao083cke14641u35deokgjj@developer.gserviceaccount.com?
            try:
                # get user id from email
                user_id = User.objects.get(email=email).id
                # get nih_username from user id
                nih_user = NIH_User.objects.get(user_id=user_id)
                nih_username = nih_user.NIH_username

                # verify that nih_username is in one of the rows
                if not matching_row_exists(rows, 'login', nih_username):
                    # remove from ACL_GOOGLE_GROUP
                    directory_service.members().delete(groupKey=ACL_GOOGLE_GROUP, memberKey=email).execute(http=directory_http_auth)
                    logger.warn("Deleted user {} from ACL_GOOGLE_GROUP because a matching entry was not found in the dbGaP authorized list.".format(email))
                    nih_user.dbGaP_authorized = False
                    nih_user.save()
                    logger.warn("Changed NIH user {}'s dbGaP_authorized to False because a matching entry was not found in the dbGaP authorized list.".format(nih_username))

            # if that user is somehow on ACL_GOOGLE_GROUP but has 0 or plural entries in User or NIH_User
            except (MultipleObjectsReturned, ObjectDoesNotExist), e:
                logger.debug("Problem getting either {}'s user id or their NIH username: {}".format(email, str(e)))
                # remove from ACL_GOOGLE_GROUP
                directory_service.members().delete(groupKey=ACL_GOOGLE_GROUP, memberKey=email).execute(http=directory_http_auth)
                continue
        # loop through everyone in NIH_User.objects.filter(dbGaP_authorized=True) out of paranoia
        for nih_user in NIH_User.objects.filter(dbGaP_authorized=True):
            logger.info("checking nih_user {}".format(nih_user.NIH_username))
            if not matching_row_exists(rows, 'login', nih_user.NIH_username):
                nih_user.dbGaP_authorized = False
                nih_user.save()
                logger.warn("Changed NIH user {}'s dbGaP_authorized to False because a matching entry was not found in the dbGaP authorized list.".format(nih_user.NIH_username))


def IAM_logging(request):

    log_message = get_iam_policy()
    write_log_entry("iam", log_message)

    return HttpResponse('')


def get_iam_policy():
    """ Calls the Cloud Resource Manager API and
        Returns IAM policy associated with the project
    """
    crm_client = get_crm_resource()

    # get getIamPolicy
    body = {}
    iam_policy = crm_client.projects().getIamPolicy(
        resource=settings.BIGQUERY_PROJECT_NAME, body=body).execute()
    return iam_policy


def write_log_entry(log_name, log_message):
    """ Creates a log entry using the Cloud logging API
        Writes a struct payload as the log message
        Also, the API writes the log to bucket and BigQuery
        Works only with the Compute Service

        type log_name: str
        param log_name: The name of the log entry
        type log_message: json
        param log_message: The struct/json payload
    """
    client, http_auth = get_logging_resource()

    # write using logging API (metadata)
    entry_metadata = {
        "timestamp": datetime.datetime.utcnow().isoformat("T") + "Z",
        "serviceName": "compute.googleapis.com",
        "severity": "INFO",
        "labels": {}
    }

    # Create a POST body for the write log entries request(Payload).
    body = {
        "commonLabels": {
            "compute.googleapis.com/resource_id": log_name,
            "compute.googleapis.com/resource_type": log_name
        },
        "entries": [
            {
                "metadata": entry_metadata,
                "log": log_name,
                "structPayload": log_message
            }
        ]
    }
    try:
        resp = client.projects().logs().entries().write(
            projectsId=settings.BIGQUERY_PROJECT_NAME, logsId=log_name, body=body).execute()
        print >> sys.stderr, resp

        if resp:
            # this would be an error
            sys.stderr.write(resp + '\n')

    except Exception as e:
        sys.stderr.write(e.message + '\n')


@csrf_exempt
def check_user_login(request):

    if len(request.body):
        request_body = dict([x.split("=") for x in request.body.split("&")])
        user_id = int(request_body['user_id']) if request_body.get('user_id', '').isdigit() else None

        if user_id:
            try:
                nih_user = NIH_User.objects.get(user_id=user_id)
            except (MultipleObjectsReturned, ObjectDoesNotExist), e:
                logger.debug('Error when retrieving nih_user with user_id ' + str(user_id) + ': ' + str(e))
                return HttpResponse('')

            expire_time = nih_user.NIH_assertion_expiration
            expire_time = expire_time if expire_time.tzinfo is not None else pytz.utc.localize(expire_time)
            now_in_utc = pytz.utc.localize(datetime.datetime.now())

            if (expire_time - now_in_utc).total_seconds() <= 0:
                # take user off ACL_GOOGLE_GROUP, without bothering to check if user is dbGaP_authorized or not
                directory_service, directory_http_auth = get_directory_resource()
                user_email = User.objects.get(id=user_id).email
                try:
                    logger.info('user ' + str(user_email) + ' being removed from ACL_GOOGLE_GROUP')
                    result = directory_service.members().delete(
                        groupKey=ACL_GOOGLE_GROUP,
                        memberKey=user_email).execute(http=directory_http_auth)

                except HttpError, e:
                    logger.debug(user_email + ' was not removed from ACL_GOOGLE_GROUP: ' + str(e))

                nih_user.active = False
                nih_user.dbGaP_authorized = False
                nih_user.save()
                logger.info('User with NIH username ' + str(nih_user.NIH_username) + ' is deactivated in NIH_User table')

    return HttpResponse('')


def check_users_sweeper(request):
    logger.info('check users sweeper runnning...')
    expired_users = [user for user in NIH_User.objects.all() if is_very_expired(user.NIH_assertion_expiration)]

    if expired_users:
        fallback_queue = Queue(name=FALLBACK_QUEUE_NAME)
        batch_size = 25
        for i in xrange(0, len(expired_users), batch_size):
            users = expired_users[i:i+batch_size]
            logger.info('scheduling check_user_login tasks for the following users: ')
            logger.info(str([str(user.NIH_username) for user in users]))
            tasks = [Task(url='/tasks/check_user_login', params={'user_id': user.user_id}, countdown=0) for user in users]
            fallback_queue.add(tasks)
    return HttpResponse('')


def is_very_expired(login_datetime):
    return is_expired(login_datetime, expiry_padding_seconds=VERY_EXPIRED_SECONDS)


def is_expired(login_datetime, expiry_padding_seconds=0):
    return (pytz.utc.localize(datetime.datetime.now()) - login_datetime).total_seconds() >= (LOGIN_EXPIRATION_SECONDS + expiry_padding_seconds)


# given a list of CSV rows, test whether any of those rows contain the specified
# field name:value entry.
def matching_row_exists(csv_rows, field_name, field_value):
    return len(find_matching_rows(csv_rows, field_name, field_value, 1)) > 0


# given a list of CSV rows (strings -- i.e. the lines from a CSV document) and
# a target field name:value pair, find and return up to match_limit rows which
# contain the specified name:value entry.
def find_matching_rows(csv_rows, field_name, field_value, match_limit=float('inf')):
    assert match_limit > 0, 'invalid match limit: {} (must be positive'.format(match_limit)

    dict_reader = csv.DictReader(csv_rows)
    dict_reader.fieldnames = [field.strip() for field in dict_reader.fieldnames]

    # no reason to even look at any of the rows if the target field is missing
    if field_name not in dict_reader.fieldnames:
        print "WARNING: '{}' is not a field in the input file (fields found: {})".format(
            field_name, dict_reader.fieldnames)
        return []

    # process rows until either match_limit matches have been found, or all of the
    # rows have been processed
    matches = []
    for row in dict_reader:
        if row.get(field_name) == field_value:
            matches.append(row)
            if len(matches) >= match_limit:
                break

    return matches


def CloudSQL_logging(request):

    filenames = get_binary_log_filenames()
    yesterdays_binary_log_file = filenames[-2]
    logger.info("Yesterday's binary log file: " + str(yesterdays_binary_log_file))
    arglist = ['mysqlbinlog',
               '--read-from-remote-server',
               yesterdays_binary_log_file,
               '--host',
               settings.IPV4,
               '--user',
               settings.DATABASES['default']['USER'],
               '--base64-output=DECODE-ROWS',
               '--verbose',
               '--password',
               settings.DATABASES['default']['PASSWORD'],
               '--ssl-ca=' + settings.DATABASES['default']['OPTIONS']['ssl']['ca'],
               '--ssl-cert=' + settings.DATABASES['default']['OPTIONS']['ssl']['cert'],
               '--ssl-key=' + settings.DATABASES['default']['OPTIONS']['ssl']['key']
               ]

    child = pexpect.spawn(' '.join(arglist))
    child.expect('Enter password:')
    child.sendline(settings.DATABASES['default']['PASSWORD'])
    i = child.expect(['Permission denied', 'Terminal type', '[#\$] '])
    if i == 2:
        output = child.read()
        date_start_char = output.find('#1')
        if date_start_char:  # if date_star_char is not zero
            date_str = output[date_start_char+1:date_start_char+7]
        else:
            utc_now = datetime.datetime.utcnow()
            date_str = str(utc_now.year)[2:] + str(utc_now.month) + str(utc_now.day-1) + '?'
        storage_service = get_storage_resource()
        media = http.MediaIoBaseUpload(io.BytesIO(output), 'text/plain')
        filename = 'cloudsql_activity_log_' + date_str + '.txt'
        storage_service.objects().insert(bucket='isb-cgc_logs',
                                         name=filename,
                                         media_body=media,
                                         ).execute()
    else:
        logger.warn("Logs were not written to cloudstorage, i = " + str(i))
        return HttpResponse("Logs were not written to cloudstorage, i = " + str(i))

    return HttpResponse('')


def get_binary_log_filenames():
    db = sql_connection()
    try:
        cursor = db.cursor()
        cursor.execute('SHOW BINARY LOGS;')
        filenames = []
        for row in cursor.fetchall():
            filenames.append(row[0])
        return filenames
    except (TypeError, IndexError) as e:
        logger.warn('Error in retrieving binary log filenames: {}'.format(e))


@login_required
def remove_user_from_ACL(request, nih_username):
    edit_dbGaP_authentication_list(nih_username)
    if request.user.is_superuser:
        try:
            nih_user = NIH_User.objects.get(NIH_username=nih_username)
            user = User.objects.get(id=nih_user.user_id)
            email = user.email
        except (ObjectDoesNotExist, MultipleObjectsReturned), e:
            logger.error("Error when attempting to emergency remove NIH username {} from ACL: {}".format(nih_username, e))
            return HttpResponse("Error when attempting to emergency remove NIH username {} from ACL: {}".format(nih_username, e))

        service, http_auth = get_directory_resource()
        try:
            result = service.members().delete(
                groupKey=ACL_GOOGLE_GROUP,
                memberKey=email
            ).execute(http=http_auth)
            logger.info(result)
        except HttpError as e:
            logger.error("Error when attempting to emergency remove NIH username {} from ACL: {}".format(nih_username, e))
            return HttpResponse("HttpError when attempting to emergency remove NIH username {nih_username} with email {email} from ACL.".format(
                nih_username=nih_username, email=email))

        logger.warn("Successfully emergency removed user with NIH username {nih_username} and email {email} from ACL.".format(
            nih_username=nih_username, email=email))
        # also deactivate NIH user in NIH_User table
        nih_user.active = False
        nih_user.dbGaP_authorized = False
        nih_user.save()
        logger.warn("Successfully emergency deactivated user with NIH username {nih_username} and email {email} from NIH_User table.".format(
            nih_username=nih_username, email=email))
        edit_dbGaP_authentication_list(nih_username)
        return HttpResponse("Successfully removed user with NIH username {nih_username} and email {email} from ACL.".format(
            nih_username=nih_username, email=email))
    else:
        return redirect(settings.BASE_URL)


def edit_dbGaP_authentication_list(nih_username):

    nih_username = nih_username.upper()

    # 1. read the contents of the dbGaP authentication list
    storage_service = get_storage_resource()
    filename = settings.DBGAP_AUTHENTICATION_LIST_FILENAME
    bucket_name = settings.DBGAP_AUTHENTICATION_LIST_BUCKET
    req = storage_service.objects().get_media(bucket=bucket_name,
                                              object=filename)
    dbGaP_authorized_list = req.execute()
    rows = [row.strip() for row in dbGaP_authorized_list.split('\n') if row.strip()]

    # 2. remove the line with the offending nih_username
    for row in rows:
        # this will remove not only the user with the nih_username
        # but also everyone who is a downloader for that user
        if nih_username in row:
            try:
                rows.remove(row)
            except ValueError as e:
                logger.warn("Couldn't remove a row from {}. {}".format(
                    settings.DBGAP_AUTHENTICATION_LIST_FILENAME, e))

    # 3. reinsert the new dbGaP authentication list
    new_authentication_list = "\n".join(rows)
    media = http.MediaIoBaseUpload(io.BytesIO(new_authentication_list), 'text/plain')
    req = storage_service.objects().insert(bucket=bucket_name,
                                           name=filename,
                                           media_body=media
                                           )
    req.execute()
    logger.info("NIH user {} removed from {}".format(
        nih_username, settings.DBGAP_AUTHENTICATION_LIST_FILENAME))


def create_and_log_reports(request):
    """
    Returns:
       Returns information on the various Admin console activities
    """

    # construct service.
    service, http_auth = get_reports_resource()

    # get utc time and timedelta
    utc_now = datetime.datetime.utcnow()
    tdelta = utc_now + datetime.timedelta(days=-1)
    start_datetime = tdelta.isoformat("T") + "Z" # collect last 7 days logs

    for application_name in ['admin', 'login', 'token', 'groups']:
        # If there is ever an HttpError 400 error "Log entry with size <x> bytes exceeds maximum size of 112640 bytes",
        # then decrease maxResults value. For now, maxResults=100 works.
        req = service.activities().list(userKey='all', applicationName=application_name,
                                        startTime=start_datetime, maxResults=100)
        resp = req.execute(http=http_auth)
        # log the reports using Cloud logging API
        write_log_entry('apps_{}_activity_report'.format(application_name), resp)

        # if there are more than maxResults=100 results, other log results will be written with Cloud logging API
        while resp.get("nextPageToken"):
            req = service.activities().list_next(previous_request=req, previous_response=resp)
            resp = req.execute(http=http_auth)
            # log the reports using Cloud logging API
            write_log_entry('apps_{}_activity_report'.format(application_name), resp)

    return HttpResponse('')


# list_buckets, get_bucket_acl, and get_bucket_defacl are all used by log_acls
def list_buckets(client, project_id):
    """gets all buckets in the project"""
    req = client.buckets().list(
        project=project_id,
        maxResults=42)
    bucket_info = []
    while req is not None:
        resp = req.execute()
        for bucket in resp['items']:
            bucket_info.append(bucket)
        req = client.buckets().list_next(req, resp)
    return bucket_info

def get_bucket_acl(client, bucket_name):
    """get the bucket acl"""
    req = client.bucketAccessControls().list(
        bucket=bucket_name,
    )
    resp = req.execute()
    return resp

def get_bucket_defacl(client, bucket_name):
    """get the bucket defacl"""
    req = client.defaultObjectAccessControls().list(
        bucket=bucket_name,
    )
    resp = req.execute()
    return resp

def log_acls(request):
    """log acls"""
    client = get_storage_resource()
    all_projects = ['isb-cgc', 'isb-cgc-data-01', 'isb-cgc-data-02', 'isb-cgc-test']
    acls = {}
    defacls = {}
    # Iterate through projects and buckets and get acls
    for project in all_projects:
        for bucket in list_buckets(client, project):
            acl = get_bucket_acl(client, bucket['name'])
            defacl = get_bucket_defacl(client, bucket['name'])
            acls[bucket['name']] = acl
            defacls[bucket['name']] = defacl
    # write log entry
    write_log_entry('bucket_acls', acls)
    write_log_entry('bucket_defacls', defacls)

    return HttpResponse('')


@login_required
def metrics_cloudsql_users(request, start_date, end_date):
    if not request.user.is_superuser:
        return HttpResponse('You need to be logged in as a superuser.')

    assert start_date.isdigit(), "{} is not a digit".format(start_date)
    assert end_date.isdigit(), "{} is not a digit".format(end_date)
    assert len(start_date) == 6, "start_date must be of the form yymmdd"
    assert len(end_date) == 6, "end_date must be of the form yymmdd"
    assert int(end_date) > int(start_date), "end_date must be later than start_date"

    user_metrics_dict = {}

    # convert to date
    start_date = datetime.datetime.strptime("20" + start_date, "%Y%m%d")
    end_date = datetime.datetime.strptime("20" + end_date, "%Y%m%d")

    parse_cloudsql_logs(user_metrics_dict, start_date, end_date)

    csv_response = write_user_metrics_csv_file(user_metrics_dict)
    csv_response['Content-Disposition'] = 'attachment; filename="Users from {} to {}.csv"'.format(start_date, end_date)

    # return HttpResponse('<pre>'+json.dumps(user_metrics_dict, indent=4)+'</pre>')
    return csv_response

def parse_cloudsql_logs(user_metrics_dict, start_date, end_date):

    storage_client = get_special_storage_resource()

    date_range = (end_date - start_date).days

    for day_delta in range(date_range+1):
        day = start_date + datetime.timedelta(days=day_delta)
        day = day.strftime("%y%m%d")
        user_metrics_dict[day] = {}
        req = storage_client.objects().get_media(
            bucket='isb-cgc_logs', object='cloudsql_activity_log_{}.txt'.format(day))
        try:
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, req, chunksize=1024*1024)
            done = False
            while not done:
                status, done = downloader.next_chunk()

        # throws HttpError if this file is not found
        except HttpError, e:
            print >> sys.stderr, e
        else:
            write_user_activity(fh.getvalue(), user_metrics_dict[day])


def write_user_activity(log_str, user_metrics_current_day):
    user_metrics_current_day['new_users'] = []
    new_user_index_list = [m.start() for m in re.finditer('### INSERT INTO `prod`.`auth_user`', log_str)]

    for i in new_user_index_list:
        new_user_email_start_index = log_str.find("@8='", i) + 4
        new_user_email_end_index = log_str.find("'", new_user_email_start_index)
        new_user_email = log_str[new_user_email_start_index:new_user_email_end_index]
        user_metrics_current_day['new_users'].append(new_user_email)

    user_metrics_current_day['old_users'] = {}
    old_user_index_list = [m.start() for m in re.finditer('### UPDATE `prod`.`auth_user`', log_str)]

    for i in old_user_index_list:
        old_user_email_start_index = log_str.find("@8='", i) + 4
        old_user_email_end_index = log_str.find("'", old_user_email_start_index)
        old_user_email = log_str[old_user_email_start_index:old_user_email_end_index]
        if old_user_email not in user_metrics_current_day['new_users']:
            if old_user_email not in user_metrics_current_day['old_users'].keys():
                user_metrics_current_day['old_users'][old_user_email] = []
            old_user_last_login_start_index = log_str.find("@3=", old_user_email_end_index) + 3
            old_user_last_login_end_index = log_str.find("\r\n", old_user_last_login_start_index)
            old_user_login_date = log_str[old_user_last_login_start_index:old_user_last_login_end_index]
            user_metrics_current_day['old_users'][old_user_email].append(old_user_login_date)


def write_user_metrics_csv_file(user_metrics_dict):
    rows = ()
    rows = (["Date", "Number of New Users", "Number of Returning Users"],)
    for date in user_metrics_dict.keys():
        rows += ([
                    str(date),
                    str(len(user_metrics_dict[date].get('new_users', []))),
                    str(len(user_metrics_dict[date].get('old_users', {}).keys()))
                 ],)

    pseudo_buffer = Echo()
    writer = csv.writer(pseudo_buffer)
    response = StreamingHttpResponse((writer.writerow(row) for row in rows),
                                         content_type="text/csv")

    return response


class Echo(object):
    """An object that implements just the write method of the file-like
    interface.
    """
    def write(self, value):
        """Write the value by returning it, instead of storing in a buffer."""
        return value




def normalize_json(item_y):
    """Converts a nested json string into a flat dict
    """
    out = {}

    def flatten(item_x, name=''):
        """Flatten nested string"""
        if type(item_x) is dict:
            for item_a in item_x:
                flatten(item_x[item_a], name +  item_a + '_')
        elif type(item_x) is list:
            for item_a in item_x:
                flatten(item_a, name)
        else:
            out[str(name[:-1])] = item_x
    flatten(item_y)
    return out

# def create_client(http=None):
#     """Create BigQuery client
#     """
#     bq_scope = ['https://www.googleapis.com/auth/bigquery']
#     credentials = GoogleCredentials.get_application_default()
#     if credentials.create_scoped_required():
#         credentials = credentials.create_scoped(bq_scope)
#     if not http:
#         http = httplib2.Http()
#     credentials.authorize(http)
#     return build('bigquery', 'v2', http=http)


def create_table(service, project_id, dataset_id, table_id, schema):
    """Create a BigQuery table
    """
    body = {
        'schema': schema,
        'tableReference': {
            'tableId': table_id,
            'projectId': project_id,
            'datasetId': dataset_id
        }
    }
    try:
        service.tables().insert(projectId=project_id, datasetId=dataset_id,
                                body=body).execute()
        print 'table created: ' + table_id
    except Exception as ex:
        print ex
        raise

def generate_schema(df, format_dtypes, default_type='STRING'):
    """Generate schema"""
    fields = []
    for column_name, dtype in df.dtypes.iteritems():
        if column_name in format_dtypes:
            dtype = format_dtypes[column_name]
        else:
            dtype = default_type
        fields.append({'name': column_name,
                       'type': dtype})

    return {'fields': fields}


def stream_row_to_bigquery(service, project_id, dataset_id, table_name, row,
                           num_retries=5):
    """Streams data into BigQuery
    """
    insert_all_data = {
        'rows': [{
            'json': row,
            # Generate a unique id for each row so retries don't accidentally
            # duplicate insert
            'insertId': str(uuid.uuid4()),
        }]
    }
    return service.tabledata().insertAll(
        projectId=project_id,
        datasetId=dataset_id,
        tableId=table_name,
        body=insert_all_data).execute(num_retries=num_retries)


def read_json_from_storage(project_id, bucket_id, file_id, credentials):
    """read the file from the bucket
    """

    # storage_client = storage.Client(project=project_id, credentials=credentials)
    storage_client = storage_service.get_storage_resource()
    bucket = storage_client.get_bucket(bucket_id)
    blob = bucket.get_blob(file_id)
    item_json = json.loads(blob.download_as_string())

    # flatten the nested json string
    all_items = []
    for item in item_json:
        item_content = normalize_json(item)
        all_items.append(item_content)

    # a little time consuming, but is worth converting into dataframe
    data_df = pd.DataFrame(all_items)

    return data_df

def check_table_exists(project_id, dataset_id, table_id, credentials):
    """Check if the BigQuery table exists
    """
    # bigquery_client = bigquery.Client(project=project_id, credentials=credentials)
    bigquery_client = bigquery_service.get_bigquery_service()
    dataset = bigquery_client.dataset(dataset_id)
    table = dataset.table(name=table_id)

    return table.exists()

def load_billing_to_bigquery(request):
    """Main: Read the file from storage and load into BigQuery
    """
    if os.getenv('SERVER_SOFTWARE', '').startswith('Google App Engine'):
        credentials = GoogleCredentials.get_application_default()
    else:
        credentials = GoogleCredentials.from_stream(settings.GOOGLE_APPLICATION_CREDENTIALS)

    date = (datetime.datetime.now() + datetime.timedelta(days=-1))

    project_id = settings.BIGQUERY_PROJECT_NAME
    bucket_id = 'isb-cgc-billing-json'
    dataset_id = 'billing'
    table_id = 'billing_' + date.strftime("%Y%m%d")
    file_id = 'billing-' + date.strftime("%Y-%m-%d") + '.json'

    # create service
    bq_service = get_bigquery_service()

    # read file from storage
    data_df = read_json_from_storage(project_id, bucket_id, file_id, credentials)

    # generate bigquery schema
    dtypes = {'cost_amount': 'FLOAT', 'endTime': 'TIMESTAMP', 'credits_amount': 'FLOAT',
              'startTime': 'TIMESTAMP', 'measurements_sum': 'INTEGER'}
    schema = generate_schema(data_df, dtypes)

    # check if the table exists, if not create and stream rows
    if not check_table_exists(project_id, dataset_id, table_id, credentials):

        create_table(bq_service, project_id, dataset_id, table_id, schema)

        # stream rows to bigquery table
        for _, row in data_df.iterrows():
            row = row.to_dict()
            stream_row_to_bigquery(bq_service, project_id, dataset_id, table_id, row,
                                   num_retries=5)

        return HttpResponse('')

    else:
        return HttpResponse('Table already exists: cannot create table')