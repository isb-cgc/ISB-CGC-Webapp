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

# from isb_cgc import secret_settings, settings

PREFORMATTED_CLIN_ATTR = []

# os.environ.setdefault("DJANGO_SETTINGS_MODULE", "isb_cgc.settings")

import django
django.setup()

from idc_collections.models import Program, Project, Attribute, Attribute_Tooltips, DataSource, DataVersion

from django.contrib.auth.models import User
idc_superuser = User.objects.get(username="idc")

logger = logging.getLogger('main_logger')


def main():

    try:
        projects = Project.objects.select_related('program').filter(owner=idc_superuser,active=True,program__is_public=True)
        disease_code = Attribute.objects.get(name="disease_code", active=True)
        proj_short_name = Attribute.objects.get(name="project_short_name", active=True)

        tips = Attribute_Tooltips.objects.all()

        extent_tooltips = {}

        for tip in tips:
            if not tip.attribute.id in extent_tooltips:
                extent_tooltips[tip.attribute.id] = []
            extent_tooltips[tip.attribute.id].append(tip.value)

        tooltips_by_val = { x.name: {'tip': x.description, 'obj':disease_code} for x in projects if x.name not in ['ALL-P1','ALL-P2']}
        tooltips_by_val['ALL'] = {'tip':'Acute Lymphoblastic Leukemia', 'obj': disease_code}
        tooltips_by_val.update({"{}-{}".format(x.program.name,x.name): {'tip': x.description, 'obj':proj_short_name} for x in projects})

        tooltips = []

        for val in tooltips_by_val:
            if not tooltips_by_val[val]['tip']:
                raise Exception("Tooltip cannot be null: {}".format(val))
            if  val not in extent_tooltips.get(tooltips_by_val[val]['obj'].id,[]):
                tooltips.append(Attribute_Tooltips(value=val, tooltip=tooltips_by_val[val]['tip'], attribute=tooltips_by_val[val]['obj']))

        if len(tooltips):
            print("[STATUS] Adding {} new tooltips.".format(str(len(tooltips))))
            Attribute_Tooltips.objects.bulk_create(tooltips)
        else:
            print("[STATUS] - No new tooltips available.")

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
