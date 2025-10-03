import os
import tempfile

from django.contrib.auth import get_user_model
from django.test import TestCase

from users.customer_excel_utils import (
	CustomerExcelParser,
	create_customer_from_data,
	MAX_SHIPPING_MARK_LENGTH,
)


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
