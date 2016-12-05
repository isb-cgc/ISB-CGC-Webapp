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

import os
import traceback
import time
import sys
from MySQLdb import connect, cursors
from GenespotRE import secret_settings
from argparse import ArgumentParser

SUPERUSER_NAME = 'isb'

def get_mysql_connection():
    env = os.getenv('SERVER_SOFTWARE')
    db_settings = secret_settings.get('DATABASE')['default']
    db = None
    ssl = None
    if 'OPTIONS' in db_settings and 'ssl' in db_settings['OPTIONS']:
        ssl = db_settings['OPTIONS']['ssl']

    if env and env.startswith('Google App Engine/'):  # or os.getenv('SETTINGS_MODE') == 'prod':
        # Connecting from App Engine
        db = connect(
            unix_socket='/cloudsql/<YOUR-APP-ID>:<CLOUDSQL-INSTANCE>',
            db='',
            user='',
        )
    else:
        db = connect(host=db_settings['HOST'], port=db_settings['PORT'], db=db_settings['NAME'],
                     user=db_settings['USER'], passwd=db_settings['PASSWORD'], ssl=ssl)

    return db


def create_study_views(project, source_table, studies):
    db = get_mysql_connection()
    cursor = db.cursor()

    study_names = {}
    view_check_sql = "SELECT COUNT(TABLE_NAME) FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_NAME = %s;"
    create_view_sql = "CREATE OR REPLACE VIEW %s AS SELECT * FROM %s"
    where_proj = " WHERE program_name=%s"
    where_study = " AND disease_code=%s;"

    try:
        for study in studies:
            view_name = "%s_%s_%s" % (project, study, source_table,)

            # If project and study are the same we assume this is meant to
            # be a one-study project
            make_view = (create_view_sql % (view_name, source_table,)) + where_proj
            params = (project,)

            if project == study:
                make_view += ";"
            else:
                make_view += where_study
                params += (study,)

            cursor.execute(make_view, params)

            cursor.execute(view_check_sql, (view_name,))
            if cursor.fetchall()[0][0] <= 0:
                raise Exception("Unable to create view '" + view_name + "'!")

            cursor.execute("SELECT COUNT(*) FROM %s;" % view_name)
            if cursor.fetchall()[0][0] <= 0:
                print >> sys.stdout, "Creation of view '"+view_name+"' was successful, but no entries are found in " + \
                    "it. Double-check the "+source_table+" table for valid entries."
            else:
                print >> sys.stdout, "Creation of view '" + view_name + "' was successful."

            study_names[study] = {"view_name": view_name, "project": project}

        return study_names

    except Exception as e:
        print >> sys.stderr, e
        print >> sys.stderr, traceback.format_exc()

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


def bootstrap_metadata_attr_mapping():

    db = get_mysql_connection()
    cursor = db.cursor()

    table_check_sql = "SELECT COUNT(TABLE_NAME) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = %s;"

    make_mapping_table = """
      CREATE TABLE metadata_attr_map (
        metadata_attr_name VARCHAR(100), source_attr VARCHAR(100),coalesced_attr VARCHAR(100),
        CONSTRAINT u_attrSrcCoal UNIQUE (metadata_attr_name,source_attr,coalesced_attr)
      );
    """

    insert_mapping_vals = """
        INSERT INTO metadata_attr_map (metadata_attr_name,source_attr,coalesced_attr) VALUES(%s,%s,%s);
    """

    test_map_creation = """
        SELECT * FROM metadata_attr_map;
    """

    value_maps = [
        ('tumor_tissue_site', 'central_nervous_system', 'Central nervous system',),
        ('histological_type', 'leiomyosarcoma', 'Leiomyosarcoma (LMS)',),
        ('histological_type', 'medullary_carcinoma', 'Medullary Carcinoma',),
        ('histological_type', 'metaplastic_carcinoma', 'Metaplastic Carcinoma',),
    ]

    try:

        cursor.execute(table_check_sql, ('metadata_attr_map',))

        found_map_table = (cursor.fetchall()[0][0] <= 0)

        if found_map_table:
            print >> sys.stdout, "[STATUS] metadata_attr_map table found."
        else:
            print >> sys.stdout, "Building attribute mapping table..."

            cursor.execute(make_mapping_table)
            db.commit()

            for map in value_maps:
                cursor.execute(insert_mapping_vals,map)

            db.commit()

            cursor.execute(test_map_creation)

            entries = 0

            for row in cursor.fetchall():
                entries += 1

            if entries <= 0:
                raise Exception("metadata_attr mapping not successfully generated!")
            else:
                print >> sys.stdout, "metadata_attr mapping table successfully generated."

    except Exception as e:
        print >> sys.stderr, e
        print >> sys.stderr, traceback.format_exc()

    finally:
        if cursor: cursor.close()
        if db and db.open: db.close()


def bootstrap_user_data_schema(public_feature_table, big_query_dataset, bucket_name, bucket_permissions, bqdataset_name):
    fetch_studies = "SELECT DISTINCT disease_code FROM metadata_samples WHERE program_name='TCGA';"
    insert_projects = "INSERT INTO projects_program (name, active, last_date_saved, is_public, owner_id) " + \
                      "VALUES (%s,%s,%s,%s,%s);"
    insert_studies = "INSERT INTO projects_project (name, active, last_date_saved, owner_id, program_id) " + \
                     "VALUES (%s,%s,%s,%s,%s);"
    insert_googleproj = "INSERT INTO accounts_googleproject (project_id, project_name, big_query_dataset) " + \
                        "VALUES (%s,%s,%s);"
    insert_googleproj_user = "INSERT INTO accounts_googleproject_user (user_id, googleproject_id)" \
                             "VALUES (%s,%s);"
    get_googleproj_id = "SELECT id from accounts_googleproject where id=%s;"
    insert_bucket = "INSERT INTO accounts_bucket (bucket_name, bucket_permissions, google_project_id) VALUES (%s, %s, %s);"
    insert_bqdataset = "INSERT INTO accounts_bqdataset (dataset_name, google_project_id) VALUES (%s, %s);"
    insert_user_data_tables = "INSERT INTO projects_user_data_tables (project_id, user_id, google_project_id, " + \
                              "google_bucket_id, metadata_data_table, metadata_samples_table, " + \
                              "feature_definition_table, google_bq_dataset_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s);"
    googleproj_name = "isb-cgc"
    tables = ['metadata_samples', 'metadata_data']

    studies = {}
    isb_userid = None
    table_study_data = {}
    study_table_views = None
    project_info = {}
    study_info = {}
    googleproj_id = None
    bucket_id = None
    bqdataset_id = None

    try:

        db = get_mysql_connection()
        cursor = db.cursor()
        cursorDict = db.cursor(cursors.DictCursor)

        cursor.execute("SELECT id FROM auth_user WHERE username = %s;", (SUPERUSER_NAME,))

        for row in cursor.fetchall():
            isb_userid = row[0]

        if isb_userid is None:
            raise Exception("Couldn't retrieve ID for isb user!")

        # Add the projects to the project table and store their generated IDs
        insertTime = time.strftime('%Y-%m-%d %H:%M:%S')

        cursor.execute(insert_projects, ("TCGA", True, insertTime, True, isb_userid,))
        cursor.execute(insert_projects, ("CCLE", True, insertTime, True, isb_userid,))
        cursor.execute(insert_googleproj, ("isb-cgc", googleproj_name, big_query_dataset,))

        db.commit()

        cursor.execute("SELECT id FROM accounts_googleproject WHERE project_name=%s;", (googleproj_name,))
        for row in cursor.fetchall():
            googleproj_id = row[0]

        cursor.execute(insert_googleproj_user, (isb_userid, googleproj_id))
        cursor.execute(insert_bucket, (bucket_name, bucket_permissions, googleproj_id,))
        db.commit()

        cursorDict.execute("SELECT name, id FROM projects_program;")
        for row in cursorDict.fetchall():
            project_info[row['name']] = row['id']


        cursor.execute("SELECT id FROM accounts_bucket WHERE bucket_name=%s;", (bucket_name,))
        for row in cursor.fetchall():
            bucket_id = row[0]

        cursor.execute(insert_bqdataset, (bqdataset_name, googleproj_id))
        db.commit()
        cursor.execute("SELECT id FROM accounts_bqdataset WHERE dataset_name=%s;", (bqdataset_name,))
        for row in cursor.fetchall():
            bqdataset_id = row[0]

        # Gather up the TCGA studies from the samples table
        cursor.execute(fetch_studies)
        for row in cursor.fetchall():
            if row[0] not in studies:
                studies[row[0]] = 1

        # Make the views
        for table in tables:
            study_table_views = create_study_views("TCGA", table, studies.keys())
            # Make CCLE and add it in manually
            ccle_view = create_study_views("CCLE", table, ["CCLE"])
            study_table_views["CCLE"] = ccle_view["CCLE"]

            table_study_data[table] = study_table_views

        # Add the studies to the study table and store their generated IDs
        for study in study_table_views:
            cursor.execute(insert_studies, (study, True, insertTime, isb_userid,
                                            project_info[study_table_views[study]['project']],))
        db.commit()

        cursorDict.execute("SELECT name, id FROM projects_project;")
        for row in cursorDict.fetchall():
            study_info[row['name']] = row['id']

        # Add the study views to the user_data_tables table
        for study in study_table_views:
            cursor.execute(insert_user_data_tables, (study_info[study], isb_userid, googleproj_id, bucket_id,
                                                     table_study_data['metadata_data'][study]['view_name'],
                                                     table_study_data['metadata_samples'][study]['view_name'],
                                                     public_feature_table, bqdataset_id))
        db.commit()

        # Compare the number of studies in projects_user_data_tables, projects_project, and our study set.
        # If they don't match, something might be wrong.
        study_count = 0
        study_udt_count = 0
        metadata_samples_study_count = len(studies.keys()) + (1 if "CCLE" not in studies.keys() else 0)

        cursor.execute("SELECT COUNT(DISTINCT id) FROM projects_project;")
        study_count = cursor.fetchall()[0][0]

        cursor.execute("SELECT COUNT(DISTINCT project_id) FROM projects_user_data_tables;")
        study_udt_count = cursor.fetchall()[0][0]

        if study_udt_count == study_count == metadata_samples_study_count:
            if study_udt_count <= 0:
                print >> sys.stdout, "[ERROR] No studies found! Double-check the creation script and databse settings."
            else:
                print >> sys.stdout, "[STATUS] Programs and studies appear to have been created successfully: " + \
                      study_count.__str__()+" studies added."
        else:
            print >> sys.stdout, "[WARNING] Unequal number of studies between metadata_samples, projects_project, and " + \
                    "projects_user_data_tables. projects_project: "+study_count.__str__()+", " + \
                    "projects_user_data_tables: " + study_udt_count.__str__()+", metadata_samples: " + \
                  metadata_samples_study_count.__str__()

    except Exception as e:
        print >> sys.stderr, e
        print >> sys.stderr, traceback.format_exc()

    finally:
        if cursor: cursor.close
        if cursorDict: cursorDict.close()
        if db and db.open: db.close

def bootstrap_file_data():
    print >> sys.stdout, 'Populating filelistings...'

    DCC_BUCKET = ''
    CGHUB_BUCKET = ''
    CCLE_BUCKET = ''
    insert_userupload = "INSERT INTO data_upload_userupload (status, `key`, owner_id) values ('complete', '', %s);"
    insert_useruploadedfile_TCGA = "INSERT INTO data_upload_useruploadedfile (upload_id, bucket, file) " \
                                   "SELECT %s,%s,datafilenamekey from metadata_data " \
                                   "    where datafileuploaded='true' and datafilenamekey!='' and disease_code=%s and repository=%s;"
    insert_useruploadedfile_CCLE = "INSERT INTO data_upload_useruploadedfile (upload_id, bucket, file) " \
                                   "SELECT %s,%s,datafilenamekey from metadata_data " \
                                   "    where datafileuploaded='true' and datafilenamekey!='' and program_name=%s;"

    update_projects_project = "UPDATE projects_user_data_tables set data_upload_id=%s where project_id=%s;"
    get_projects = "SELECT * FROM projects_project;"
    get_last_userupload = "SELECT * FROM data_upload_userupload order by id desc limit 1;"

    try:
        db = get_mysql_connection()
        cursor = db.cursor()
        cursorDict = db.cursor(cursors.DictCursor)

        cursorDict.execute(get_projects)
        for project in cursorDict.fetchall():

            # Create UserUpload entry
            cursor.execute(insert_userupload, (int(project['owner_id']),))

            # Get UserUpload Entries
            cursor.execute(get_last_userupload)
            last_userupload = cursor.fetchone()

            # Update the projects_project table with new upload id
            cursor.execute(update_projects_project, (last_userupload[0], project['id']))


            if project['name'] != 'CCLE': # TCGA

                # Create array of values to execute
                useruploadedfile_values = []  # [upload_id, bucket, study_name, repository]
                useruploadedfile_values.append([last_userupload[0], DCC_BUCKET, project['name'], 'DCC'])
                useruploadedfile_values.append([last_userupload[0], CGHUB_BUCKET, project['name'], 'CGHUB'])

                # Create UserUploadedFile for the project
                cursor.executemany(insert_useruploadedfile_TCGA, useruploadedfile_values)
            else: # CCLE

                # Create UserUploadedFile for the project
                cursor.execute(insert_useruploadedfile_CCLE, (last_userupload[0], CCLE_BUCKET, project['name'],))

            db.commit()



        # Create UserUploadedFile for each project
    except Exception as e:
        print >> sys.stderr, e
    finally:
        if cursor: cursor.close()
        if cursorDict: cursorDict.close()
        if db and db.open: db.close()


def main():
    cmd_line_parser = ArgumentParser(description="Script to bootstrap the user data schema for TCGA and CCLE")
    cmd_line_parser.add_argument('-p', '--pub-feat-table', type=str, default='Public_Feature_Table',
                                 help="Public features table for projects_user_data_tables entries")
    cmd_line_parser.add_argument('-q', '--bq-dataset', type=str, default='tcga_data_open',
                                 help="BigQuery dataset for this Google Project")
    cmd_line_parser.add_argument('-b', '--bucket-name', type=str, default='isb-cgc-dev',
                                 help="Name of the bucket the source data came from")
    cmd_line_parser.add_argument('-m', '--bucket-perm', type=str, default='read/write',
                                 help="Bucket access permissions")
    cmd_line_parser.add_argument('-d', '--bq-dataset-storage', type=str, default='test',
                                 help="BigQuery Dataset for TCGA Project Data")

    args = cmd_line_parser.parse_args()

    bootstrap_user_data_schema(args.pub_feat_table, args.bq_dataset, args.bucket_name, args.bucket_perm, args.bq_dataset_storage)
    bootstrap_metadata_attr_mapping()
    bootstrap_file_data()

if __name__ == "__main__":
    main()
