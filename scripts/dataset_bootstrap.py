"""
Copyright 2016, Institute for Systems Biology
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

import logging
from MySQLdb import connect
from argparse import ArgumentParser

logging.basicConfig(level=logging.INFO)
logger = logging

AUTHORIZED_DATASET_TABLE = 'accounts_authorizeddataset'


def get_mysql_connection(user, password, database, host='127.0.0.1', port=3306):
    db = connect(host=host,
                 port=port,
                 db=database,
                 user=user,
                 passwd=password)

    return db


def add_authorized_datasets(db):
    auth_dataset_rows = [
        ('All Open Datasets', 'isb-cgc-open@isb-cgc.org', '', 0, None),
        ('Fake TCGA Dataset', 'isb-cgc-dev-cntl@isb-cgc.org', 'phs000178', 'phs000178.v9.p8', 0),
        ('Fake TARGET Dataset', 'isb-cgc-dev-cntl-target@isb-cgc.org', 'phs000218', 'phs000218.v18.p7', 0),
        ('Fake CGCI Dataset', 'isb-cgc-dev-cntl-cgci@isb-cgc.org', 'phs000235', None, 0)
    ]

    insert_auth_dataset_tpl = """
        INSERT INTO {table_name} (`name`, `acl_google_group`, `whitelist_id`, `duca_id`, `public`)
        VALUES (%s, %s, %s, %s, %s);
    """

    stmt = insert_auth_dataset_tpl.format(table_name=AUTHORIZED_DATASET_TABLE)

    logger.info("Adding {} AuthorizedDataset rows".format(len(auth_dataset_rows)))
    cursor = db.cursor()
    cursor.executemany(stmt, auth_dataset_rows)
    db.commit()


def bootstrap_datasets(db):
    add_authorized_datasets(db)


def main():
    cmd_line_parser = ArgumentParser(description="Script to bootstrap web application datasets")
    cmd_line_parser.add_argument('-d', '--database', type=str, default='test',
                                 help="MySQL database name")
    cmd_line_parser.add_argument('-u', '--user', type=str, help="MySQL user name")
    cmd_line_parser.add_argument('-p', '--password', type=str, help="MySQL password")

    args = cmd_line_parser.parse_args()

    try:
        db = get_mysql_connection(args.user, args.password, args.database)
        bootstrap_datasets(db)

    except Exception as e:
        logging.exception(e)


if __name__ == "__main__":
    main()
