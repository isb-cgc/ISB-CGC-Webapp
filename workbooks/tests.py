from django.test import TestCase
from workbooks.models import Workbook

# Create your tests here.


class WorkBooTestCase(TestCase):
    def setUp(self):
        Workbook.objects.create(name="TestWorkbook", description="A test workbook")

    def test_workbook_test_is_running(self):
        print("The workbook test ran!")
        testwb = Workbook.object.get(name="TestWorkbook")
        self.assertIsEqual(testwb.name, "TestWorkbook")
