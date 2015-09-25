from django.http import HttpResponse
import pysftp
import json
import StringIO
from googleapiclient import http
from googleapiclient.errors import HttpError
from accounts.models import NIH_User
from django.contrib.auth.models import User
from datetime import datetime
from pytz.gae import pytz
import io
from django.views.decorators.csrf import csrf_exempt
from google_helpers.directory_service import get_directory_resource
from google_helpers.storage_service import get_storage_resource
from django.core.exceptions import MultipleObjectsReturned, ObjectDoesNotExist
from google.appengine.api.taskqueue import Task, Queue
from django.conf import settings
import argparse
import csv
import logging
import MySQLdb
import os

logger = logging.getLogger(__name__)

FALLBACK_QUEUE_NAME = 'logout-sweeper'

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

import pprint


# scrub isb-cgc-cntl of user emails that don't have an NIH_username corresponding to the dbGaP_authorized_list
def scrub_nih_users(dbGaP_authorized_list):
        rows = [row.strip() for row in dbGaP_authorized_list.split('\n') if row.strip()]

        directory_service, directory_http_auth = get_directory_resource()
        result = directory_service.members().list(groupKey='isb-cgc-cntl@isb-cgc.org').execute(http=directory_http_auth)
        members = result['members']
        # loop through everyone in isb-cgc-cntl@isb-cgc.org
        for member in members:
            email = member['email']
            logger.info("Checking user {} on isb-cgc-cntl list".format(email))
            # skip email  907668440978-oskt05du3ao083cke14641u35deokgjj@developer.gserviceaccount.com?
            try:
                # get user id from email
                user_id = User.objects.get(email=email).id
                # get nih_username from user id
                nih_user = NIH_User.objects.get(user_id=user_id)
                nih_username = nih_user.NIH_username

                # verify that nih_username is in one of the rows
                if not matching_row_exists(rows, 'login', nih_username):
                    # remove from isb-cgc-cntl
                    directory_service.members().delete(groupKey='isb-cgc-cntl@isb-cgc.org', memberKey=email).execute(http=directory_http_auth)
                    logger.warn("Deleted user {} from isb-cgc-cntl because a matching entry was not found in the dbGaP authorized list.".format(email))
                    # change dbGaP_authorized to False
                    nih_user.dbGaP_authorized = False
                    nih_user.save()
                    logger.warn("Changed NIH user {}'s dbGaP_authorized to False because a matching entry was not found in the dbGaP authorized list.".format(nih_username))

            # if that user is somehow on isb-cgc-cntl but has 0 or plural entries in User or NIH_User
            except (MultipleObjectsReturned, ObjectDoesNotExist), e:
                logger.debug("Problem getting either {}'s user id or their NIH username: {}".format(email, str(e)))
                # remove from isb-cgc-cntl
                directory_service.members().delete(groupKey='isb-cgc-cntl@isb-cgc.org', memberKey=email).execute(http=directory_http_auth)
                continue  # ?





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
            now_in_utc = pytz.utc.localize(datetime.now())

            if (expire_time - now_in_utc).total_seconds() <= 0:
                # take user off isb-cgc-cntl, without bothering to check if dbGaP_authorized or not
                directory_service, directory_http_auth = get_directory_resource()
                user_email = User.objects.get(id=user_id).email
                try:
                    logger.info('user ' + str(user_email) + ' being removed from isb-cgc-cntl')
                    result = directory_service.members().delete(
                        groupKey='isb-cgc-cntl@isb-cgc.org',
                        memberKey=user_email).execute(http=directory_http_auth)

                except HttpError, e:
                    logger.debug(user_email + ' was not removed from isb-cgc-cntl: ' + str(e))

                logger.info('user id ' + str(nih_user.NIH_username) + ' being removed from nih_users')
                nih_user.delete()

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
    return (pytz.utc.localize(datetime.now()) - login_datetime).total_seconds() >= (LOGIN_EXPIRATION_SECONDS + expiry_padding_seconds)


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

import subprocess

def CloudSQL_logging(request):

    filenames = get_binary_log_filenames()
    yesterdays_binary_log_file = filenames[-2]
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
               settings.DATABASES['default']['PASSWORD']
               ]
    # subprocess.call(arglist)


    return HttpResponse('')


def get_binary_log_filenames():
    database = settings.DATABASES['default']
    env = os.getenv('SERVER_SOFTWARE')
    if env and env.startswith('Google App Engine/'):
        db = MySQLdb.connect(
            unix_socket=database['HOST'],
            db=database['NAME'],
            user=database['USER'],
        )
    else:
        db = MySQLdb.connect(
            host=settings.IPV4,
            db=database['NAME'],
            user=database['USER'],
            passwd=database['PASSWORD']
        )
    try:
        cursor = db.cursor()
        cursor.execute('SHOW BINARY LOGS;')
        filenames = []
        for row in cursor.fetchall():
            filenames.append(row[0])
    except (TypeError, IndexError) as e:
        logger.warn('Error in retrieving binary log filenames: {}'.format(e))

    return filenames