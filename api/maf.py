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

import endpoints
from protorpc import remote
from protorpc.messages import Message, MessageField, IntegerField, StringField, Variant
from MySQLdb.cursors import DictCursor

from api_helpers import *


# Generated code - in scripts/maf_import in Python do:
#
# > import import_maf
# > repr(import_maf.FIELD_NAMES_AND_TYPES)
#
FIELD_NAMES_AND_TYPES = [
    {'type': 'varchar(128)', 'name': 'hugo_symbol'},
    {'type': 'int', 'name': 'amino_acid_position'},
    {'type': 'varchar(128)', 'name': 'tumor_type'},
    {'type': 'varchar(12)', 'name': 'uniprot_id'},
    {'type': 'varchar(128)', 'name': 'variant_classification'},
    {'type': 'varchar(128)', 'name': 'c_position'},
    {'type': 'varchar(128)', 'name': 'tumor_sample_barcode'},
    {'type': 'varchar(128)', 'name': 'match_norm_seq_allele2'},
    {'type': 'varchar(128)', 'name': 'tumor_seq_allele1'},
    {'type': 'varchar(128)', 'name': 'tumor_seq_allele2'},
    {'type': 'varchar(128)', 'name': 'match_norm_seq_allele1'},
    {'type': 'varchar(128)', 'name': 'reference_allele'},
    {'type': 'varchar(128)', 'name': 'variant_type'},
    {'type': 'varchar(128)', 'name': 'ucsc_cons'}
]


class MAFRecord(Message):
    hugo_symbol = StringField(1)
    tumor_type = StringField(3)
    amino_acid_position = IntegerField(2, variant=Variant.INT32)
    uniprot_id = StringField(4)
    variant_classification = StringField(5)
    c_position = StringField(6)
    tumor_sample_barcode = StringField(7)
    match_norm_seq_allele2 = StringField(8)
    tumor_seq_allele1 = StringField(9)
    tumor_seq_allele2 = StringField(10)
    match_norm_seq_allele1 = StringField(11)
    reference_allele = StringField(12)
    variant_type = StringField(13)
    ucsc_cons = StringField(14)


class MAFRecordList(Message):
    items = MessageField(MAFRecord, 1, repeated=True)


class MAFRequest(Message):
    gene = StringField(1, required=True)
    tumor = StringField(2, repeated=True)

MAFEndpointsAPI = endpoints.api(name='maf_api', version='v1')


@MAFEndpointsAPI .api_class(resource_name='maf_endpoints')
class MAFEndpointsAPI(remote.Service):
    @endpoints.method(MAFRequest, MAFRecordList,
                      path='maf_search', http_method='GET', name='maf.getMAF')
    def maf_search(self, request):
        gene = request.gene
        tumor_type_list = request.tumor
        tumor_set_template = ', '.join(['%s' for x in range(len(tumor_type_list))])
        query = 'SELECT * FROM maf WHERE hugo_symbol=%s AND tumor_type IN ({0})'.format(tumor_set_template)

        values = [gene]
        values.extend(tumor_type_list)
        try:
            db = sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(values))

            data_list = []
            for row in cursor.fetchall():
                data_list.append(MAFRecord(**row))

            cursor.close()
            db.close()
            return MAFRecordList(items=data_list)

        except:
            raise endpoints.NotFoundException('MAF query error')