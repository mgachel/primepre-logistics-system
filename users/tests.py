import os
import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse

from rest_framework.test import APITestCase

from users.customer_excel_utils import (
	CustomerExcelParser,
	create_customer_from_data,
	MAX_SHIPPING_MARK_LENGTH,
)
from users.models import CustomerBulkUploadTask, BulkUploadStatus


def create_excel_file(rows):
	import openpyxl

	workbook = openpyxl.Workbook()
	sheet = workbook.active

	headers = ['Shipping Mark', 'First Name', 'Last Name', 'Email', 'Phone Number']
	sheet.append(headers)

	for row in rows:
		sheet.append(row)

	temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
	workbook.save(temp_file.name)
	workbook.close()
	temp_file.close()
	return temp_file.name


class CustomerExcelParserTests(TestCase):
	def setUp(self):
		self.parser = CustomerExcelParser()

	def test_parse_restores_leading_zero_for_numeric_phone(self):
		rows = [
			['PM 1001', 'John', 'Doe', '', 241234567],
		]
		file_path = create_excel_file(rows)

		try:
			results = self.parser.parse_file(file_path)

			self.assertEqual(results['valid_candidates'], 1)
			candidate = results['candidates'][0]
			self.assertEqual(candidate['phone'], '0241234567')
			self.assertEqual(candidate['phone_normalized'], '0241234567')
		finally:
			os.unlink(file_path)

	def test_parse_keeps_string_phone_unchanged(self):
		rows = [
			['PM 1002', 'Jane', 'Doe', '', '0249876543'],
		]
		file_path = create_excel_file(rows)

		try:
			results = self.parser.parse_file(file_path)

			self.assertEqual(results['valid_candidates'], 1)
			candidate = results['candidates'][0]
			self.assertEqual(candidate['phone'], '0249876543')
			self.assertEqual(candidate['phone_normalized'], '0249876543')
		finally:
			os.unlink(file_path)


class CustomerCreationUtilsTests(TestCase):
	def setUp(self):
		self.user_model = get_user_model()
		self.parser = CustomerExcelParser()

	def test_create_customer_from_data_success(self):
		customer = create_customer_from_data({
			'shipping_mark': 'PM TEST',
			'first_name': 'Test',
			'last_name': 'Customer',
			'phone': '0241234567',
			'email': 'test@example.com',
		})

		self.assertIsInstance(customer, self.user_model)
		self.assertEqual(customer.shipping_mark, 'PM TEST')
		self.assertEqual(customer.phone, '0241234567')
		self.assertEqual(customer.email, 'test@example.com')

	def test_create_customer_requires_phone(self):
		with self.assertRaises(ValueError):
			create_customer_from_data({
				'shipping_mark': 'PM MISSING PHONE',
			})

	def test_parse_allows_long_shipping_mark(self):
		long_mark = 'PM ' + 'LONGNAME ' * 10  # deliberately long with spaces
		self.assertGreater(len(long_mark.strip()), 20)
		self.assertLessEqual(len(long_mark.strip()), MAX_SHIPPING_MARK_LENGTH)

		rows = [
			[long_mark, 'Lydia', 'Mensah', '', '0241234567'],
		]

		file_path = create_excel_file(rows)

		try:
			results = self.parser.parse_file(file_path)

			self.assertEqual(results['valid_candidates'], 1)
			candidate = results['candidates'][0]
			self.assertEqual(candidate['shipping_mark'], long_mark.strip())
		finally:
			os.unlink(file_path)


class CustomerBulkCreateStatusViewTests(APITestCase):

	def setUp(self):
		self.user_model = get_user_model()
		self.creator = self.user_model.objects.create_user(
			phone='0550000001',
			password='testpass123',
			first_name='Task',
			last_name='Owner',
			shipping_mark='PM OWNER',
			region='GREATER_ACCRA',
			user_role='ADMIN',
		)

	def test_returns_queued_status_for_new_task(self):
		tracker = CustomerBulkUploadTask.objects.create(
			task_id='queued-task-123',
			created_by=self.creator,
			status=BulkUploadStatus.QUEUED,
			total_customers=50,
			message='Task queued and awaiting a worker',
		)

		url = reverse('customer_bulk_create_status', args=[tracker.task_id])
		self.client.force_authenticate(user=self.creator)
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['status'], BulkUploadStatus.QUEUED)
		self.assertEqual(response.data['total_customers'], 50)
		self.assertFalse(response.data['is_complete'])
		self.assertFalse(response.data['is_failed'])

	def test_blocks_other_non_admin_users(self):
		tracker = CustomerBulkUploadTask.objects.create(
			task_id='secure-task-456',
			created_by=self.creator,
			status=BulkUploadStatus.RUNNING,
			total_customers=10,
		)

		other_user = self.user_model.objects.create_user(
			phone='0550000002',
			password='otherpass123',
			first_name='Other',
			last_name='User',
			shipping_mark='PM OTHER',
			region='GREATER_ACCRA',
			user_role='CUSTOMER',
		)

		url = reverse('customer_bulk_create_status', args=[tracker.task_id])
		self.client.force_authenticate(user=other_user)
		response = self.client.get(url)

		self.assertEqual(response.status_code, 403)
		self.assertEqual(response.data['status'], 'FORBIDDEN')

	def test_returns_completion_payload(self):
		tracker = CustomerBulkUploadTask.objects.create(
			task_id='complete-task-789',
			created_by=self.creator,
			status=BulkUploadStatus.COMPLETE,
			total_customers=5,
			created_count=5,
			failed_count=0,
			errors=[],
			message='Bulk creation complete',
		)

		url = reverse('customer_bulk_create_status', args=[tracker.task_id])
		self.client.force_authenticate(user=self.creator)
		response = self.client.get(url)

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data['is_complete'])
		self.assertEqual(response.data['created'], 5)
		self.assertEqual(response.data['progress_percent'], 100)
