"""
Customer Excel Processing Utilities

Handles parsing and validation of Excel files for bulk customer upload.
Expected Excel format:
- Column A: Shipping Mark (required, unique)
- Column B: First Name (required)
- Column C: Last Name (required)
- Column D: Email (optional, must be valid if provided)
- Column E: Phone Number (required, unique)
"""

import openpyxl
import re
from typing import Dict, List, Optional, Tuple
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from users.models import CustomerUser


class CustomerExcelParser:
    """
    Handles parsing Excel files for customer data import.
    """
    
    def __init__(self):
        self.required_columns = ['shipping_mark', 'first_name', 'last_name', 'phone']
        self.optional_columns = ['email']
        self.all_columns = self.required_columns + self.optional_columns
        
    def parse_file(self, file_path: str) -> Dict:
        """
        Parse Excel file and extract customer data.
        
        Args:
            file_path: Path to the Excel file
            
        Returns:
            Dict with parsed results including valid candidates and errors
        """
        try:
            workbook = openpyxl.load_workbook(file_path, read_only=True)
            sheet = workbook.active
            
            results = {
                'candidates': [],
                'invalid_rows': [],
                'total_rows': 0,
                'valid_candidates': 0
            }
            
            # Process rows (skip header if exists)
            row_number = 0
            for row in sheet.iter_rows(min_row=1, values_only=True):
                row_number += 1
                
                # Skip empty rows
                if not any(cell for cell in row if cell is not None):
                    continue
                    
                # Skip header row (if first row looks like headers)
                if row_number == 1 and self._is_header_row(row):
                    continue
                    
                results['total_rows'] += 1
                
                # Parse and validate row
                parsed_row = self._parse_row(row, row_number)
                
                if parsed_row['valid']:
                    results['candidates'].append(parsed_row['data'])
                    results['valid_candidates'] += 1
                else:
                    results['invalid_rows'].append({
                        'source_row_number': row_number,
                        'reason': parsed_row['error'],
                        'raw_data': list(row)[:5]  # First 5 columns only
                    })
            
            workbook.close()
            return results
            
        except Exception as e:
            return {
                'candidates': [],
                'invalid_rows': [{'source_row_number': 0, 'reason': f'File parsing error: {str(e)}', 'raw_data': []}],
                'total_rows': 0,
                'valid_candidates': 0
            }
    
    def _is_header_row(self, row: Tuple) -> bool:
        """
        Check if this row appears to be a header row.
        """
        if not row or len(row) < 3:
            return False
            
        # Convert to strings and check for header-like content
        row_strings = [str(cell).lower() if cell is not None else '' for cell in row[:5]]
        
        header_indicators = [
            'shipping', 'mark', 'first', 'name', 'last', 'email', 'phone', 'number'
        ]
        
        # If any of the first 3 cells contain header indicators, it's likely a header
        for cell in row_strings[:3]:
            if any(indicator in cell for indicator in header_indicators):
                return True
                
        return False
    
    def _parse_row(self, row: Tuple, row_number: int) -> Dict:
        """
        Parse and validate a single row of data.
        
        Args:
            row: Tuple of cell values
            row_number: Row number for error reporting
            
        Returns:
            Dict with validation results and parsed data
        """
        try:
            # Extract values (handle None values)
            raw_data = list(row)
            if len(raw_data) < 5:
                raw_data.extend([None] * (5 - len(raw_data)))
            
            shipping_mark = self._clean_string(raw_data[0])
            first_name = self._clean_string(raw_data[1])
            last_name = self._clean_string(raw_data[2])
            email = self._clean_string(raw_data[3])
            phone = self._clean_phone(raw_data[4])
            
            # Validate required fields
            if not shipping_mark:
                return {'valid': False, 'error': 'Shipping mark is required'}
                
            if not first_name:
                return {'valid': False, 'error': 'First name is required'}
                
            if not last_name:
                return {'valid': False, 'error': 'Last name is required'}
                
            if not phone:
                return {'valid': False, 'error': 'Phone number is required'}
            
            # Validate shipping mark format
            if not self._validate_shipping_mark(shipping_mark):
                return {'valid': False, 'error': f'Invalid shipping mark format: {shipping_mark}'}
            
            # Validate phone number
            if not self._validate_phone(phone):
                return {'valid': False, 'error': f'Invalid phone number format: {phone}'}
            
            # Validate email if provided
            if email and not self._validate_email(email):
                return {'valid': False, 'error': f'Invalid email format: {email}'}
            
            # Create candidate data
            candidate_data = {
                'source_row_number': row_number,
                'shipping_mark': shipping_mark,
                'shipping_mark_normalized': self._normalize_shipping_mark(shipping_mark),
                'first_name': first_name,
                'last_name': last_name,
                'email': email,
                'phone': phone,
                'phone_normalized': self._normalize_phone(phone)
            }
            
            return {'valid': True, 'data': candidate_data}
            
        except Exception as e:
            return {'valid': False, 'error': f'Row parsing error: {str(e)}'}
    
    def _clean_string(self, value) -> Optional[str]:
        """Clean and normalize string values."""
        if value is None:
            return None
        
        # Convert to string and strip whitespace
        cleaned = str(value).strip()
        
        # Return None for empty strings
        return cleaned if cleaned else None
    
    def _clean_phone(self, value) -> Optional[str]:
        """Clean and normalize phone number."""
        if value is None:
            return None
            
        # Convert to string and remove all non-digit characters except +
        phone_str = str(value).strip()
        
        # Remove spaces, dashes, parentheses, etc.
        cleaned = re.sub(r'[^\d+]', '', phone_str)
        
        return cleaned if cleaned else None
    
    def _validate_shipping_mark(self, shipping_mark: str) -> bool:
        """Validate shipping mark format."""
        if not shipping_mark:
            return False
            
        # Should be alphanumeric with possible spaces, dashes, or underscores
        # Length should be reasonable (3-20 characters)
        if len(shipping_mark) < 2 or len(shipping_mark) > 20:
            return False
            
        # Allow letters, numbers, spaces, dashes, underscores
        pattern = r'^[A-Za-z0-9\s\-_]+$'
        return bool(re.match(pattern, shipping_mark))
    
    def _validate_phone(self, phone: str) -> bool:
        """Validate phone number format."""
        if not phone:
            return False
            
        # Should be digits with optional country code
        # Accept 10-15 digit numbers (with or without + prefix)
        pattern = r'^\+?[\d]{10,15}$'
        return bool(re.match(pattern, phone))
    
    def _validate_email(self, email: str) -> bool:
        """Validate email format using Django's validator."""
        try:
            validate_email(email)
            return True
        except ValidationError:
            return False
    
    def _normalize_shipping_mark(self, shipping_mark: str) -> str:
        """Normalize shipping mark for comparison."""
        if not shipping_mark:
            return ""
            
        # Convert to uppercase, remove extra spaces
        normalized = re.sub(r'\s+', ' ', shipping_mark.upper().strip())
        return normalized
    
    def _normalize_phone(self, phone: str) -> str:
        """Normalize phone number for comparison."""
        if not phone:
            return ""
            
        # Remove all non-digits except leading +
        if phone.startswith('+'):
            return '+' + re.sub(r'[^\d]', '', phone[1:])
        else:
            return re.sub(r'[^\d]', '', phone)


class CustomerDuplicateChecker:
    """
    Handles checking for duplicate customers during import.
    """
    
    def __init__(self):
        pass
    
    def check_duplicates(self, candidates: List[Dict]) -> Dict:
        """
        Check for duplicate customers in database and within the upload batch.
        
        Args:
            candidates: List of parsed customer candidates
            
        Returns:
            Dict with duplicate analysis results
        """
        results = {
            'existing_duplicates': [],  # Already exist in database
            'batch_duplicates': [],     # Duplicates within the batch
            'unique_candidates': []     # Clean candidates ready for creation
        }
        
        # Check against existing database records
        for candidate in candidates:
            existing_shipping_mark = CustomerUser.objects.filter(
                shipping_mark=candidate['shipping_mark_normalized']
            ).first()
            
            existing_phone = CustomerUser.objects.filter(
                phone=candidate['phone_normalized']
            ).first()
            
            existing_email = None
            if candidate['email']:
                existing_email = CustomerUser.objects.filter(
                    email=candidate['email']
                ).first()
            
            if existing_shipping_mark or existing_phone or existing_email:
                duplicate_reasons = []
                if existing_shipping_mark:
                    duplicate_reasons.append('shipping mark')
                if existing_phone:
                    duplicate_reasons.append('phone number')
                if existing_email:
                    duplicate_reasons.append('email')
                
                results['existing_duplicates'].append({
                    'candidate': candidate,
                    'reason': f"Duplicate {', '.join(duplicate_reasons)}",
                    'existing_customers': {
                        'shipping_mark_match': existing_shipping_mark.id if existing_shipping_mark else None,
                        'phone_match': existing_phone.id if existing_phone else None,
                        'email_match': existing_email.id if existing_email else None
                    }
                })
            else:
                results['unique_candidates'].append(candidate)
        
        # Check for duplicates within the batch
        seen_shipping_marks = set()
        seen_phones = set()
        seen_emails = set()
        final_unique = []
        
        for candidate in results['unique_candidates']:
            is_duplicate = False
            duplicate_reasons = []
            
            shipping_mark_norm = candidate['shipping_mark_normalized']
            phone_norm = candidate['phone_normalized']
            email = candidate['email']
            
            if shipping_mark_norm in seen_shipping_marks:
                is_duplicate = True
                duplicate_reasons.append('shipping mark')
            
            if phone_norm in seen_phones:
                is_duplicate = True
                duplicate_reasons.append('phone number')
                
            if email and email in seen_emails:
                is_duplicate = True
                duplicate_reasons.append('email')
            
            if is_duplicate:
                results['batch_duplicates'].append({
                    'candidate': candidate,
                    'reason': f"Duplicate {', '.join(duplicate_reasons)} within batch"
                })
            else:
                # Add to seen sets
                seen_shipping_marks.add(shipping_mark_norm)
                seen_phones.add(phone_norm)
                if email:
                    seen_emails.add(email)
                    
                final_unique.append(candidate)
        
        results['unique_candidates'] = final_unique
        return results


def process_customer_excel_upload(file_path: str) -> Dict:
    """
    Main function to process customer Excel upload.
    
    Args:
        file_path: Path to the uploaded Excel file
        
    Returns:
        Dict with complete processing results
    """
    # Parse the Excel file
    parser = CustomerExcelParser()
    parse_results = parser.parse_file(file_path)
    
    if not parse_results['candidates']:
        return {
            'success': False,
            'parsing_results': parse_results,
            'duplicate_results': None,
            'message': 'No valid customer data found in Excel file'
        }
    
    # Check for duplicates
    duplicate_checker = CustomerDuplicateChecker()
    duplicate_results = duplicate_checker.check_duplicates(parse_results['candidates'])
    
    return {
        'success': True,
        'parsing_results': parse_results,
        'duplicate_results': duplicate_results,
        'message': f'Processed {len(parse_results["candidates"])} candidates, {len(duplicate_results["unique_candidates"])} ready for import'
    }