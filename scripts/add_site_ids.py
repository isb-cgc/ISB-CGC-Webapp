#
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
#
from __future__ import print_function

import os
import MySQLdb
import logging
import traceback
import sys
from idc import secret_settings

logging.basicConfig(level=logging.INFO)

db = None
cursor = None

try:

    db_settings = secret_settings.get('DATABASE')['default']
    ssl = None
    if 'OPTIONS' in db_settings and 'ssl' in db_settings['OPTIONS']:
        ssl = db_settings['OPTIONS']['ssl']
    db = MySQLdb.connect(host=db_settings['HOST'], port=db_settings['PORT'], db=db_settings['NAME'], user=db_settings['USER'], passwd=db_settings['PASSWORD'], ssl=ssl)

    delete_str = 'DELETE FROM django_site WHERE id in (2, 3, 4, 5);'
    insert_str = 'INSERT INTO django_site (id, domain, name) VALUES (%s, %s, %s), (%s, %s, %s);'

    insert_tuple = ('2', 'localhost:8086', 'localhost:8086', '3', 'idc-dev.appspot.com', 'idc-dev.appspot.com')

    cursor = db.cursor()
    cursor.execute(delete_str)
    cursor.execute(insert_str, insert_tuple)
    db.commit()

except Exception as e:
    print("[ERROR] Exception in add_site_ids: ", file=sys.stderr)
    print(traceback.format_exc(), file=sys.stderr)
finally:
    if cursor: cursor.close()
    if db and db.open: db.close()
