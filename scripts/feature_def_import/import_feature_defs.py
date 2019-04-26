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

from builtins import range
import argparse
import csv

import MySQLdb

def build_table_create_sql(cursor, table_name):
    stmt = ("CREATE TABLE IF NOT EXISTS {table_name} ( "
            "id int(11) unsigned NOT NULL AUTO_INCREMENT, "
            "feature_type tinytext, "
            "gene tinytext, "
            "label tinytext, "
            "internal_id tinytext, "
            "PRIMARY KEY (id))").format(table_name=table_name)

    cursor.execute(stmt)

def connect_mysql(database, password):
    return MySQLdb.connect(host='127.0.0.1', port=3306, db=database, user='root', passwd=password)


def run_import(database_name, database_password, table_name, data_path):
    # Create table if it doesn't already exists
    print("Creating table '{0}'".format(table_name))
    db = connect_mysql(database_name, database_password)
    cursor = db.cursor()
    build_table_create_sql(cursor, table_name)
    fieldnames = ['feature_type', 'gene', 'label', 'internal_id']

    print("Reading {0}".format(data_path))
    counter = 0
    parsed_data = []
    reader = csv.DictReader(open(data_path), delimiter='\t')
    for row in reader:
        try:
            item = []
            for field in fieldnames:
                item.append(row[field])

            parsed_data.append(tuple(item))
            counter += 1
        except Exception as e:
            print("Error: " + e.message)

    # Insert in chunks
    CHUNK_SIZE = 1000
    insert_sql = ("INSERT INTO {table_name} "
                  "(feature_type, gene, label, internal_id) "
                  "VALUES (%s, %s, %s, %s)").format(table_name=table_name)
    for chunk in [parsed_data[i : i + CHUNK_SIZE] for i in range(0, len(parsed_data), CHUNK_SIZE)]:
        cursor.executemany(insert_sql, chunk)

    print('{0} rows processed'.format(counter))
    db.commit()

def main():
    cmd_line_parser = argparse.ArgumentParser(description="Feature definition import")
    cmd_line_parser.add_argument('DB', type=str, help="Database name")
    cmd_line_parser.add_argument('PASSWORD', type=str, help="Database password")
    cmd_line_parser.add_argument('TABLE', type=str, help="Database table name")
    cmd_line_parser.add_argument('FEATURES', type=str, help="Feature definition TSV path")

    args = cmd_line_parser.parse_args()

    run_import(args.DB, args.PASSWORD, args.TABLE, args.FEATURES)


if __name__ == "__main__":
    main()
