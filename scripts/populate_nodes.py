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

from isb_cgc import secret_settings, settings

NODE_LIST = {
    "IDC": {'name': "Imaging Data Commons", 'sources': ["idc-dev-etl.tcia.dicom_metadata"]},
    "GDC": {'name': "Genomics Data Commons", 'sources': ["ccle_bios","ccle_clin","files_hg19","files_hg38","isb-cgc-test.TARGET_bioclin_v0.target_data_types","isb-cgc-test.TCGA_bioclin_v0.tcga_data_types","isb-cgc.CCLE_bioclin_v0.biospecimen_v1","isb-cgc.CCLE_bioclin_v0.clinical_v0","isb-cgc.CCLE_hg19_data_v0.ccle_metadata_data_hg19_r14","isb-cgc.TARGET_bioclin_v0.Biospecimen","isb-cgc.TARGET_bioclin_v0.Clinical","isb-cgc.TARGET_hg19_data_v0.target_metadata_data_hg19_r14","isb-cgc.TARGET_hg38_data_v0.target_metadata_data_hg38_r14","isb-cgc.TCGA_bioclin_v0.Biospecimen","isb-cgc.TCGA_bioclin_v0.Clinical","isb-cgc.TCGA_hg19_data_v0.tcga_metadata_data_hg19_r14","isb-cgc.TCGA_hg38_data_v0.tcga_metadata_data_hg38_r14","isb-project-zero.smp_scratch.tcga_mut_hg19","isb-project-zero.smp_scratch.tcga_mut_hg38","target_bios","target_clin","target_data_types","tcga_bios","tcga_clin","tcga_data_types","tcga_mut_hg19","tcga_mut_hg38","tcga_tcia_images"]},
    "PDC": {'name': "Proteomics Data Commons", 'sources': []}
}

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "isb_cgc.settings")

import django
django.setup()

from projects.models import DataSource, DataNode, DataVersion

from django.contrib.auth.models import User
isb_superuser = User.objects.get(username="isb")

logger = logging.getLogger('main_logger')


def main():

    try:
        node_sources = []
        for node in NODE_LIST:
            obj, created = DataNode.objects.update_or_create(name=NODE_LIST[node]['name'],short_name=node)
            sources = DataSource.objects.filter(name__in=NODE_LIST[node]['sources']).distinct()
            for source in sources:
                node_sources.append(DataNode.data_sources.through(datanode_id=obj.id, datasource_id=source.id))

        DataNode.data_sources.through.objects.bulk_create(node_sources)

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
