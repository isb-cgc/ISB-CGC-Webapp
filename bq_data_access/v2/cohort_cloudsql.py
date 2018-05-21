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

import logging
import sys
import traceback

from MySQLdb.cursors import DictCursor
from cohorts.metadata_helpers import get_sql_connection

DJANGO_COHORT_TABLE = 'cohorts_samples'
DJANGO_COHORT_INFO_TABLE = 'cohorts_cohort'
DJANGO_COHORT_SAMPLES_TABLE = 'cohorts_samples'

logger = logging.getLogger('main_logger')

DATAPOINT_COHORT_THRESHOLD = 1


class CohortException(Exception):
    def __init__(self, message):
        self.message = message

    def __str__(self):
        return 'Cohort error: ' + self.message


class CloudSQLCohortAccess(object):
    @classmethod
    def parse_barcodes(cls, barcode_string):
        codes = barcode_string.replace('[', '').replace(']', '').replace('\'', '').replace(' ', '').split(',')
        return codes

    @classmethod
    def get_cohort_barcodes(cls, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join(['%s' for x in xrange(len(cohort_id_array))])
        query = 'SELECT sample_barcode AS barcode FROM {cohort_table} WHERE cohort_id IN ({cohort_id_stmt})'.format(
            cohort_table=DJANGO_COHORT_TABLE,
            cohort_id_stmt=cohort_id_stmt)
        values = cohort_id_array
        try:
            db = get_sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(values))

            result = cursor.fetchall()
            barcodes = []
            for row in result:
                barcodes.append(row['barcode'])
            cursor.close()
            db.close()

            # Return only unique barcodes
            return list(set(barcodes))

        except Exception as e:
            raise CohortException('get_cohort_barcodes CloudSQL error, cohort IDs {cohort_ids}: {message}'.format(
                cohort_ids=cohort_id_array,
                message=str(e.message)))
            raise CohortException('bad cohort: ' + str(cohort_id_array))

    @classmethod
    def get_cohorts_and_projects_for_datapoints(cls, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join(['%s' for x in xrange(len(cohort_id_array))])

        query = 'SELECT sample_barcode, cohort_id, project_id FROM {cohort_samples_table} WHERE cohort_id IN ({cohort_id_stmt})'.format(
            cohort_samples_table=DJANGO_COHORT_SAMPLES_TABLE,
            cohort_id_stmt=cohort_id_stmt)

        values = cohort_id_array
        try:
            db = get_sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(values))

            result = cursor.fetchall()
            cohort_per_samples = {}
            project_per_samples = {}

            for row in result:
                cohort_id, sample_barcode, project_id = row['cohort_id'], row['sample_barcode'], row['project_id']
                if sample_barcode not in cohort_per_samples:
                    cohort_per_samples[sample_barcode] = []
                cohort_per_samples[sample_barcode].append(cohort_id)
                if sample_barcode not in project_per_samples:
                    project_per_samples[sample_barcode] = []
                    project_per_samples[sample_barcode].append(project_id)

            cursor.close()
            db.close()

            return {'cohorts': cohort_per_samples, 'projects': project_per_samples}

        except Exception as e:
            logger.exception(e)
            raise CohortException('get_cohorts_for_datapoints CloudSQL error, cohort IDs {cohort_ids}: {message}'.format(
                cohort_ids=cohort_id_array,
                message=str(e.message)))

    @classmethod
    def get_cohort_info(cls, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join(['%s' for x in xrange(len(cohort_id_array))])

        query_template = ("SELECT ti.id AS cohort_id, ti.name, COUNT(ts.sample_barcode) AS size "
                          "FROM {cohort_info_table} ti "
                          "   LEFT JOIN {cohort_samples_table} ts ON ts.cohort_id = ti.id "
                          "WHERE ti.id IN ({cohort_id_stmt}) "
                          "GROUP BY ti.id, ti.name")

        query = query_template.format(
            cohort_info_table=DJANGO_COHORT_INFO_TABLE,
            cohort_samples_table=DJANGO_COHORT_SAMPLES_TABLE,
            cohort_id_stmt=cohort_id_stmt)

        try:
            db = get_sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(cohort_id_array))

            result = []

            for row in cursor.fetchall():
                result.append({
                    'id': row['cohort_id'],
                    'name': row['name'],
                    'size': row['size']
                })

            cursor.close()
            db.close()

            return result

        except Exception as e:
            logger.error("[ERROR] In get_cohort_info: ")
            logger.exception(e)
            raise CohortException('get_cohort_info CloudSQL error, cohort IDs {cohort_ids}: {message}'.format(
                cohort_ids=cohort_id_array,
                message=str(e.message)))


def add_cohort_info_to_merged_vectors(data, x_id, y_id, c_id, cohort_id_array):
    """
    Adds cohort information to a plot data query result (dict).
     
    Args: 
        data: Plot data query result (from get_merged_feature_vectors)
    
    Returns: 
        None
    """
    # Resolve which (requested) cohorts each datapoint belongs to.
    cohort_proj_dict_set = CloudSQLCohortAccess.get_cohorts_and_projects_for_datapoints(cohort_id_array)

    cohort_set_dict = cohort_proj_dict_set['cohorts']
    project_set_dict = cohort_proj_dict_set['projects']

    # Get the name and ID for every requested cohort.
    cohort_info_array = CloudSQLCohortAccess.get_cohort_info(cohort_id_array)
    cohort_info_obj_array = []
    for item in cohort_info_array:
        cohort_info_obj_array.append({'id': item['id'], 'name': item['name']})

    items = []
    for item in data['items']:
        sample_id = item['sample_id']

        # Add an array of cohort
        # only if the number of containing cohort exceeds the configured threshold.
        cohort_set = []
        # TODO FIX - this check shouldn't be needed
        if sample_id in cohort_set_dict:
            cohort_set = cohort_set_dict[sample_id]

        if len(cohort_set) >= DATAPOINT_COHORT_THRESHOLD:
            item['cohort'] = cohort_set

        if sample_id in project_set_dict:
            item['project'] = project_set_dict[sample_id]

        items.append(item)

    # TODO assign label for y if y_id is None, as in that case the y-field will be missing from the response
    label_message = {'x': x_id, 'y': y_id, 'c': c_id}

    data.update({
        'labels':           label_message,
        'items':            items,
        'cohort_set':       cohort_info_obj_array,
    })

