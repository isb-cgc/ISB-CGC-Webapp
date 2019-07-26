# Create your views here.
import logging
import json
import re
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from .models import Instance
from .notebook_vm import start_vm, stop_vm, delete_vm, check_vm_stat, get_vm_external_ip

logger = logging.getLogger('main_logger')
debug = settings.DEBUG

@login_required
def notebook_vm_command(request):
    body_unicode = request.body.decode('utf-8')
    body = json.loads(body_unicode)
    vm_user = body['user']
    vm_header = re.sub(r'[^A-Za-z0-9]+', '', vm_user.lower())
    project_id = body['project_id']
    vm_name = body['name']
    zone = body['zone']
    password = body['password']
    firewall_ip_range = body['client_ip_range'].replace(' ','').split(',') # remove white spaces and place them in list
    serv_port = body['serv_port']
    region = '-'.join(zone.split('-')[:-1])
    address_name = vm_header + '-jupyter-address'
    firewall_rule_name = vm_header + '-jupyter-firewall-rule'
    topic_name = vm_header + "-notebooks-management"

    command = request.path.rsplit('/', 1)[1]
    if command == 'create_vm':
        result = start_vm(project_id, zone, vm_user, vm_name, vm_header, firewall_rule_name, firewall_ip_range, serv_port, region, address_name, password, topic_name)
        if result['resp_code'] == 200:
            vm_instances = Instance.objects.filter(name=vm_name, vm_username=vm_user, zone=zone)
            if not vm_instances:
                Instance.create(name=vm_name,
                                    user=request.user,
                                    vm_username=vm_user,
                                    project_id=project_id,
                                    zone=zone)
                logger.info('instance object is created')
    elif command == 'start_vm':
        result= start_vm(project_id, zone, vm_user, vm_name, vm_header, firewall_rule_name, firewall_ip_range, serv_port, region, address_name, password)
    elif command == 'stop_vm':
        result = stop_vm(project_id, zone, vm_name)
    elif command == 'delete_vm':
        result = delete_vm(project_id, zone, vm_name, firewall_rule_name, region, address_name, topic_name)
        if result['resp_code'] == 200:
            Instance.delete(name=vm_name,
                                user=request.user,
                                vm_username=vm_user,
                                project_id=project_id,
                                zone=zone)
    elif command == 'check_vm':
        result = check_vm_stat(project_id, zone, vm_name)
    elif command == 'run_browser':
        result = get_vm_external_ip(project_id, region, address_name)
    return JsonResponse(result)