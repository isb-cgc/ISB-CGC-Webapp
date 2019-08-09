from django.test import TestCase
from workbooks.models import Workbook
from django.contrib.auth.models import AnonymousUser, User

# Create your tests here.


class WorkBookTestCase(TestCase):
    def setUp(self):
        self.test_wb_owner = User.objects.create_user(username='test_user', email='test_user_email@isb-cgc.org', password='itsasecrettoeveryone')

    def test_make_workbook(self):
        Workbook.objects.create(name="TestWorkbook", description="A test workbook", owner=self.test_wb_owner)
        testwb = Workbook.object.get(name="TestWorkbook")
        self.assertIsEqual(testwb.name, "TestWorkbook")
