import logging
from django.conf import settings
from google_helpers.compute_service import get_compute_resource
# from google.api_core.exceptions import NotFound, GoogleAPICallError
from googleapiclient.errors import HttpError
from googleapiclient.discovery import build
from oauth2client.client import GoogleCredentials
from google.cloud import storage
    # , pubsub_v1
import httplib2
import os
import time
import json
from .utils import hash

# import requests
# from requests.exceptions import ConnectionError

VM_STAT_RUNNING = 'RUNNING'
VM_STAT_NOT_FOUND = 'NOT FOUND'

# from google.cloud import storage, exceptions
# import cloudstorage
# from pprint import pprint



# from scp import SCPClient

STAGE_TITLES = ['project', 'firewall', 'external IP', 'monitoring service', 'files', 'VM Instance']
    # , 'Pub/Sub']
# 'password',
# 'firewall deletion', 'external IP address deletion', 'instance initiation']
SETUP_PROJECT = 0
SETUP_FIREWALL = 1
SETUP_EXTERNAL_IP = 2
SETUP_MONITOR = 3
SETUP_FILES = 4
SETUP_INSTANCE = 5
# SETUP_PUBSUB = 6

# SETUP_VM_PASSWORD = 6
# DELETE_FIREWALL = 7
# DELETE_ADDRESS = 8
# START_INSTANCE = 7
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
# gcp_project_id = 'cgc-05-0038'  # todo: retrieve from UI
# vm_zone = 'us-central1-c'
# vm_username = 'elee'  #todo: retrieve from UI
# machine_name = vm_username + '-unique-machine-name-1'

logger = logging.getLogger('main_logger')


def start_vm(project_id, zone, vm_username, vm_name, firewall_rule_name, firewall_ip_range, serv_port, region, address_name, password, topic_name=None):
    setup_stage = SETUP_PROJECT
    firewall_tag = vm_username + '-restricted-jupyter'
    notebook_gs_bucket = vm_username + '-notebook-vm'


    # Choose one format and change to your IP range for your desktop:
    # firewall_ip_range = ['71.231.138.210']  # todo: have this value set programatically

    # firewall_ip_range = ['174.127.185.135', '174.127.185.130']  # todo: have this value set programatically
    DISK_SIZE = 30
    MACHINE_TYPE = 'n1-standard-1'

    # SERV_PORT = '5000'  # port for jupyter notebook
    # SERV_PORT2 = '9000'  # port for filemanager server
    machine_desc = 'Jupyter Notebook Server for ' + vm_username

    CERT_SUBJ = '/C=US/ST=MyState/L=MyCity/O=MyInstitution/OU=MyDepartment/CN='
    NEED_API = 'monitoring.googleapis.com'
    project_no = None

    ext_ip_address = None
    resp_code = 200
    result = {}

    try:
        compute = get_compute_resource()
        if setup_stage == SETUP_PROJECT:
            print('Validating Project ID ...')
            credentials = GoogleCredentials.get_application_default()
            service = build('cloudresourcemanager', 'v1', credentials=credentials)
            response = service.projects().list(filter='projectId={}'.format(project_id)).execute()
            if 'projects' in response:
                project_no = response['projects'][0]['projectNumber']
                setup_stage = SETUP_FIREWALL
                print('Project ID has been validated')
            else:
                resp_code = 500
                result = {
                    'message': 'Unable to find project ID [{}]'.format(project_id)
                }

        if setup_stage == SETUP_FIREWALL:
            # check if firewall exists
            print('Setup a firewall ...')
            response = build_firewalls_request(compute=compute, method=FIREWALLS_LIST, project_id=project_id,
                                               firewall_rule_name=firewall_rule_name).execute()
            firewall_body = {
                'allowed': [{
                    # 'ports': [SERV_PORT1, SERV_PORT2],
                    'ports': [serv_port],
                    'IPProtocol': 'tcp'
                }],
                'targetTags': [firewall_tag],
                'sourceRanges': firewall_ip_range,
                'description': firewall_rule_name
            }
            if 'items' in response:
                print('Found existing firewall [{}].'.format(firewall_rule_name))
                # update
                resp_body = response['items'][0]
                need_fw_update = False

                for attr in firewall_body.keys():
                    if attr not in resp_body or resp_body[attr] != firewall_body[attr]:
                        need_fw_update = True
                        break
                if need_fw_update:
                    print('Updating firewall [{}] properties.'.format(firewall_rule_name))
                    response = build_firewalls_request(compute=compute, method=FIREWALLS_UPDATE, project_id=project_id,
                                                       firewall_rule_name=firewall_rule_name,
                                                       firewall_body=firewall_body).execute()
                    # todo: prompt user if they want to update the values
            else:
                # create a new firewall rule
                print('Creating a new firewall [{}].'.format(firewall_rule_name))
                firewall_body['name'] = firewall_rule_name
                response = build_firewalls_request(compute=compute, method=FIREWALLS_CREATE, project_id=project_id,
                                                   firewall_rule_name=firewall_rule_name,
                                                   firewall_body=firewall_body).execute()
                wait_for_operation(compute=compute, project=project_id, operation=response['name'])
            if 'error' in response:
                result = {
                    'message': 'There was an error setting up a firewall [{}]: {}'.format(firewall_rule_name,
                                                                                          response['error'][
                                                                                              'message'])
                }
                resp_code = response['error']['code']
            else:
                setup_stage = SETUP_EXTERNAL_IP

        if setup_stage == SETUP_EXTERNAL_IP:
            print('Setup External IP address')
            response = build_addresses_request(compute=compute, method=ADDRESSES_LIST, project_id=project_id,
                                               region=region,
                                               name=address_name).execute()

            if 'items' not in response:
                print('Creating a new external IP address')
                response = build_addresses_request(compute=compute, method=ADDRESSES_CREATE, project_id=project_id,
                                                   region=region,
                                                   name=address_name).execute()
                wait_for_operation(compute=compute, project=project_id, operation=response['name'], region=region)

            if 'error' in response:
                result = {
                    'message': 'There was an error setting up an external IP address [{}]: {}'.format(address_name,
                                                                                                     response[
                                                                                                         'error'][
                                                                                                         'message'])
                }
                resp_code = response['error']['code']
            else:
                setup_stage = SETUP_MONITOR

        if setup_stage == SETUP_MONITOR:
            print('Set monitoring service ...')
            SERVICE_USAGE_SCOPES = ['https://www.googleapis.com/auth/cloud-platform',
                                    'https://www.googleapis.com/auth/cloud-platform.read-only']
            credentials = GoogleCredentials.from_stream(settings.GOOGLE_APPLICATION_CREDENTIALS).create_scoped(
                SERVICE_USAGE_SCOPES)
            http = credentials.authorize(httplib2.Http())
            su_service = build('serviceusage', 'v1', http=http, cache_discovery=False)

            response = su_service.services().list(parent='projects/{}'.format(project_no), filter='state:ENABLED'
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
                    name='projects/{}/services/{}'.format(project_no, NEED_API), body={}).execute()

            if 'error' in response:
                result = {
                    'message': 'There was an error while setting the monitoring service [{}] : {}'.format(NEED_API,
                                                                                                          response[
                                                                                                              'error'][
                                                                                                              'message'])
                }
                resp_code = response['error']['code']
            else:
                setup_stage = SETUP_FILES
        if setup_stage == SETUP_FILES:
            response = build_addresses_request(compute=compute, method=ADDRESSES_GET, project_id=project_id,
                                               region=region,
                                               name=address_name).execute()
            ext_ip_address = response['address']
            print('Setting up files ...')

            print('Find bucket {}'.format(notebook_gs_bucket))
            client = storage.Client()
            bucket = client.lookup_bucket(notebook_gs_bucket)

            if not bucket:
                print('Creating a new bucket {bucket_name}'.format(bucket_name=notebook_gs_bucket))
                bucket = client.create_bucket(bucket_or_name=notebook_gs_bucket, project=project_id)
            print('Upload files to bucket {bucket_name}'.format(bucket_name=notebook_gs_bucket))

            CERT_SUBJ_FILENAME = 'certSubj.txt'
            PASSHASH_FILENAME = 'passhash.txt'
            ENV_VARS_SH_FILE = 'setEnvVars.sh'
            STARTUP_SH_FILE = 'startup.sh'
            CPU_LOGGER_FILE = 'cpuLogger.sh'
            IDLE_LOG_FILE = 'idle_checker.py'
            IDLE_LOG_SH_FILE = 'idle_log_wrapper.sh'
            IDLE_SHUTDOWN_FILE = 'idle_shutdown.py'
            IDLE_SHUTDOWN_SH_FILE = 'shutdown_wrapper.sh'
            # CMD_SERVER_FILE = 'cmd_server.py'
            INSTALL_SH_FILE = 'install.sh'

            upload_blob_string(bucket, CERT_SUBJ + ext_ip_address, CERT_SUBJ_FILENAME)
            hashpass = hash.hash_it(password)
            upload_blob_string(bucket, hashpass, PASSHASH_FILENAME)

            BASE_DIR = os.path.dirname(os.path.dirname(__file__))
            NOTEBOOK_VM_SHELL_DIR = 'shell/notebooks_vm_script'
            # NOTEBOOK_VM_SHELL_DIR = 'notebooks/vm_shell'
            env_vars_head = 'PROJECT={project_id}\nUSER_NAME={user_name}\nfirewall_ip_range={ip_range}\n'.format(
                project_id=project_id, user_name=vm_username, ip_range=','.join(firewall_ip_range))
            env_vars_filepath = '{base_dir}/{sub_dir}/{filename}'.format(base_dir=BASE_DIR,
                                                                         sub_dir=NOTEBOOK_VM_SHELL_DIR,
                                                                         filename=(ENV_VARS_SH_FILE + '.temp'))
            env_vars_sh = append_file_to_string(env_vars_head, env_vars_filepath)
            upload_blob_string(bucket, env_vars_sh, ENV_VARS_SH_FILE)

            upload_filenames = [CPU_LOGGER_FILE, IDLE_LOG_FILE, IDLE_LOG_SH_FILE, IDLE_SHUTDOWN_FILE,
                                IDLE_SHUTDOWN_SH_FILE, INSTALL_SH_FILE]
                                # IDLE_SHUTDOWN_SH_FILE, CMD_SERVER_FILE, INSTALL_SH_FILE]
            for filename in upload_filenames:
                upload_blob_filename(bucket,
                                     '{base_dir}/{sub_dir}/{filename}'.format(base_dir=BASE_DIR,
                                                                              sub_dir=NOTEBOOK_VM_SHELL_DIR,
                                                                              filename=filename), filename)
            setup_stage = SETUP_INSTANCE

        if setup_stage == SETUP_INSTANCE:
            print('Setting a VM instance ...')
            response = build_instances_request(compute=compute, method=INSTANCES_LIST, project_id=project_id, zone=zone,
                                               name=vm_name).execute()
            # instance_settings = None
            if 'items' in response:
                instance_settings = response['items'][0]
                print('Existing VM instance {} found. STATUS: {}'.format(vm_name, instance_settings['status']))
                if instance_settings['status'] == 'TERMINATED':  # todo: handle other status as well and wait
                    print('Starting a VM instance ...')
                    response = build_instances_request(compute=compute, method=INSTANCES_START, project_id=project_id,
                                                       zone=zone,
                                                       name=vm_name).execute()
            else:
                print('Create and start up a new VM instance')
                instance_body = {
                    'name': vm_name,
                    'machineType': 'zones/{zone}/machineTypes/{machine_type}'.format(zone=zone,
                                                                                     machine_type=MACHINE_TYPE),
                    'description': machine_desc,
                    'disks': [
                        {
                            'boot': True,
                            'autoDelete': True,
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
                        'items': [firewall_tag]
                    },
                    'metadata': {
                        "items": [
                            {
                                "key": "NOTEBOOK_GS_BUCKET",
                                "value": notebook_gs_bucket
                            },
                            {
                                "key": "startup-script",
                                "value": append_file_to_string('', '{base_dir}/{sub_dir}/{filename}'.format(
                                    base_dir=BASE_DIR, sub_dir=NOTEBOOK_VM_SHELL_DIR,
                                    filename=STARTUP_SH_FILE))
                            }
                        ]
                    }

                }
                response = build_instances_request(compute=compute, method=INSTANCES_CREATE, project_id=project_id,
                                                   zone=zone,
                                                   body=instance_body).execute()

            if 'name' in response:
                wait_for_operation(compute=compute, project=project_id, operation=response['name'], zone=zone)
                if topic_name:
                    time.sleep(120)  # sleep for at least 90 seconds
                    # setup_stage = SETUP_PUBSUB

            # wait for the server to to run
            # count = 0
            # while True:
            #     count += 1
            #     print('count {}'.format(count))
            #     notebook_vm_url = 'https://{ext_ip_address}:{port}'.format(ext_ip_address=ext_ip_address, port=serv_port)
            #     try:
            #         notebook_resp = requests.get(notebook_vm_url, verify=False)
            #         if notebook_resp.status_code == 200:
            #             print('done')
            #             setup_stage = SETUP_PUBSUB
            #             break
            #
            #     except ConnectionError as ce:
            #         print('ConnectionError')
            #         resp_code = 200
            #         result = {'message': 'Instance has started but was unable to access website.'.format(vm_name),
            #                                 'ext_ip_address': ext_ip_address}
            #         break
            #         # pass
            #     time.sleep(1)
        # if setup_stage == SETUP_PUBSUB:
        #     print('Setup Pub/Sub ...')
        #     # delete topic if exists
        #     publisher = pubsub_v1.PublisherClient()
        #     topic_path = publisher.topic_path(project_id, topic_name)
        #     try:
        #         publisher.get_topic(topic_path)
        #     except GoogleAPICallError:
        #         print('Creating a Pub/Sub topic ...')
        #         publisher.create_topic(topic_path)


            # for n in range(1, 3):
            #     data = u'Message number {}'.format(n)
            #     # Data must be a bytestring
            #     data = data.encode('utf-8')
            #     # When you publish a message, the client returns a Future.
            #     message_future = publisher.publish(topic_path, data=data)
            #     message_future.add_done_callback(pubsub_callback, topic_name=topic_name)
            # print('Published message IDs:')

    except HttpError as e:
        content = json.loads(e.content.decode('utf-8'))
        reason = content['error']['message']
        resp_code = e.resp.status
        result = {
            'message': 'There was an error while setting up for the {}: {}'.format(STAGE_TITLES[setup_stage],
                                                                                   reason)
        }
        logger.error("[ERROR] " + result['message'])
        logger.exception(e)


    if resp_code == 200 and not result:
        result = { 'message': 'Instance has started.', 'ext_ip_address': ext_ip_address }
    # else:
    #     result = {'message': 'Instance has started but was unable to access website.'.format(vm_name),
    #               'ext_ip_address': ext_ip_address}
    result['resp_code'] = resp_code
    return result


def build_firewalls_request(compute, method, project_id, firewall_rule_name=None, firewall_body=None):
    firewall_service = compute.firewalls()
    if method == FIREWALLS_LIST:
        return firewall_service.list(project=project_id, filter='name={}'.format(firewall_rule_name))
    elif method == FIREWALLS_UPDATE:
        return firewall_service.update(project=project_id, firewall=firewall_rule_name, body=firewall_body)
    elif method == FIREWALLS_CREATE:
        return firewall_service.insert(project=project_id, body=firewall_body)
    elif method == FIREWALLS_DELETE:
        return firewall_service.delete(project=project_id, firewall=firewall_rule_name)


def build_addresses_request(compute, method, project_id, region, name=None):
    addresses_service = compute.addresses()
    if method == ADDRESSES_LIST:
        return addresses_service.list(project=project_id, region=region, filter='name =' + name)
    elif method == ADDRESSES_GET:
        return addresses_service.get(project=project_id, region=region, address=name)
    elif method == ADDRESSES_CREATE:
        return addresses_service.insert(project=project_id, region=region, body={'name': name})
    elif method == ADDRESSES_DELETE:
        return addresses_service.delete(project=project_id, region=region, address=name)


def build_instances_request(compute, method, project_id, zone, name=None, body=None):
    instances_service = compute.instances()
    if method == INSTANCES_LIST:
        return instances_service.list(project=project_id, zone=zone, filter='name={}'.format(name))
    elif method == INSTANCES_CREATE:
        return instances_service.insert(project=project_id, zone=zone, body=body)
    elif method == INSTANCES_START:
        return instances_service.start(project=project_id, zone=zone, instance=name)
    elif method == INSTANCES_STOP:
        return instances_service.stop(project=project_id, zone=zone, instance=name)
    elif method == INSTANCES_DELETE:
        return instances_service.delete(project=project_id, zone=zone, instance=name)


def append_file_to_string(head_str, filepath):
    with open(filepath, mode='r') as f:
        read_data = f.read()
        head_str += read_data
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


def get_vm_external_ip(project_id, region, address_name):
    print('get_vm_external_ip() called')
    resp_code = 200
    compute = get_compute_resource()

    try:
        print('Getting external IP address ...')
        operation = build_addresses_request(compute=compute, method=ADDRESSES_GET, project_id=project_id,
                                           region=region,
                                           name=address_name).execute()

        # wait_for_operation(compute=compute, project=project_id, region=region, operation=operation['name'])
        result = { 'external_ip': operation['address'] }
    except HttpError as e:
        result = {
            'message': 'There was an error while retrieving external IP address [{name}]: {msg}'.format(name=address_name,
                                                                                         msg=e._get_reason())
        }
        resp_code = e.resp.status
        logger.error("[ERROR] " + result['message'])
        logger.exception(e)
    result['resp_code'] = resp_code
    return result

def pubsub_callback(message_future, topic_name):
    # When timeout is unspecified, the exception method waits indefinitely.
    if message_future.exception(timeout=30):
        print('Publishing message on {} threw an Exception {}.'.format(
            topic_name, message_future.exception()))
    else:
        print(message_future.result())

# def delete_pubsub_topic(project_id, topic_name):
#     publisher = pubsub_v1.PublisherClient()
#     topic_path = publisher.topic_path(project_id, topic_name)
#     # delete topic if exists
#     publisher.delete_topic(topic_path)





def stop_vm(project_id, zone, vm_name):
    print('stop_vm() called')
    resp_code = 200
    compute = get_compute_resource()
    try:
        print('Stopping Instance ...')
        operation = build_instances_request(compute=compute, method=INSTANCES_STOP, project_id=project_id, zone=zone,
                                            name=vm_name).execute()
        wait_for_operation(compute=compute, project=project_id, zone=zone, operation=operation['name'])

        result = {'message': 'Instance has stopped.'}
    except HttpError as e:
        result = {
            'message': 'There was an error while stopping instance [{name}]: {msg}'.format(name=vm_name,
                                                                                         msg=e._get_reason())
        }
        resp_code = e.resp.status
        logger.error("[ERROR] " + result['message'])
        logger.exception(e)
    result['resp_code'] = resp_code
    return result


def delete_vm(project_id, zone, vm_name, firewall_rule_name, region, address_name, topic_name):
    print('delete_vm() called')
    compute = get_compute_resource()
    resp_code = 200
    try:
        print('Deleting Instance ...')
        operation = build_instances_request(compute=compute, method=INSTANCES_DELETE, project_id=project_id, zone=zone,
                                            name=vm_name).execute()
        wait_for_operation(compute=compute, project=project_id, operation=operation['name'], zone=zone)

        print('Remove Firewall ...')
        operation = build_firewalls_request(compute=compute, method=FIREWALLS_DELETE, project_id=project_id,
                                            firewall_rule_name=firewall_rule_name).execute()
        wait_for_operation(compute=compute, project=project_id, operation=operation['name'])

        print('Deleting External IP address ...')
        operation = build_addresses_request(compute=compute, method=ADDRESSES_DELETE, project_id=project_id,
                                            region=region, name=address_name).execute()
        wait_for_operation(compute=compute, project=project_id, operation=operation['name'], region=region)

        # print('Deleting PubSub Topic ...')
        # try:
        #     publisher = pubsub_v1.PublisherClient()
        #     topic_path = publisher.topic_path(project_id, topic_name)
        #     # delete topic if exists
        #     publisher.delete_topic(topic_path)
        #     # delete_pubsub_topic(project_id=project_id, topic_name=topic_name)
        # except NotFound:
        #     pass

        result = {'message': 'Instance is deleted.'}

        #todo: delete topic

    except HttpError as e:
        result = {
            'message': 'There was an error while deleting instance {name}: {msg}'.format(name=vm_name,
                                                                                         msg=e._get_reason())
        }
        resp_code = e.resp.status
        logger.error("[ERROR] " + result['message'])
        logger.exception(e)
    result['resp_code'] = resp_code
    return result


def check_vm_stat(project_id, zone, vm_name):
    compute = get_compute_resource()
    resp_code = 200
    print('check_vm_stat() called')
    try:
        print('Check Instance ...')
        response = build_instances_request(compute=compute, method=INSTANCES_LIST, project_id=project_id, zone=zone,
                                           name=vm_name).execute()
        if 'items' in response:
            instance_settings = response['items'][0]
            vm_status = instance_settings['status']
        else:
            vm_status = VM_STAT_NOT_FOUND
            resp_code = 500
    except HttpError as e:
        vm_status = 'ERROR'
        resp_code = e.resp.status
        logger.error('There was an error while finding instance {name}: {msg}'.format(name=vm_name,
                                                                                      msg=e._get_reason()))
        logger.exception(e)
    return {'status': vm_status, 'resp_code': resp_code}


def wait_for_operation(compute, project, operation, zone=None, region=None):
    print('Waiting for operation to finish...')
    while True:
        if zone:
            result = compute.zoneOperations().get(
                project=project,
                zone=zone,
                operation=operation).execute()
        elif region:
            result = compute.regionOperations().get(
                project=project,
                region=region,
                operation=operation).execute()
        else:
            result = compute.globalOperations().get(
                project=project,
                operation=operation).execute()
        if result['status'] == 'DONE':
            print("done.")
            if 'error' in result:
                raise Exception(result['error'])
            return result
        time.sleep(1)
