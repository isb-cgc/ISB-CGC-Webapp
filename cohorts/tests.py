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

This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""
from django import http
from django.test import TestCase
from django.test.client import Client

from models import *

# class ModelTest(TestCase):
#     def setUp(self):
#         cohort1 = Cohort.objects.create(name='cohort 1')
#         cohort2 = Cohort.objects.create(name='cohort 2')
#         cohort3 = Cohort.objects.create(name='cohort 3')
#         cohort1.save()
#         cohort2.save()
#         cohort3.save()
#         source1 = Source.objects.create(parent=cohort3, cohort=cohort2, type=Source.FILTERS)
#         source2 = Source.objects.create(parent=cohort2, cohort=cohort1, type=Source.FILTERS)
#         source1.save()
#         source2.save()
#         filter1 = Filters.objects.create(resulting_cohort=cohort2, name='gender', value='male')
#         filter2 = Filters.objects.create(resulting_cohort=cohort1, name='age', value='30')
#         filter1.save()
#         filter2.save()
#
#     def test_cohort_filter_set(self):
#         cohort = Cohort.objects.all()[0]
#         self.assertEqual(len(cohort.get_filters()), 2)
#
#     def test_cohort_revision_history(self):
#         cohort = Cohort.objects.all()[0]
#         self.assertEqual(len(cohort.get_revision_history()), 2)

