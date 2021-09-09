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

from django.test import TestCase
from django.contrib.auth.models import AnonymousUser, User

from cohorts.models import Cohort


class ModelTest(TestCase):
    def setUp(self):
        # We need 2 users to test permissions
        self.test_cohort_owner = User.objects.create_user(username='test_user', email='test_user_email@isb-cgc.org',
                                                      password='Itsasecrettoeveryone!2')

        self.test_other_user = User.objects.create_user(username='test_user_2', email='test_user_2_email@isb-cgc.org',
                                                      password='Itsasecrettoeveryone!2')

    def test_make_cohort(self):
        print("A test to make a cohort!")
        self.assertEqual(self.test_cohort_owner.username, 'test_user')
