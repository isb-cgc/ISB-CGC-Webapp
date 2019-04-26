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
from __future__ import print_function

from oauth2client.client import GoogleCredentials
from googleapiclient.discovery import build
import sys
import time
import warnings

def clusterTest(containerApiInstance, clusterName, project, zone, numNodes, machineType, network="default", operationTimeout=300):
    # Set up the execution environment/cluster
    snaprClusterCreateRequest = {
            "cluster": {
            "name": clusterName,
            "zone": zone,
            "numNodes": numNodes,
            "network": network,
            "nodeConfig": {
            "machineType": machineType
        },
        "masterAuth": { # Generated from the "Equivalent Rest" link in the developer's console -- not sure how it was generated, though.
            "user": "admin",
            "password": "tQlw9d1mk3tCmf7q"
            }
        }
    }

    # Create the cluster
    snaprClusterCreateResponse = containerApiInstance.projects().zones().clusters().create(projectId=project, zoneId=zone, body=snaprClusterCreateRequest).execute()

    # Wait for the cluster create operation to finish
    timeoutCount = 0

    while True:
        result = containerApiInstance.projects().zones().operations().get(projectId=project, zoneId=zone, operationId=snaprClusterCreateResponse['name']).execute()
        if result['status'] == 'done':
            print("cluster created")
            timeoutCount = 0
            break
        elif timeoutCount >= operationTimeout:
            return 1
        else:
            sys.stdout.write('.')
            sys.stdout.flush()
            time.sleep(1)
            timeoutCount += 1

    # Sleep for 10 seconds
    # time.sleep(10)

    # Shut down the cluster
    snaprClusterDeleteResponse = containerApiInstance.projects().zones().clusters().delete(projectId=project, zoneId=zone, clusterId=snaprClusterCreateRequest['cluster']['name']).execute()

    # Wait for the cluster delete operation to finish
    while True:
        result = containerApiInstance.projects().zones().operations().get(projectId=project, zoneId=zone, operationId=snaprClusterDeleteResponse['name']).execute()
        if result['status'] == 'done':
            print("cluster deleted")
            timeoutCount = 0
            break
        elif timeoutCount >= operationTimeout:
            return 1
        else:
            sys.stdout.write('.')
            sys.stdout.flush()
            time.sleep(1)
            timeoutCount += 1

    return 0

def run_cluster():
    # Project details
    credentials = GoogleCredentials.get_application_default()
    project = 'isb-cgc'
    zone = 'us-central1-c'

    # Build API instance
    container = build('container', 'v1beta1', credentials=credentials)

    # Params for cluster test function
    name = "cluster-test"
    numNodes = 1 # The number of kubernetes slaves (cluster total hosts - 1)
    machineType = "g1-small" # small machines are probably good enough for this test

    # Run the cluster test function
    exitCode = clusterTest(container, name, project, zone, numNodes, machineType)

			
