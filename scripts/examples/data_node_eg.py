###
# Copyright 2015-2020, Institute for Systems Biology
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

from __future__ import print_function
import logging
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "isb_cgc.settings")

import django
django.setup()

logger = logging.getLogger('main_logger')
from projects.models import DataNode, DataSource, DataVersion
from isb_cgc import settings

try:
    nodes = DataNode.objects.filter(active=1)
    print(nodes)
    # All data sources which have data from these nodes - note this is NOT per-node!
    sources_these_nodes = nodes.get_data_sources()
    # ...but this is.
    sources_these_nodes = nodes.get_data_sources(per_node=True)
    print(sources_these_nodes)
    # If you want the attributes in a node, you go through the sources. There's a shorthand for this:
    attr_these_nodes = nodes.get_attrs()
    print(attr_these_nodes)
    # As above, you can ask for it per node:
    attr_these_nodes = nodes.get_attrs(per_node=True)
    print(attr_these_nodes)
except Exception as e:
    logger.exception(e)


