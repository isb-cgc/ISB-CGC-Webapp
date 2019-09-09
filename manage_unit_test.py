#!/usr/bin/env python
###
# Copyright 2015-2019, Institute for Systems Biology
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
###

import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "idc.settings_unit_test")
    # stubBuilder = None
    #
    # # Migration will trigger system checks, which will in turn load the views.py files. Some of these import
    # # google_appengine modules, which is a problem since the services won't be available. We make stub services to
    # # address this. So far only memcache has been needed, but there may be others in the future.
    # #
    # # Running Django unit tests with enabled apps that import data_upload/models.py will eventually import
    # # google_helpers/cloud_file_storage.py and google_helpers/storage_service.py. The latter file contains
    # # appengine imports that requires the memcache stub service to be available.
    # #
    # # See here for information on the stubs which can be initialized:
    # # https://cloud.google.com/appengine/docs/python/tools/localunittesting#Python_Introducing_the_Python_testing_utilities
    # if 'migrate' in sys.argv or 'test' in sys.argv:
    #     from google.appengine.ext import testbed
    #
    #     stubBuilder = testbed.Testbed()
    #     stubBuilder.activate()
    #     stubBuilder.init_memcache_stub()

    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)

#    stubBuilder and stubBuilder.deactivate()
