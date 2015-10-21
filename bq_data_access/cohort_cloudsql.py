from api.api_helpers import sql_connection

from MySQLdb.cursors import DictCursor

DJANGO_COHORT_TABLE = 'cohorts_samples'
DJANGO_COHORT_INFO_TABLE = 'cohorts_cohort'
DJANGO_COHORT_SAMPLES_TABLE = 'cohorts_samples'

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
        query = 'SELECT sample_id AS barcode FROM {cohort_table} WHERE cohort_id IN ({cohort_id_stmt})'.format(
            cohort_table=DJANGO_COHORT_TABLE,
            cohort_id_stmt=cohort_id_stmt)
        values = cohort_id_array
        try:
            db = sql_connection()
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
    def get_cohorts_for_datapoints(cls, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join(['%s' for x in xrange(len(cohort_id_array))])

        query = 'SELECT sample_id, cohort_id FROM {cohort_samples_table} WHERE cohort_id IN ({cohort_id_stmt})'.format(
            cohort_samples_table=DJANGO_COHORT_SAMPLES_TABLE,
            cohort_id_stmt=cohort_id_stmt)

        values = cohort_id_array
        try:
            db = sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(values))

            result = cursor.fetchall()
            cohort_per_samples = {}

            for row in result:
                cohort_id, sample_id = row['cohort_id'], row['sample_id']
                if sample_id not in cohort_per_samples:
                    cohort_per_samples[sample_id] = []
                cohort_per_samples[sample_id].append(cohort_id)

            cursor.close()
            db.close()

            return cohort_per_samples

        except Exception as e:
            raise CohortException('get_cohorts_for_datapoints CloudSQL error, cohort IDs {cohort_ids}: {message}'.format(
                cohort_ids=cohort_id_array,
                message=str(e.message)))

    @classmethod
    def get_cohort_info(cls, cohort_id_array):
        # Generate the 'IN' statement string: (%s, %s, ..., %s)
        cohort_id_stmt = ', '.join(['%s' for x in xrange(len(cohort_id_array))])

        query = 'SELECT id, name FROM {cohort_info_table} WHERE id IN ({cohort_id_stmt})'.format(
            cohort_info_table=DJANGO_COHORT_INFO_TABLE,
            cohort_id_stmt=cohort_id_stmt)
        try:
            db = sql_connection()
            cursor = db.cursor(DictCursor)
            cursor.execute(query, tuple(cohort_id_array))

            result = []

            for row in cursor.fetchall():
                result.append({
                    'id': row['id'],
                    'name': row['name']
                })

            cursor.close()
            db.close()

            return result

        except Exception as e:
            raise CohortException('get_cohort_info CloudSQL error, cohort IDs {cohort_ids}: {message}'.format(
                cohort_ids=cohort_id_array,
                message=str(e.message)))

def main():
    cohort_id_array = [2, 4, 5]
    samples = CloudSQLCohortAccess.get_cohorts_for_datapoints(cohort_id_array)
    from json import dumps as json_dumps
    print(json_dumps(samples, indent=2, sort_keys=True))


if __name__ == '__main__':
    main()