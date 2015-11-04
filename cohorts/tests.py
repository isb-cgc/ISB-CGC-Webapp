"""
This file demonstrates writing tests using the unittest module. These will pass
when you run "manage.py test".

Replace this with more appropriate tests for your application.
"""
from django import http
from django.test import TestCase
from django.test.client import Client

from models import *

class CorhotsViewsTestCase(TestCase):
    def setUp(self):
        self.c = Client()

    def test_index(self):
        resp = self.c.get('/css_test/')
        self.assertEqual(resp.status_code, 200)

class ModelTest(TestCase):
    def setUp(self):
        cohort1 = Cohort.objects.create(name='cohort 1')
        cohort2 = Cohort.objects.create(name='cohort 2')
        cohort3 = Cohort.objects.create(name='cohort 3')
        cohort1.save()
        cohort2.save()
        cohort3.save()
        source1 = Source.objects.create(parent=cohort3, cohort=cohort2, type=Source.FILTERS)
        source2 = Source.objects.create(parent=cohort2, cohort=cohort1, type=Source.FILTERS)
        source1.save()
        source2.save()
        filter1 = Filters.objects.create(resulting_cohort=cohort2, name='gender', value='male')
        filter2 = Filters.objects.create(resulting_cohort=cohort1, name='age', value='30')
        filter1.save()
        filter2.save()

    def test_cohort_filter_set(self):
        cohort = Cohort.objects.all()[0]
        self.assertEqual(len(cohort.get_filters()), 2)

    def test_cohort_revision_history(self):
        cohort = Cohort.objects.all()[0]
        self.assertEqual(len(cohort.get_revision_history()), 2)

