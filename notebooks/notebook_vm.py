import logging
import httplib2
import os
import time
import json
from django.conf import settings
from google_helpers.compute_service import get_compute_resource
from googleapiclient.errors import HttpError
from googleapiclient.discovery import build
from oauth2client.client import GoogleCredentials
from google.cloud import storage
from .hash import hash_it
# from .utils import hash
# here = os.path.dirname(os.path.abspath(__file__))
# print('path: {}'.format(os.path.relpath(storage.__file__, here)))

VM_STAT_RUNNING = 'RUNNING'
VM_STAT_NOT_FOUND = 'NOT FOUND'
STAGE_TITLES = ['project', 'firewall', 'external IP', 'monitoring service', 'files', 'VM Instance']

SETUP_PROJECT = 0
SETUP_FIREWALL = 1
SETUP_EXTERNAL_IP = 2
SETUP_MONITOR = 3
SETUP_FILES = 4
SETUP_INSTANCE = 5
# SETUP_PUBSUB = 6

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
DISK_SIZE = 30
MACHINE_TYPE = 'n1-standard-1'
CERT_SUBJ = '/C=US/ST=MyState/L=MyCity/O=MyInstitution/OU=MyDepartment/CN='
NEED_API = 'monitoring.googleapis.com'
SERVICE_USAGE_SCOPES = ['https://www.googleapis.com/auth/cloud-platform',
                                    'https://www.googleapis.com/auth/cloud-platform.read-only']

CERT_SUBJ_FILENAME = 'certSubj.txt'
PASSHASH_FILENAME = 'passhash.txt'
ENV_VARS_SH_FILE = 'setEnvVars.sh'
STARTUP_SH_FILE = 'startup.sh'
CPU_LOGGER_FILE = 'cpuLogger.sh'
IDLE_LOG_FILE = 'idle_checker.py'
IDLE_LOG_SH_FILE = 'idle_log_wrapper.sh'
IDLE_SHUTDOWN_FILE = 'idle_shutdown.py'
IDLE_SHUTDOWN_SH_FILE = 'shutdown_wrapper.sh'
INSTALL_SH_FILE = 'install.sh'

NOTEBOOK_VM_SHELL_DIR = 'shell/notebooks_vm_script'
logger = logging.getLogger('main_logger')


def start_vm(project_id, zone, vm_username, vm_name, vm_header, firewall_rule_name, firewall_ip_range, serv_port, region,
             address_name, password, topic_name=None):
    setup_stage = SETUP_PROJECT
    firewall_tag = vm_header + '-restricted-jupyter'
    notebook_gs_bucket = vm_header + '-notebook-vm'
    machine_desc = 'Jupyter Notebook Server for ' + vm_username
    project_no = None
    ext_ip_address = None
    resp_code = 200
    result = {}
    try:
        compute = get_compute_resource()

        if setup_stage == SETUP_PROJECT:
            logger.debug('Validating Project ID ...')
            credentials = GoogleCredentials.get_application_default()
            service = build('cloudresourcemanager', 'v1', credentials=credentials)
            response = service.projects().list(filter='projectId={}'.format(project_id)).execute()
            if 'projects' in response:
                project_no = response['projects'][0]['projectNumber']
                setup_stage = SETUP_FIREWALL
                logger.debug('Project ID has been validated')
            else:
                resp_code = 500
                result = {
                    'message': 'Unable to find project ID [{}]'.format(project_id)
                }

        if setup_stage == SETUP_FIREWALL:
            # check if firewall exists
            logger.debug('Setup a firewall ...')
            response = build_firewalls_request(compute=compute, method=FIREWALLS_LIST, project_id=project_id,
                                               firewall_rule_name=firewall_rule_name).execute()
            firewall_body = {
                'allowed': [{
                    'ports': [serv_port],
                    'IPProtocol': 'tcp'
                }],
                'targetTags': [firewall_tag],
                'sourceRanges': firewall_ip_range,
                'description': firewall_rule_name
            }
            if 'items' in response:
                logger.debug('Found existing firewall [{}].'.format(firewall_rule_name))
                # update
                resp_body = response['items'][0]
                need_fw_update = False

                for attr in firewall_body.keys():
                    if attr not in resp_body or resp_body[attr] != firewall_body[attr]:
                        need_fw_update = True
                        break
                if need_fw_update:
                    logger.debug('Updating firewall [{}] properties.'.format(firewall_rule_name))
                    response = build_firewalls_request(compute=compute, method=FIREWALLS_UPDATE, project_id=project_id,
                                                       firewall_rule_name=firewall_rule_name,
                                                       firewall_body=firewall_body).execute()
            else:
                # create a new firewall rule
                logger.debug('Creating a new firewall [{}].'.format(firewall_rule_name))
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
            logger.debug('Setup External IP address')
            response = build_addresses_request(compute=compute, method=ADDRESSES_LIST, project_id=project_id,
                                               region=region,
                                               name=address_name).execute()
            if 'items' not in response:
                logger.debug('Creating a new external IP address')
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
            logger.debug('Set monitoring service ...')
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
                    logger.debug('Monitoring service is already enabled.')
                    need_su_update = False
                    break
            if need_su_update:
                logger.debug('Enabling monitoring service ...')
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
            logger.debug('Setting up files ...')

            logger.debug('Find bucket {}'.format(notebook_gs_bucket))
            client = storage.Client()
            bucket = client.lookup_bucket(notebook_gs_bucket)

            if not bucket:
                logger.debug('Creating a new bucket {bucket_name}'.format(bucket_name=notebook_gs_bucket))
                bucket = client.create_bucket(bucket_or_name=notebook_gs_bucket, project=project_id)
            logger.debug('Upload files to bucket {bucket_name}'.format(bucket_name=notebook_gs_bucket))

            upload_blob_string(bucket, CERT_SUBJ + ext_ip_address, CERT_SUBJ_FILENAME)
            hashpass = hash_it(password)
            upload_blob_string(bucket, hashpass, PASSHASH_FILENAME)
            env_vars_sh = "PROJECT={project_id}\n".format(project_id=project_id)
            env_vars_sh += "USER_NAME={vm_username}\n".format(vm_username=vm_username)
            env_vars_sh += "MACHINE_NAME={vm_name}\n".format(vm_name=vm_name)
            env_vars_sh += "SERV_PORT={serv_port}\n".format(serv_port=serv_port)
            upload_blob_string(bucket, env_vars_sh, ENV_VARS_SH_FILE)
            base_dir = os.path.dirname(os.path.dirname(__file__))
            upload_filenames = [CPU_LOGGER_FILE, IDLE_LOG_FILE, IDLE_LOG_SH_FILE, IDLE_SHUTDOWN_FILE,
                                IDLE_SHUTDOWN_SH_FILE, INSTALL_SH_FILE]
            for filename in upload_filenames:
                upload_blob_filename(bucket,
                                     '{base_dir}/{sub_dir}/{filename}'.format(base_dir=base_dir,
                                                                              sub_dir=NOTEBOOK_VM_SHELL_DIR,
                                                                              filename=filename), filename)
            setup_stage = SETUP_INSTANCE

        if setup_stage == SETUP_INSTANCE:
            logger.debug('Setting a VM instance ...')
            response = build_instances_request(compute=compute, method=INSTANCES_LIST, project_id=project_id, zone=zone,
                                               name=vm_name).execute()
            if 'items' in response:
                instance_settings = response['items'][0]
                logger.debug('Existing VM instance {} found. STATUS: {}'.format(vm_name, instance_settings['status']))
                if instance_settings['status'] == 'TERMINATED':  # todo: handle other status as well and wait
                    logger.debug('Starting a VM instance ...')
                    response = build_instances_request(compute=compute, method=INSTANCES_START, project_id=project_id,
                                                       zone=zone,
                                                       name=vm_name).execute()
            else:
                logger.debug('Create and start up a new VM instance')
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
                                    base_dir=base_dir, sub_dir=NOTEBOOK_VM_SHELL_DIR,
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
        # if setup_stage == SETUP_PUBSUB:
        #     logger.debug('Setup Pub/Sub ...')
        #     # delete topic if exists
        #     publisher = pubsub_v1.PublisherClient()
        #     topic_path = publisher.topic_path(project_id, topic_name)
        #     try:
        #         publisher.get_topic(topic_path)
        #     except GoogleAPICallError:
        #         logger.debug('Creating a Pub/Sub topic ...')
        #         publisher.create_topic(topic_path)

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
        result = {'message': 'Instance has started.', 'ext_ip_address': ext_ip_address}
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
    logger.debug('File {} uploaded to {}.'.format(
        source_file_name,
        destination_blob_name))


def upload_blob_string(bucket, file_str, destination_blob_name):
    blob = bucket.blob(destination_blob_name)
    blob.upload_from_string(file_str)
    logger.debug('File uploaded to {}.'.format(destination_blob_name))


def get_vm_external_ip(project_id, region, address_name):
    resp_code = 200
    compute = get_compute_resource()

    try:
        logger.debug('Getting external IP address ...')
        operation = build_addresses_request(compute=compute, method=ADDRESSES_GET, project_id=project_id,
                                            region=region,
                                            name=address_name).execute()
        result = {'external_ip': operation['address']}
    except HttpError as e:
        result = {
            'message': 'There was an error while retrieving external IP address [{name}]: {msg}'.format(
                name=address_name,
                msg=e._get_reason())
        }
        resp_code = e.resp.status
        logger.error("[ERROR] " + result['message'])
        logger.exception(e)
    result['resp_code'] = resp_code
    return result


# def pubsub_callback(message_future, topic_name):
#     # When timeout is unspecified, the exception method waits indefinitely.
#     if message_future.exception(timeout=30):
#         logger.debug('Publishing message on {} threw an Exception {}.'.format(
#             topic_name, message_future.exception()))
#     else:
#         logger.debug(message_future.result())


# def delete_pubsub_topic(project_id, topic_name):
#     publisher = pubsub_v1.PublisherClient()
#     topic_path = publisher.topic_path(project_id, topic_name)
#     # delete topic if exists
#     publisher.delete_topic(topic_path)


def stop_vm(project_id, zone, vm_name):
    resp_code = 200
    compute = get_compute_resource()
    try:
        logger.debug('Stopping Instance ...')
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
    compute = get_compute_resource()
    resp_code = 200
    try:
        logger.debug('Deleting Instance ...')
        operation = build_instances_request(compute=compute, method=INSTANCES_DELETE, project_id=project_id, zone=zone,
                                            name=vm_name).execute()
        wait_for_operation(compute=compute, project=project_id, operation=operation['name'], zone=zone)

        logger.debug('Remove Firewall ...')
        operation = build_firewalls_request(compute=compute, method=FIREWALLS_DELETE, project_id=project_id,
                                            firewall_rule_name=firewall_rule_name).execute()
        wait_for_operation(compute=compute, project=project_id, operation=operation['name'])

        logger.debug('Deleting External IP address ...')
        operation = build_addresses_request(compute=compute, method=ADDRESSES_DELETE, project_id=project_id,
                                            region=region, name=address_name).execute()
        wait_for_operation(compute=compute, project=project_id, operation=operation['name'], region=region)

        # logger.debug('Deleting PubSub Topic ...')
        # try:
        #     publisher = pubsub_v1.PublisherClient()
        #     topic_path = publisher.topic_path(project_id, topic_name)
        #     # delete topic if exists
        #     publisher.delete_topic(topic_path)
        #     # delete_pubsub_topic(project_id=project_id, topic_name=topic_name)
        # except NotFound:
        #     pass

        result = {'message': 'Instance is deleted.'}

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
    try:
        logger.debug('Check Instance ...')
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
    logger.debug('Waiting for operation to finish...')
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
            logger.debug("done.")
            if 'error' in result:
                raise Exception(result['error'])
            return result
        time.sleep(1)
