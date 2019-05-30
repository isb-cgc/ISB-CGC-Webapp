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

from builtins import range
import argparse
import csv
import re

import MySQLdb

from maf_configuration import INCLUDE_FIELDS

# Regular expression for parsing amino acid position (integer)
POSITION_RE = re.compile('p.[A-Z](\d+)[fs A-Z\*]?')


# MAF field names
AMINO_ACID_CHANGE_FIELD = 'amino_acid_change'
UNIPROT_ID_FIELD = 'Uniprot Sprot ID'
GENE_ID_FIELD = 'Hugo_Symbol'

# MySQL table field names
GENE_ID_MYSQL = 'hugo_symbol'
AMINO_ACID_MYSQL = 'amino_acid_position'
UNIPROT_MYSQL = 'uniprot_id'
TUMOR_TYPE_MYSQL = 'tumor_type'


#
# This dict contains the names of the fields that will be included from the MAF.
# The key is the field name in the MAF file and the value is the field name in
# the MySQL table, eg:
#
# 'Match_Norm_Seq_Allele1' => 'match_norm_seq_allele1'
#
ANNOTATION_FIELDS = {}
for field_name in INCLUDE_FIELDS:
    ANNOTATION_FIELDS[field_name] = field_name.lower()


TABLE_NAME = 'maf'

FIELD_NAMES_AND_TYPES = []


def build_column_type_list():
    print("Building column names and types...")
    global FIELD_NAMES_AND_TYPES

    # MySQL fields that have other type than 'varchar(128)'
    column_types = {
        UNIPROT_MYSQL: 'varchar(12)',
        AMINO_ACID_MYSQL: 'int'
    }

    # Create an array of column names and types
    field_names_for_table = [
        GENE_ID_MYSQL,
        AMINO_ACID_MYSQL,
        TUMOR_TYPE_MYSQL,
        UNIPROT_MYSQL
    ]

    field_names_for_table.extend(list(ANNOTATION_FIELDS.values()))

    for field in field_names_for_table:
        column_type = 'varchar(128)'
        if field in column_types:
            column_type = column_types[field]
        FIELD_NAMES_AND_TYPES.append({'name': field, 'type': column_type})

build_column_type_list()


def build_table_create_sql(cursor):
    column_list = []
    for column_info in FIELD_NAMES_AND_TYPES:
        column_list.append('{name} {type}'.format(**column_info))
    column_type_stmt = ', '.join(column_list)
    statement = 'CREATE TABLE IF NOT EXISTS {table_name} ({columns})'.format(
        table_name=TABLE_NAME,
        columns=column_type_stmt)
    cursor.execute(statement)


def build_insert_sql_template():
    values_stmt = ', '.join(['%s' for x in range(len(FIELD_NAMES_AND_TYPES))])
    template = 'INSERT INTO {table_name} VALUES ({values})'.format(
        table_name=TABLE_NAME,
        values=values_stmt)
    return template


def parse_amino_acid_position(field_data):
    position = POSITION_RE.findall(field_data)
    if len(position) == 1:
        return int(position[0])
    else:
        raise Exception("invalid amino acid position position '{0}'".format(field_data))


def parse_row(row, tumor_type):
    # Parse amino acid position
    amino_acid_position = parse_amino_acid_position(row[AMINO_ACID_CHANGE_FIELD])

    result = {
        GENE_ID_MYSQL: row[GENE_ID_FIELD],
        AMINO_ACID_MYSQL: amino_acid_position,
        TUMOR_TYPE_MYSQL: tumor_type,
        UNIPROT_MYSQL: row[UNIPROT_ID_FIELD]
    }

    # Include annotation fields
    for row_key, result_key in list(ANNOTATION_FIELDS.items()):
        result[result_key] = row[row_key]

    return result


def connect_mysql(database):
    return MySQLdb.connect(host='127.0.0.1', port=3306, db=database, user='root')


def import_maf(database_name, tumor_type_label, maf_path):
    # Create table if it doesn't already exists
    print("Creating table '{0}'".format(TABLE_NAME))
    db = connect_mysql(database_name)
    cursor = db.cursor()
    build_table_create_sql(cursor)

    insert_sql = build_insert_sql_template()

    print("Reading {0}".format(maf_path))
    counter = 0
    parsed_data = []
    reader = csv.DictReader(open(maf_path), delimiter='\t')
    for row in reader:
        try:
            result = parse_row(row, tumor_type_label)
            row_data = []
            for column_info in FIELD_NAMES_AND_TYPES:
                row_data.append(result[column_info['name']])
            parsed_data.append(tuple(row_data))
            counter += 1
        except Exception as e:
            pass

    # Insert in chunks
    CHUNK_SIZE = 1000
    for chunk in [parsed_data[i : i + CHUNK_SIZE] for i in range (0, len(parsed_data), CHUNK_SIZE)]:
        cursor.executemany(insert_sql, chunk)

    print('{0} rows processed'.format(counter))
    db.commit()


def main():
    cmd_line_parser = argparse.ArgumentParser(description="MAF import")
    cmd_line_parser.add_argument('DB', type=str, help="Database name")
    cmd_line_parser.add_argument('TUMOR', type=str, help="Tumor type for the file")
    cmd_line_parser.add_argument('MAF', type=str, help="MAF file path")

    args = cmd_line_parser.parse_args()

    import_maf(args.DB, args.TUMOR, args.MAF)


if __name__ == "__main__":
    main()
