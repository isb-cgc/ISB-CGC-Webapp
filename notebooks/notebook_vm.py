import logging
from django.conf import settings
# from django.contrib.auth.decorators import login_required
from google_helpers.compute_service import get_compute_resource
# from google_helpers.gcs.service import get_storage_resource
from googleapiclient.errors import HttpError
from googleapiclient.discovery import build
from oauth2client.client import GoogleCredentials
import httplib2
from google.cloud import storage
import os
# from os.path import join, dirname

# from google.cloud import storage, exceptions
# import cloudstorage
from pprint import pprint

from .utils import hash

# from scp import SCPClient

STAGE_TITLES = ['project', 'firewall', 'external IP', 'monitoring service', 'VM Instance', 'files', 'password',
                'firewall deletion', 'external IP address deletion', 'instance initiation']
SETUP_PROJECT = 0
SETUP_FIREWALL = 1
SETUP_EXTERNAL_IP = 2
SETUP_MONITOR = 3
SETUP_INSTANCE = 4
SETUP_FILES = 5
SETUP_VM_PASSWORD = 6
DELETE_FIREWALL = 7
DELETE_ADDRESS = 8
START_INSTANCE = 9
# STOP_INSTANCE = 10
# DELETE_INSTANCE = 11

# firewall methods
FIREWALLS_LIST = 0
FIREWALLS_UPDATE = 1
FIREWALLS_CREATE = 2
FIREWALLS_DELETE = 3

# addresses
ADDRESSES_LIST = 0
ADDRESSES_GET = 1
ADDRESSES_CREATE = 2
ADDRESSES_DELETE = 3

# instances
INSTANCES_LIST = 0
INSTANCES_GET = 1
INSTANCES_CREATE = 2
INSTANCES_START = 3
INSTANCES_STOP = 4
INSTANCES_DELETE = 5

# ext_ip_address = None
gcp_project_id = 'cgc-05-0038'  # todo: retrieve from UI
vm_zone = 'us-central1-c'
vm_username = 'elee'  #todo: retrieve from UI
machine_name = vm_username + '-unique-machine-name-1'

logger = logging.getLogger('main_logger')


def start_vm(setup_stage=SETUP_PROJECT, client_ip=None):

    FIREWALL_TAG = vm_username + '-restricted-jupyter'
    FIREWALL_RULE_NAME = vm_username + '-jupyter-firewall-rule'
    NOTEBOOK_VM_BUCKET = vm_username + '-notebook-vm'

    # Choose one format and change to your IP range for your desktop:
    # FIREWALL_IP_RANGE = ['71.231.138.210']  # todo: have this value set programatically
    FIREWALL_IP_RANGE = ['174.127.185.135', '174.127.185.130']  # todo: have this value set programatically
    DISK_SIZE = 30
    MACHINE_TYPE = 'n1-standard-1'

    SERV_PORT1 = '5000' # port for jupyter notebook
    SERV_PORT2 = '9000' # port for filemanager server
    MACHINE_DESC = 'Jupyter Notebook Server for ' + vm_username

    # gcp_project_id = 'isb-cgc-test'
    # USER_AND_MACHINE = vm_username + '@' + machine_name

    REGION = 'us-central1'
    ADDRESS_NAME = vm_username + '-jupyter-address'
    CERT_SUBJ = '/C=US/ST=MyState/L=MyCity/O=MyInstitution/OU=MyDepartment/CN='
    NEED_API = 'monitoring.googleapis.com'
    # setup_stage = SETUP_PROJECT
    PROJECT_NO = None

    PASSWORD_1 = 'elaine'
    PASSWORD_2 = 'elaine'
    response = {}
    ext_ip_address = None
    resp_code = '200'

    try:
        # service = get_compute_resource()

        if setup_stage == DELETE_FIREWALL:
            print('Deleting Firewall ...')
            response = build_firewalls_request(method=FIREWALLS_DELETE, project_id=gcp_project_id,
                                               firewall_rule_name=FIREWALL_RULE_NAME).execute()
        if setup_stage == DELETE_ADDRESS:
            print('Deleting External IP address ...')
            response = build_addresses_request(method=ADDRESSES_DELETE, project_id=gcp_project_id, region=REGION,
                                               name=ADDRESS_NAME).execute()
        # if setup_stage == STOP_INSTANCE:
        #     print('Stopping Instance ...')
        #     response = build_instances_request(method=INSTANCES_STOP, project_id=gcp_project_id, zone=vm_zone,
        #                                        name=machine_name).execute()
        # if setup_stage == DELETE_INSTANCE:
        #     print('Deleting Instance ...')
        #     response = build_instances_request(method=INSTANCES_DELETE, project_id=gcp_project_id, zone=vm_zone,
        #                                        name=machine_name).execute()
        if setup_stage == SETUP_PROJECT:
            print('Validating Project ID ...')
            credentials = GoogleCredentials.get_application_default()
            service = build('cloudresourcemanager', 'v1', credentials=credentials)
            response = service.projects().list(filter='projectId={}'.format(gcp_project_id)).execute()
            if 'projects' in response:
                PROJECT_NO = response['projects'][0]['projectNumber']
                setup_stage = SETUP_FIREWALL
                print('Project ID has been validated')
            else:
                resp_code = '500'
                result = {
                    'message': 'Unable to find project ID {}'.format(gcp_project_id)
                }

        if setup_stage == SETUP_FIREWALL:
            # check if firewall exists
            print('Setup a firewall ...')
            response = build_firewalls_request(method=FIREWALLS_LIST, project_id=gcp_project_id,
                                               firewall_rule_name=FIREWALL_RULE_NAME).execute()
            firewall_body = {
                'allowed': [{
                    'ports': [SERV_PORT1, SERV_PORT2],
                    'IPProtocol': 'tcp'
                }],
                'targetTags': [FIREWALL_TAG],
                'sourceRanges': FIREWALL_IP_RANGE,
                'description': FIREWALL_RULE_NAME
            }
            if 'items' in response:
                print('Found existing firewall [{}].'.format(FIREWALL_RULE_NAME))
                # update
                resp_body = response['items'][0]
                need_fw_update = False

                for attr in firewall_body.keys():
                    if attr not in resp_body or resp_body[attr] != firewall_body[attr]:
                        need_fw_update = True
                        break
                if need_fw_update:
                    print('Updating firewall [{}] properties.'.format(FIREWALL_RULE_NAME))
                    response = build_firewalls_request(method=FIREWALLS_UPDATE, project_id=gcp_project_id,
                                                       firewall_rule_name=FIREWALL_RULE_NAME,
                                                       firewall_body=firewall_body).execute()
                    # todo: prompt user if they want to update the values
            else:
                # create a new firewall rule
                print('Creating a new firewall [{}].'.format(FIREWALL_RULE_NAME))
                firewall_body['name'] = FIREWALL_RULE_NAME
                response = build_firewalls_request(method=FIREWALLS_CREATE, project_id=gcp_project_id,
                                                   firewall_rule_name=FIREWALL_RULE_NAME,
                                                   firewall_body=firewall_body).execute()
            if 'error' in response:
                result = {
                    'message': 'There was an error setting up a firewall [{}]: {}'.format(FIREWALL_RULE_NAME,
                                                                                          response['error'][
                                                                                              'message'])
                }
                resp_code = response['error']['code']
            else:
                # pprint(response)
                setup_stage = SETUP_EXTERNAL_IP

        if setup_stage == SETUP_EXTERNAL_IP:
            print('Setup External IP address')
            response = build_addresses_request(method=ADDRESSES_LIST, project_id=gcp_project_id, region=REGION,
                                               name=ADDRESS_NAME).execute()

            if 'items' not in response:
                print('Creating a new external IP address')
                response = build_addresses_request(method=ADDRESSES_CREATE, project_id=gcp_project_id, region=REGION,
                                                   name=ADDRESS_NAME).execute()

                # address_body = response
                # setup_stage
            if 'error' in response:
                result = {
                    'message': 'There was an error setting up an external IP address [{}] {}'.format(ADDRESS_NAME,
                                                                                                     response[
                                                                                                         'error'][
                                                                                                         'message'])
                }
                resp_code = response['error']['code']
            else:

                # response = build_addresses_request(method=ADDRESSES_GET, project_id=gcp_project_id, region=REGION,
                #                                    name=ADDRESS_NAME).execute()
                # pprint(response)
                # ext_ip_address = response['address']
                # print('Using external IP address [{}] {}'.format(ADDRESS_NAME, ext_ip_address))
                setup_stage = SETUP_MONITOR

        if setup_stage == SETUP_MONITOR:
            print('Set monitoring service ...')
            SERVICE_USAGE_SCOPES = ['https://www.googleapis.com/auth/cloud-platform',
                                    'https://www.googleapis.com/auth/cloud-platform.read-only']
            credentials = GoogleCredentials.from_stream(settings.GOOGLE_APPLICATION_CREDENTIALS).create_scoped(
                SERVICE_USAGE_SCOPES)
            http = credentials.authorize(httplib2.Http())
            su_service = build('serviceusage', 'v1', http=http, cache_discovery=False)

            response = su_service.services().list(parent='projects/{}'.format(PROJECT_NO), filter='state:ENABLED'
                                                  , fields='services/config/name'
                                                  ).execute()
            need_su_update = True
            for s in response['services']:
                if s['config']['name'] == NEED_API:
                    print('Monitoring service is already enabled.')
                    need_su_update = False
                    break
            if need_su_update:
                print('Enabling monitoring service ...')
                response = su_service.services().enable(
                    name='projects/{}/services/{}'.format(PROJECT_NO, NEED_API), body={}).execute()

            if 'error' in response:
                result = {
                    'message': 'There was an error while setting the monitoring service [{}] : {}'.format(NEED_API,
                                                                                                          response[
                                                                                                              'error'][
                                                                                                              'message'])
                }
                resp_code = response['error']['code']
            else:
                # resp_code = '200'
                setup_stage = SETUP_FILES
        if setup_stage == SETUP_FILES:
            response = build_addresses_request(method=ADDRESSES_GET, project_id=gcp_project_id, region=REGION,
                                               name=ADDRESS_NAME).execute()
            ext_ip_address = response['address']
            print('Setting up files ...')

            print('Find bucket {}'.format(NOTEBOOK_VM_BUCKET))
            client = storage.Client()
            bucket = client.lookup_bucket(NOTEBOOK_VM_BUCKET)
            # bucket_list= client.list_buckets(project=gcp_project_id, prefix=NOTEBOOK_VM_BUCKET)
            # gcs_service = get_storage_resource()
            # response = gcs_service.buckets().list(project=gcp_project_id).execute()
            # pprint(response)
            found_bucket = False

            # bucket_list = response['items']
            # for bucket in bucket_list:
            #     if bucket['name'] == NOTEBOOK_VM_BUCKET:
            #         found_bucket = True
            #         print('Bucket {bucket_name} found'.format(bucket_name=NOTEBOOK_VM_BUCKET))
            #         break
            if not bucket:
            # if not found_bucket:
                print('Creating a new bucket {bucket_name}'.format(bucket_name=NOTEBOOK_VM_BUCKET))
                # gcs_service.buckets().insert(project=gcp_project_id, body={'name': NOTEBOOK_VM_BUCKET}).execute()
                bucket = client.create_bucket(bucket_or_name=NOTEBOOK_VM_BUCKET, project=gcp_project_id)
            print('Upload files to bucket {bucket_name}'.format(bucket_name=NOTEBOOK_VM_BUCKET))
            # client = storage.Client()

            CERT_SUBJ_FILENAME = 'certSubj.txt'
            PASSHASH_FILENAME = 'passhash.txt'
            ENV_VARS_SH_FILE = 'setEnvVars.sh'
            STARTUP_SH_FILE = 'start_script.sh'
            CPU_LOGGER_FILE = 'cpuLogger.sh'
            IDLE_LOG_FILE = 'idle_checker.py'
            IDLE_LOG_SH_FILE = 'idle_log_wrapper.sh'
            IDLE_SHUTDOWN_FILE = 'idle_shutdown.py'
            IDLE_SHUTDOWN_SH_FILE='shutdown_wrapper.sh'
            CMD_SERVER_FILE = 'cmd_server.py'
            # CMD_SERVER_SH_FILE = 'cmd_server_wrapper.sh'

            upload_blob_string(bucket, CERT_SUBJ + ext_ip_address, CERT_SUBJ_FILENAME)


            hashpass = hash.hash_it(PASSWORD_1)
            upload_blob_string(bucket, hashpass, PASSHASH_FILENAME)

            BASE_DIR = os.path.dirname(os.path.dirname(__file__))
            NOTEBOOK_VM_SHELL_DIR = 'notebooks/vm_shell'
            env_vars_head = 'PROJECT={project_id}\nUSER_NAME={user_name}\nFIREWALL_IP_RANGE={ip_range}\n'.format(
                project_id=gcp_project_id, user_name=vm_username, ip_range=','.join(FIREWALL_IP_RANGE))
            env_vars_filepath = '{base_dir}/{sub_dir}/{filename}'.format(base_dir=BASE_DIR, sub_dir=NOTEBOOK_VM_SHELL_DIR,
                                                               filename=(ENV_VARS_SH_FILE + '.temp'))
            env_vars_sh=append_file_to_string(env_vars_head, env_vars_filepath)
            upload_blob_string(bucket, env_vars_sh, ENV_VARS_SH_FILE)


            script_head = 'GCLOUD_BUCKET={}\n'.format(NOTEBOOK_VM_BUCKET)
            script_filepath = '{base_dir}/{sub_dir}/{filename}'.format(base_dir=BASE_DIR, sub_dir=NOTEBOOK_VM_SHELL_DIR,
                                                                filename=(STARTUP_SH_FILE + '.temp'))
            startup_sh = append_file_to_string(script_head, script_filepath)
            upload_blob_string(bucket, startup_sh, STARTUP_SH_FILE)

            upload_filenames = [CPU_LOGGER_FILE, IDLE_LOG_FILE, IDLE_LOG_SH_FILE, IDLE_SHUTDOWN_FILE, IDLE_SHUTDOWN_SH_FILE, CMD_SERVER_FILE]
            for filename in upload_filenames:
                upload_blob_filename(bucket,
                        '{base_dir}/{sub_dir}/{filename}'.format(base_dir=BASE_DIR, sub_dir=NOTEBOOK_VM_SHELL_DIR,
                                                                 filename=filename), filename)
            setup_stage = SETUP_INSTANCE

        if setup_stage == SETUP_INSTANCE:
            print('Setting a VM instance ...')
            response = build_instances_request(method=INSTANCES_LIST, project_id=gcp_project_id, zone=vm_zone,
                                               name=machine_name).execute()
            instance_settings = None
            if 'items' in response:
                instance_settings = response['items'][0]
                print('Existing VM instance {} found. STATUS: {}'.format(machine_name, instance_settings['status']))
                if instance_settings['status'] == 'TERMINATED':
                    print('Starting a VM instance ...')
                    response = build_instances_request(method=INSTANCES_START, project_id=gcp_project_id, zone=vm_zone,
                                                   name=machine_name).execute()
            else:
                print('Create and start up a new VM instance')
                # create a new instance
                instance_body = {
                    'name': machine_name,
                    'machineType': 'zones/{zone}/machineTypes/{machine_type}'.format(zone=vm_zone,
                                                                                     machine_type=MACHINE_TYPE),
                    'description': MACHINE_DESC,
                    'disks': [
                        {
                            'boot': True,
                            'initializeParams': {
                                'sourceImage': 'projects/debian-cloud/global/images/family/debian-9',
                                'diskSizeGb': DISK_SIZE
                            }
                        }
                    ],
                    'serviceAccounts': [
                        {

                            'scopes': ['https://www.googleapis.com/auth/bigquery',
                                       'https://www.googleapis.com/auth/devstorage.read_write',
                                       'https://www.googleapis.com/auth/monitoring']
                        }
                    ],
                    'networkInterfaces': [
                        {
                            'accessConfigs': [
                                {
                                    'natIP': ext_ip_address
                                }
                            ]
                        }
                    ],
                    'tags': {
                        'items': [FIREWALL_TAG]
                    },
                    'metadata': {
                        "items": [
                            {'key': 'startup-script-url',
                             'value': 'gs://{}/start_script.sh'.format(NOTEBOOK_VM_BUCKET)
                             }
                        ]
                    }

                }
                response = build_instances_request(method=INSTANCES_CREATE, project_id=gcp_project_id, zone=vm_zone,
                                                   body=instance_body).execute()
                if 'error' not in response:
                    instance_settings = response
            if instance_settings is not None and instance_settings['status'] != 'RUNNING':
            # todo: wait until instance is running
                print('instance status: {}'.format(instance_settings['status']))
            # else:
            #     setup_stage = SETUP_VM_PASSWORD
        if setup_stage == SETUP_VM_PASSWORD:
            print('Setting up VM password ...')
            if PASSWORD_1 == PASSWORD_2:
                print('password checking')

            # try:
            #     ssh = paramiko.SSHClient()
            #     ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            #     ssh.connect(EXTR_ADDR)
            #     print('success!')
            #     # Close SSH connection
            #     ssh.close()
            #     # return
            # except paramiko.AuthenticationException:
            #     print("Authentication failed when connecting to %s" % EXTR_ADDR)
            #     response = { 'error' : {
            #                     'message' : 'Authentication failed when connecting to {}'.format(EXTR_ADDR),
            #                     'code' : '400'
            #                 }
            #     }
            # sys.exit(1)
            # except:
            #     response = {'error': {
            #             'message': 'Could not SSH to {}, waiting for it to start'.format(EXTR_ADDR),
            #             'code' : '400'
            #         }
            #     }
            #
            #     print("Could not SSH to %s, waiting for it to start" % EXTR_ADDR)
            #     # i += 1
            #     # time.sleep(2)

            # hash_code = hash.hash_it(PASSWORD_1)
            # response = service.instance()
            #
            # compute
            # scp
            # passhash.txt ${USER_AND_MACHINE}: --zone ${vm_zone} - -project ${PROJECT}
            else:
                print('re-iterate password entry')
        if 'error' in response:
            result = {
                'message': 'There was an error while setting up for the {}: {}'.format(STAGE_TITLES[setup_stage], response['error']['message'])
            }
            resp_code = response['error']['code']

    except HttpError as e:
        result = {
            'message': 'There was an error while setting up for the {}: {}'.format(STAGE_TITLES[setup_stage],
                                                                                   e._get_reason())
            # 'message': 'There was an error in the process of setting up the VM: {}'.format(e.resp.status)
        }
        resp_code = e.resp.status
        logger.error("[ERROR] "+result['message'])
        logger.exception(e)
    if resp_code == '200':
        result = {'message': 'hello'}

    return result

def build_firewalls_request(method, project_id, firewall_rule_name=None, firewall_body=None):
    firewall_service = get_compute_resource().firewalls()
    if method == FIREWALLS_LIST:
        return firewall_service.list(project=project_id, filter='name={}'.format(firewall_rule_name))
    elif method == FIREWALLS_UPDATE:
        return firewall_service.update(project=project_id, firewall=firewall_rule_name, body=firewall_body)
    elif method == FIREWALLS_CREATE:
        return firewall_service.insert(project=project_id, body=firewall_body)
    elif method == FIREWALLS_DELETE:
        return firewall_service.delete(project=project_id, firewall=firewall_rule_name)


def build_addresses_request(method, project_id, region, name=None):
    addresses_service = get_compute_resource().addresses()
    if method == ADDRESSES_LIST:
        return addresses_service.list(project=project_id, region=region, filter='name =' + name)
    elif method == ADDRESSES_GET:
        return addresses_service.get(project=project_id, region=region, address=name)
    elif method == ADDRESSES_CREATE:
        return addresses_service.insert(project=project_id, region=region, body={'name': name})
    elif method == ADDRESSES_DELETE:
        return addresses_service.delete(project=project_id, region=region, address=name)


def build_instances_request(method, project_id, zone, name=None, body=None):
    instances_service = get_compute_resource().instances()
    if method == INSTANCES_LIST:
        return instances_service.list(project=project_id, zone=zone, filter='name={}'.format(name))
    # elif method == INSTANCES_GET:
    #     return instances_service.get(project=project_id, zone=zone, address=name)
    elif method == INSTANCES_CREATE:
        return instances_service.insert(project=project_id, zone=zone, body=body)
    elif method == INSTANCES_START:
        return instances_service.start(project=project_id, zone=zone, instance=name)
    elif method == INSTANCES_STOP:
        return instances_service.stop(project=project_id, zone=zone, instance=name)
    elif method == INSTANCES_DELETE:
        return instances_service.delete(project=project_id, zone=zone, instance=name)


# def create_file(self, filename):
# """Create a file.
# The retry_params specified in the open call will override the default
# retry params for this particular file handle.
# Args:
#   filename: filename.
# """
# self.response.write('Creating file %s\n' % filename)
#
# write_retry_params = cloudstorage.RetryParams(backoff_factor=1.1)
# gcs_file = cloudstorage.open(filename,
#                     'w',
#                     content_type='text/plain',
#                     retry_params=write_retry_params)
# gcs_file.write('abcde\n')
# gcs_file.write('f'*1024*4 + '\n')
# gcs_file.close()
# self.tmp_filenames_to_clean_up.append(filename)

# def update_firewall(service, project_id, firewall_rule_name, firewall_body):
#     response = service.firewalls().update(project=project_id, firewall=firewall_rule_name, body=firewall_body).execute()
#     return response
#
# def delete_firewall(service, project_id, firewall_rule_name, firewall_body):
#     response = service.firewalls().delete(project=project_id, firewall=firewall_rule_name).execute()
#     return response
def append_file_to_string(head_str, filepath):

    # with open('{base_dir}/{sub_dir}/{filename}'.format(base_dir=BASE_DIR, sub_dir=NOTEBOOK_VM_SHELL_DIR,
    #                                                    filename=(ENV_VARS_SH_FILE + '.temp')), mode='r') as f:
    with open(filepath, mode='r') as f:
        read_data = f.read()
        head_str += read_data
    f.closed
    return head_str

def upload_blob_filename(bucket, source_file_name, destination_blob_name):
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_filename(source_file_name)
    print('File {} uploaded to {}.'.format(
        source_file_name,
        destination_blob_name))

def upload_blob_string(bucket, file_str, destination_blob_name):
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_string(file_str)

    print('File uploaded to {}.'.format(destination_blob_name))

def stop_vm():
    print('stop_vm() called')
    # resp_code = 200
    try:
        print('Stopping Instance ...')
        build_instances_request(method=INSTANCES_STOP, project_id=gcp_project_id, zone=vm_zone,
                                           name=machine_name).execute()

        result = {'message': 'Instance {} is stopped.'.format(machine_name)}
    except HttpError as e:
        result = {
            'message': 'There was an error while stopping instance {name}: {msg}'.format(name=machine_name,
                                                                                   msg=e._get_reason())
        }
        # resp_code = e.resp.status
        logger.error("[ERROR] "+result['message'])
        logger.exception(e)
    return result

def delete_vm():
    print('delete_vm() called')
    try:
        print('Deleting Instance ...')
        build_instances_request(method=INSTANCES_DELETE, project_id=gcp_project_id, zone=vm_zone,
                                name=machine_name).execute()

        result = {'message': 'Instance {} is deleted.'.format(machine_name)}
    except HttpError as e:
        result = {
            'message': 'There was an error while deleting instance {name}: {msg}'.format(name=machine_name,
                                                                                         msg=e._get_reason())
        }
        logger.error("[ERROR] " + result['message'])
        logger.exception(e)
    return result


