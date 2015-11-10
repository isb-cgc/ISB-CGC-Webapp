import os
import MySQLdb
from GenespotRE import secret_settings

db_settings = secret_settings.get('DATABASE')['default']
ssl = None
if db_settings['OPTIONS'] and db_settings['OPTIONS']['ssl']:
    ssl = db_settings['OPTIONS']['ssl']
db = MySQLdb.connect(host=db_settings['HOST'], port=db_settings['PORT'], db=db_settings['NAME'], user=db_settings['USER'], passwd=db_settings['PASSWORD'], ssl=ssl)

delete_str = 'DELETE FROM django_site WHERE id in (2, 3, 4);'
insert_str = 'INSERT INTO django_site (id, domain, name) VALUES (%s, %s, %s), (%s, %s, %s), (%s, %s, %s);'
insert_tuple = ('2', 'localhost:8000', 'localhost:8000')
insert_tuple += ('3', 'localhost:8080', 'localhost:8080')
insert_tuple += ('4', 'isb-cgc.appspot.com', 'isb-cgc.appspot.com')

cursor = db.cursor()
cursor.execute(delete_str)
cursor.execute(insert_str, insert_tuple)
db.commit()