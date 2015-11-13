import os
import MySQLdb

CLOUD_SQL_SETTINGS = {
    'host': '',
    'port': 0000,
    'db': '',
    'user': '',
    'password': ''
}

LOCAL_SQL_SETTINGS = {
    'host': '127.0.0.1',
    'port': 3306,
    'db': '',
    'user': '',
    'password': ''
}

if os.getenv('SETTINGS_MODE') == 'cloudsql':
    db = MySQLdb.connect(host=CLOUD_SQL_SETTINGS['host'],
                         port=CLOUD_SQL_SETTINGS['port'],
                         db=CLOUD_SQL_SETTINGS['db'],
                         user=CLOUD_SQL_SETTINGS['user'],
                         passwd=CLOUD_SQL_SETTINGS['password'])
else:
    db = MySQLdb.connect(host=LOCAL_SQL_SETTINGS['host'],
                         port=LOCAL_SQL_SETTINGS['port'],
                         db=LOCAL_SQL_SETTINGS['db'],
                         user=LOCAL_SQL_SETTINGS['user'],
                         passwd=LOCAL_SQL_SETTINGS['password'])

delete_str = 'DELETE FROM django_site WHERE id in (2, 3, 4);'
insert_str = 'INSERT INTO django_site (id, domain, name) VALUES (%s, %s, %s), (%s, %s, %s), (%s, %s, %s);'
insert_tuple = ('2', 'localhost:8000', 'localhost:8000')
insert_tuple += ('3', 'localhost:8080', 'localhost:8080')
insert_tuple += ('4', 'isb-cgc.appspot.com', 'isb-cgc.appspot.com')

cursor = db.cursor()
cursor.execute(delete_str)
cursor.execute(insert_str, insert_tuple)
db.commit()
