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

from builtins import str
from builtins import object
import datetime
import logging
import traceback
import os
import re
import csv
from argparse import ArgumentParser
import sys
import time
from copy import deepcopy

PREFORMATTED_CLIN_ATTR = []

import django
django.setup()

from idc_collections.models import Collection, Attribute, Attribute_Tooltips, DataSource, DataVersion

from django.contrib.auth.models import User
idc_superuser = User.objects.get(username="idc")

logger = logging.getLogger('main_logger')


def main():
    try:
        # populate collection tooltips
        collections = Collection.objects.filter(owner=idc_superuser, active=True)
        collection_id = Attribute.objects.get(name="collection_id", active=True)

        tips = Attribute_Tooltips.objects.all()

        extent_tooltips = {}

        for tip in tips:
            if not tip.attribute.id in extent_tooltips:
                extent_tooltips[tip.attribute.id] = []
            extent_tooltips[tip.attribute.id].append(tip.tooltip_id)

        tooltips_by_val = {x.collection_id: {'tip': x.description, 'obj': collection_id} for x in collections}

        tooltips = []

        for val in tooltips_by_val:
            if not tooltips_by_val[val]['tip']:
                continue
            if val not in extent_tooltips.get(tooltips_by_val[val]['obj'].id,[]):
                tooltips.append(Attribute_Tooltips(tooltip_id=val, tooltip=tooltips_by_val[val]['tip'],
                                                   attribute=tooltips_by_val[val]['obj']))

        if len(tooltips):
            print("[STATUS] Adding {} new tooltips.".format(str(len(tooltips))))
            Attribute_Tooltips.objects.bulk_create(tooltips)
        else:
            print("[STATUS] - No new tooltips available.")

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
