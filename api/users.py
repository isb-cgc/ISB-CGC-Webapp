import json

import endpoints
from protorpc import messages
from protorpc import remote

# from django.contrib.auth.models import User
from api_helpers import *


class ExtraUserData(messages.Message):
    id = messages.StringField(1)
    name = messages.StringField(2)
    given_name = messages.StringField(3)
    family_name = messages.StringField(4)
    email = messages.StringField(5)
    picture = messages.StringField(6)
    link = messages.StringField(7)
    verified_email = messages.BooleanField(8)
    locale = messages.StringField(9)


class User(messages.Message):
    id = messages.StringField(1)
    last_login = messages.StringField(2)
    is_superuser = messages.StringField(3)
    username = messages.StringField(4)
    first_name = messages.StringField(5)
    last_name = messages.StringField(6)
    email = messages.StringField(7)
    is_staff = messages.StringField(8)
    is_active = messages.StringField(9)
    date_joined = messages.StringField(10)
    NIH_username = messages.StringField(11)
    dbGaP_authorized = messages.StringField(12)
    extra_data = messages.MessageField(ExtraUserData, 13)
    NIH_assertion_expiration = messages.StringField(14)


class UserList(messages.Message):
    items = messages.MessageField(User, 1, repeated=True)


User_Endpoints = endpoints.api(name='user_api', version='v1')

@User_Endpoints.api_class(resource_name='user_endpoints')
class User_Endpoints_API(remote.Service):


    GET_RESOURCE = endpoints.ResourceContainer(User)
    @endpoints.method(GET_RESOURCE, UserList,
                      path='users', http_method='GET', name='user.getUsers')
    def users_list(self, request):

        raw_keys = [k for k in User.__dict__.keys() if not k.startswith('_') and request.__getattribute__(k)]
        values = (request.__getattribute__(k) for k in raw_keys)
        keys = ('auth_user.id' if k == 'id' else k for k in raw_keys)
        query_dict = dict(zip(keys, values))


        query_str = 'SELECT ' \
                    'IF(TIMEDIFF(accounts_nih_user.NIH_assertion_expiration, UTC_TIMESTAMP()) > 0, accounts_nih_user.NIH_username, NULL) as NIH_username, ' \
                    'accounts_nih_user.NIH_assertion_expiration, ' \
                    'auth_user.date_joined, ' \
                    'accounts_nih_user.dbGaP_authorized, ' \
                    'auth_user.email, ' \
                    'socialaccount_socialaccount.extra_data, ' \
                    'auth_user.first_name, ' \
                    'auth_user.id, ' \
                    'auth_user.is_active, ' \
                    'auth_user.is_staff, ' \
                    'auth_user.is_superuser, ' \
                    'auth_user.last_login, ' \
                    'auth_user.last_name, ' \
                    'auth_user.username ' \
                    'FROM auth_user ' \
                    'left join socialaccount_socialaccount on auth_user.id=socialaccount_socialaccount.user_id ' \
                    'left join accounts_nih_user on auth_user.id=accounts_nih_user.user_id'

        query_tuple = ()
        if query_dict:
            query_str += ' where ' + '=%s and '.join(key for key in query_dict.keys()) + '=%s'
            query_tuple = tuple(value for value in query_dict.values())

        print '\nuser query_str:'
        print query_str

        try:
            db = sql_connection()
            cursor = db.cursor(MySQLdb.cursors.DictCursor)
            cursor.execute(query_str, query_tuple)
            data = []
            eud = None
            for row in cursor.fetchall():
                if row['extra_data'] is not None:
                    extra_json = json.loads(row['extra_data'], encoding='latin-1')
                    eud = ExtraUserData(
                        id=extra_json.get('id'),
                        name=extra_json.get('name').encode('utf-8').decode('utf-8'),
                        given_name=extra_json.get('given_name').encode('utf-8').decode('utf-8'),
                        family_name=extra_json.get('family_name').encode('utf-8').decode('utf-8'),
                        email=extra_json.get('email'),
                        picture=extra_json.get('picture'),
                        link=extra_json.get('link'),
                        verified_email=extra_json.get('verified_email'),
                        locale=extra_json.get('locale')
                    )
                else:
                    eud = ExtraUserData(
                        id='',
                        name='',
                        given_name='',
                        family_name='',
                        email='',
                        picture='',
                        link='',
                        verified_email=False,
                        locale=''
                    )
                data.append(User(id=str(row['id']),
                                 username=str(row['username']),
                                 first_name= row['first_name'].decode('latin-1').encode('utf-8').decode('utf-8'),
                                 last_name= row['last_name'].decode('latin-1').encode('utf-8').decode('utf-8'),
                                 email=str(row['email']),
                                 is_staff=str(row['is_staff']),
                                 is_active=str(row['is_active']),
                                 is_superuser=str(row['is_superuser']),
                                 last_login=str(row['last_login']),
                                 date_joined=str(row['date_joined']),
                                 NIH_username=str(row['NIH_username']),
                                 dbGaP_authorized=str(row['dbGaP_authorized']),
                                 extra_data=eud,
                                 NIH_assertion_expiration=str(row['NIH_assertion_expiration'])
                                 ))

            cursor.close()
            db.close()
            return UserList(items=data)
        except (IndexError, TypeError):
            raise endpoints.NotFoundException('User %s not found.' % (request.id,))
