from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import transaction
from django.utils import timezone
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
import pandas as pd
import hashlib
import os
import io
from django.http import HttpResponse
from typing import Dict, List, Any, Tuple

from .models import CargoContainer, CargoItem
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from users.models import CustomerUser


class ExcelUploadSerializer(serializers.Serializer):
    """Serializer for Excel file upload"""
    file = serializers.FileField()
    warehouse_location = serializers.ChoiceField(choices=['China', 'Ghana'], required=False)
    upload_type = serializers.ChoiceField(choices=['goods_received', 'sea_cargo'])
    container_id = serializers.CharField(required=False)  # For sea cargo uploads
    
    def validate_file(self, value):
        """Validate uploaded file"""
        if not value.name.endswith(('.xlsx', '.xls')):
            raise serializers.ValidationError("Only Excel files (.xlsx, .xls) are allowed.")
        
        # Check file size using centralized config (50MB limit)
        from excel_config import validate_file_size
        is_valid, error_msg = validate_file_size(value.size)
        if not is_valid:
            raise serializers.ValidationError(error_msg)
        
        return value

    def validate(self, data):
        """Cross-field validation"""
        upload_type = data.get('upload_type')
        warehouse_location = data.get('warehouse_location')
        container_id = data.get('container_id')
        
        # Goods received must have warehouse location
        if upload_type == 'goods_received' and not warehouse_location:
            raise serializers.ValidationError("Warehouse location is required for Goods Received uploads.")
        
        # Sea cargo can have container_id for container-specific uploads
        if upload_type == 'sea_cargo' and container_id:
            # Validate container exists
            try:
                CargoContainer.objects.get(container_id=container_id)
            except CargoContainer.DoesNotExist:
                raise serializers.ValidationError(f"Container {container_id} not found.")
        
        return data


class ExcelUploadProcessor:
    """Handles Excel file processing for both Goods Received and Sea Cargo"""
    
    def __init__(self, file, upload_type: str, warehouse_location: str = None, uploader_user_id: int = None, container_id: str = None):
        self.file = file
        self.upload_type = upload_type
        self.warehouse_location = warehouse_location
        self.uploader_user_id = uploader_user_id
        self.container_id = container_id
        self.file_name = file.name
        self.results = []
        self.summary = {
            'total_rows': 0,
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
        # Track duplicate rows within the same file for last-write-wins
        self.duplicate_tracker = {}
    
    def process(self) -> Dict[str, Any]:
        """Main processing method"""
        try:
            # Read Excel file, treating first row as header
            df = pd.read_excel(self.file, engine='openpyxl', header=0)
            
            if df.empty or len(df) == 0:
                return {
                    'success': False,
                    'error': 'No data rows found in the uploaded file.',
                    'results': [],
                    'summary': self.summary
                }
            
            self.summary['total_rows'] = len(df)
            
            # Process based on upload type
            if self.upload_type == 'goods_received':
                return self._process_goods_received(df)
            elif self.upload_type == 'sea_cargo':
                return self._process_sea_cargo(df)
            else:
                return {
                    'success': False,
                    'error': 'Invalid upload type.',
                    'results': [],
                    'summary': self.summary
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f'Failed to process file: {str(e)}',
                'results': [],
                'summary': self.summary
            }
    
    def _process_goods_received(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Process Goods Received Excel file according to specifications:
        Column Order (header text ignored, map by index):
        col[0] -> shipping_mark (string, required)
        col[1] -> date_of_receipt (date, required)
        col[2] -> date_of_loading (date, optional)
        col[3] -> description (string, optional)
        col[4] -> quantity (number, optional; default 0)
        col[5] -> (SKIP: specifications)
        col[6] -> cbm (decimal, optional; default 0)
        col[7] -> supplier_tracking_number (string, optional)
        """
        if not self.warehouse_location:
            return {
                'success': False,
                'error': 'Warehouse location is required for Goods Received uploads.',
                'results': [],
                'summary': self.summary
            }
        
        model_class = GoodsReceivedChina if self.warehouse_location == 'China' else GoodsReceivedGhana
        
        # First pass: collect all rows and handle duplicates (last-write-wins)
        processed_rows = {}
        
        for index, row in df.iterrows():
            row_number = index + 2  # +2 because pandas is 0-indexed and we skip header
            
            try:
                # Extract data by column index (header-agnostic)
                shipping_mark = self._get_column_value(row, 0, str, required=False)
                date_of_receipt = self._get_column_value(row, 1, 'date', required=True)
                date_of_loading = self._get_column_value(row, 2, 'date', required=False)
                description = self._get_column_value(row, 3, str, required=False, default='')
                quantity = self._get_column_value(row, 4, int, required=False, default=0)
                # col[5] is SKIPPED (specifications)
                cbm = self._get_column_value(row, 6, Decimal, required=False, default=Decimal('0'))
                supplier_tracking_number = self._get_column_value(row, 7, str, required=False, default='')
                
                if not shipping_mark:
                    self._add_error(row_number, "Shipping mark is required")
                    continue
                
                if not date_of_receipt:
                    self._add_error(row_number, "Date of receipt is required")
                    continue
                
                # Create duplicate key for within-file duplicate detection
                duplicate_key = f"{shipping_mark}_{self.warehouse_location}_{date_of_receipt}_{description}"
                
                # Store row data (last-write-wins for duplicates)
                processed_rows[duplicate_key] = {
                    'row_number': row_number,
                    'shipping_mark': shipping_mark,
                    'date_of_receipt': date_of_receipt,
                    'date_of_loading': date_of_loading,
                    'description': description,
                    'quantity': quantity,
                    'cbm': cbm,
                    'supplier_tracking_number': supplier_tracking_number,
                    'index': index
                }
                
            except Exception as e:
                self._add_error(row_number, str(e))
        
        # Second pass: process unique rows with database operations
        with transaction.atomic():
            for duplicate_key, row_data in processed_rows.items():
                row_number = row_data['row_number']
                
                try:
                    # Try to get existing customer - don't create automatically
                    customer = self._get_or_create_customer(row_data['shipping_mark'])
                    
                    # Generate unique key for idempotency
                    unique_key = self._generate_unique_key(
                        row_data['shipping_mark'], 
                        self.warehouse_location, 
                        row_data['date_of_receipt'].isoformat() if row_data['date_of_receipt'] else '', 
                        row_data['description'], 
                        self.file_name, 
                        row_data['index']
                    )
                    
                    # Check if record exists (more specific than before)
                    existing_record = model_class.objects.filter(
                        shipping_mark=row_data['shipping_mark'],
                        location='GUANGZHOU' if self.warehouse_location == 'China' else 'ACCRA',
                        description=row_data['description']
                    ).first()
                    
                    # Generate supplier tracking if not provided
                    supplier_tracking = row_data['supplier_tracking_number']
                    if not supplier_tracking:
                        supplier_tracking = f"UPL_{unique_key[:8]}"
                    
                    # Prepare data for model
                    data = {
                        'customer': customer,  # Can be None for unknown shipping marks
                        'shipping_mark': row_data['shipping_mark'],
                        'supply_tracking': supplier_tracking,
                        'cbm': row_data['cbm'],
                        'quantity': row_data['quantity'],
                        'description': row_data['description'],
                        'location': 'GUANGZHOU' if self.warehouse_location == 'China' else 'ACCRA',
                        'status': 'PENDING'
                    }
                    
                    if existing_record:
                        # Update existing record
                        for key, value in data.items():
                            setattr(existing_record, key, value)
                        existing_record.save()
                        self._add_success(row_number, "updated", f"Updated existing record for {row_data['shipping_mark']}")
                    else:
                        # Create new record
                        new_record = model_class.objects.create(**data)
                        self._add_success(row_number, "created", f"Created new record for {row_data['shipping_mark']}")
                
                except Exception as e:
                    self._add_error(row_number, str(e))
        
        return {
            'success': True,
            'results': self.results,
            'summary': self.summary
        }
    
    def _process_sea_cargo(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Process Sea Cargo Excel file according to specifications:
        
        For container-specific uploads (when container_id is provided):
        col[0] -> shipping_mark (string, required)
        col[1] -> date_of_loading (date, optional)
        col[2] -> description (string, optional)
        col[3] -> quantity (number, optional; default 0)
        col[4] -> cbm (decimal, optional; default 0)
        col[5] -> supplier_tracking_number (string, optional)
        
        For general uploads (no container_id provided):
        col[0] -> container_ref (string, required)
        col[1] -> shipping_mark (string, required)
        col[2] -> date_of_loading (date, optional)
        col[3] -> description (string, optional)
        col[4] -> quantity (number, optional; default 0)
        col[5] -> cbm (decimal, optional; default 0)
        col[6] -> supplier_tracking_number (string, optional)
        """
        
        # First pass: collect all rows and handle duplicates (last-write-wins)
        processed_rows = {}
        
        for index, row in df.iterrows():
            row_number = index + 2  # +2 because pandas is 0-indexed and we skip header
            
            try:
                if self.container_id:
                    # Container-specific upload format
                    shipping_mark = self._get_column_value(row, 0, str, required=False)
                    date_of_loading = self._get_column_value(row, 1, 'date', required=False)
                    description = self._get_column_value(row, 2, str, required=False, default='')
                    quantity = self._get_column_value(row, 3, int, required=False, default=0)
                    cbm = self._get_column_value(row, 4, Decimal, required=False, default=Decimal('0'))
                    supplier_tracking_number = self._get_column_value(row, 5, str, required=False, default='')
                    
                    # Use provided container
                    try:
                        container = CargoContainer.objects.get(container_id=self.container_id)
                        container_ref = self.container_id
                    except CargoContainer.DoesNotExist:
                        self._add_error(row_number, f"Container {self.container_id} not found")
                        continue
                else:
                    # General upload format with container reference
                    container_ref = self._get_column_value(row, 0, str, required=False)
                    shipping_mark = self._get_column_value(row, 1, str, required=False)
                    date_of_loading = self._get_column_value(row, 2, 'date', required=False)
                    description = self._get_column_value(row, 3, str, required=False, default='')
                    quantity = self._get_column_value(row, 4, int, required=False, default=0)
                    cbm = self._get_column_value(row, 5, Decimal, required=False, default=Decimal('0'))
                    supplier_tracking_number = self._get_column_value(row, 6, str, required=False, default='')
                    
                    if not container_ref:
                        self._add_error(row_number, "Container reference is required when no specific container is provided")
                        continue
                    
                    container = self._get_or_create_container(container_ref)
                
                if not shipping_mark:
                    self._add_error(row_number, "Shipping mark is required")
                    continue
                
                # Create duplicate key for within-file duplicate detection
                duplicate_key = f"{container_ref}_{shipping_mark}_{date_of_loading}_{description}"
                
                # Store row data (last-write-wins for duplicates)
                processed_rows[duplicate_key] = {
                    'row_number': row_number,
                    'container': container,
                    'container_ref': container_ref,
                    'shipping_mark': shipping_mark,
                    'date_of_loading': date_of_loading,
                    'description': description,
                    'quantity': quantity,
                    'cbm': cbm,
                    'supplier_tracking_number': supplier_tracking_number,
                    'index': index
                }
                
            except Exception as e:
                self._add_error(row_number, str(e))
        
        # Second pass: process unique rows with database operations
        with transaction.atomic():
            for duplicate_key, row_data in processed_rows.items():
                row_number = row_data['row_number']
                
                try:
                    # Try to get existing customer - don't create automatically  
                    customer = self._get_or_create_customer(row_data['shipping_mark'])
                    
                    # Skip cargo items for unknown shipping marks since CargoItem requires a client
                    if customer is None:
                        self._add_error(row_number, f"Unknown shipping mark: {row_data['shipping_mark']}. Please create customer first.")
                        continue
                    
                    # Generate unique key for idempotency
                    unique_key = self._generate_unique_key(
                        row_data['container_ref'], 
                        row_data['shipping_mark'],
                        row_data['date_of_loading'].isoformat() if row_data['date_of_loading'] else '',
                        row_data['description'], 
                        self.file_name, 
                        row_data['index']
                    )
                    
                    # Check if cargo item exists (using specific criteria for idempotency)
                    existing_item = CargoItem.objects.filter(
                        container=row_data['container'],
                        client=customer,
                        item_description=row_data['description']
                    ).first()
                    
                    # Prepare data for CargoItem
                    data = {
                        'container': row_data['container'],
                        'client': customer,
                        'item_description': row_data['description'],
                        'quantity': row_data['quantity'],
                        'cbm': row_data['cbm'],
                        'weight': None,  # Not provided in upload format
                        'status': 'pending'
                    }
                    
                    if existing_item:
                        # Update existing item
                        for key, value in data.items():
                            setattr(existing_item, key, value)
                        existing_item.save()
                        self._add_success(row_number, "updated", f"Updated cargo item for {row_data['shipping_mark']} in {row_data['container_ref']}")
                    else:
                        # Create new item
                        new_item = CargoItem.objects.create(**data)
                        self._add_success(row_number, "created", f"Created cargo item for {row_data['shipping_mark']} in {row_data['container_ref']}")
                
                except Exception as e:
                    self._add_error(row_number, str(e))
        
        return {
            'success': True,
            'results': self.results,
            'summary': self.summary
        }
    
    def _get_column_value(self, row, col_index: int, data_type, required: bool = False, default=None):
        """Get and validate column value by index - header agnostic approach"""
        try:
            # Check if column exists
            if col_index >= len(row) or pd.isna(row.iloc[col_index]):
                if required:
                    raise ValueError(f"Column {col_index + 1} is required but missing or empty")
                return default
            
            value = row.iloc[col_index]
            
            if data_type == str:
                result = str(value).strip() if value else default
                return result if result else default
            elif data_type == int:
                if pd.isna(value) or value == '':
                    return default
                return int(float(value))
            elif data_type == Decimal:
                if pd.isna(value) or value == '':
                    return default
                return Decimal(str(value))
            elif data_type == 'date':
                if pd.isna(value) or value == '':
                    return default
                
                # Handle various date formats
                if isinstance(value, str):
                    # Clean the string
                    value = value.strip()
                    if not value:
                        return default
                    
                    # Try common date formats
                    date_formats = [
                        '%Y-%m-%d',      # 2024-12-30
                        '%d/%m/%Y',      # 30/12/2024
                        '%m/%d/%Y',      # 12/30/2024
                        '%Y-%m-%d %H:%M:%S',  # 2024-12-30 12:00:00
                        '%d-%m-%Y',      # 30-12-2024
                        '%m-%d-%Y',      # 12-30-2024
                    ]
                    
                    for fmt in date_formats:
                        try:
                            return datetime.strptime(value, fmt).date()
                        except ValueError:
                            continue
                    
                    # If no format worked, raise error
                    raise ValueError(f"Unable to parse date: {value}")
                
                elif hasattr(value, 'date'):
                    # datetime object
                    return value.date()
                elif hasattr(value, 'to_pydatetime'):
                    # pandas datetime
                    return value.to_pydatetime().date()
                else:
                    # Try to convert to string and parse
                    return self._get_column_value(pd.Series([str(value)]), 0, 'date', required, default)
            
            return value
        
        except (ValueError, InvalidOperation) as e:
            if required:
                raise ValueError(f"Invalid value in column {col_index + 1}: {str(e)}")
            return default
    
    def _get_or_create_customer(self, shipping_mark: str) -> CustomerUser:
        """Get existing customer - do not create new ones automatically"""
        # Clean shipping mark
        shipping_mark = shipping_mark.strip()
        
        try:
            customer = CustomerUser.objects.get(shipping_mark=shipping_mark)
            return customer
        except CustomerUser.DoesNotExist:
            # Return None for unknown shipping marks - don't create automatically
            return None
    
    def _get_or_create_container(self, container_ref: str) -> CargoContainer:
        """Get existing container or create placeholder"""
        container_ref = container_ref.strip()
        
        container, created = CargoContainer.objects.get_or_create(
            container_id=container_ref,
            defaults={
                'cargo_type': 'sea',  # Default to sea for uploads
                'load_date': date.today(),
                'eta': date.today(),
                'route': 'Auto-created from Excel Upload',
                'status': 'pending'
            }
        )
        
        if created:
            print(f"Created placeholder container: {container_ref}")
        
        return container
    
    def _generate_unique_key(self, *args) -> str:
        """Generate unique key for idempotency"""
        combined = '|'.join(str(arg) for arg in args)
        return hashlib.md5(combined.encode()).hexdigest()
    
    def _add_success(self, row_number: int, action: str, message: str):
        """Add successful result"""
        self.results.append({
            'row_number': row_number,
            'status': action,
            'message': message
        })
        self.summary[action] += 1
    
    def _add_error(self, row_number: int, message: str):
        """Add error result"""
        self.results.append({
            'row_number': row_number,
            'status': 'error',
            'message': message
        })
        self.summary['errors'] += 1


@method_decorator(csrf_exempt, name='dispatch')
class ExcelUploadView(APIView):
    """API view for Excel file uploads"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Handle Excel file upload"""
        try:
            # Debug logging
            print(f"Request method: {request.method}")
            print(f"Request data keys: {list(request.data.keys())}")
            print(f"Request FILES: {list(request.FILES.keys())}")
            print(f"User: {request.user}")
            print(f"Content type: {request.content_type}")
            
            # Simple validation first
            if 'file' not in request.data:
                print("No file in request")
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
                
            if 'upload_type' not in request.data:
                print("No upload_type in request")
                return Response({'error': 'No upload_type provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            serializer = ExcelUploadSerializer(data=request.data)
            
            if not serializer.is_valid():
                print(f"Serializer errors: {serializer.errors}")
                # Extract specific error message if available
                if 'non_field_errors' in serializer.errors:
                    error_message = serializer.errors['non_field_errors'][0]
                elif 'warehouse_location' in serializer.errors:
                    error_message = serializer.errors['warehouse_location'][0]
                else:
                    error_message = 'Invalid upload data'
                
                return Response(
                    {'error': error_message, 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            print("Serializer validation passed")
        except Exception as e:
            print(f"Exception in view: {e}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract validated data
        file = serializer.validated_data['file']
        upload_type = serializer.validated_data['upload_type']
        warehouse_location = serializer.validated_data.get('warehouse_location')
        container_id = serializer.validated_data.get('container_id')  # Keep as string
        
        # Validate warehouse location for goods received
        if upload_type == 'goods_received' and not warehouse_location:
            return Response(
                {'error': 'Warehouse location is required for Goods Received uploads'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process the file
        try:
            processor = ExcelUploadProcessor(
                file=file,
                upload_type=upload_type,
                warehouse_location=warehouse_location,
                uploader_user_id=request.user.id,
                container_id=container_id
            )
            
            print(f"Starting to process file with container_id: {container_id}")
            result = processor.process()
            print(f"Processing completed: {result}")
            
        except Exception as e:
            print(f"Error in processor: {e}")
            import traceback
            print(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': f'Processing failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if result['success']:
            return Response({
                'message': 'File processed successfully',
                'summary': result['summary'],
                'results': result['results']
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': result['error'],
                'summary': result['summary'],
                'results': result['results']
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class ContainerExcelUploadView(APIView):
    """API view for Excel file uploads to a specific container"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, container_id):
        """Handle Excel file upload for a specific container"""
        try:
            # Check if container exists
            try:
                container = CargoContainer.objects.get(container_id=container_id)
            except CargoContainer.DoesNotExist:
                return Response(
                    {'error': f'Container {container_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate file upload
            if 'file' not in request.data:
                return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            file = request.data['file']
            
            # Validate file type
            if not file.name.endswith(('.xlsx', '.xls')):
                return Response(
                    {'error': 'Only Excel files (.xlsx, .xls) are allowed.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check file size using centralized config (50MB limit)
            from excel_config import validate_file_size
            is_valid, error_msg = validate_file_size(file.size)
            if not is_valid:
                return Response({'error': error_msg}, status=status.HTTP_400_BAD_REQUEST)
            
            # OLD CODE - remove this if block
            if False and file.size > 10 * 1024 * 1024:
                return Response(
                    {'error': 'File size cannot exceed 10MB.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Process the file
            processor = ExcelUploadProcessor(
                file=file,
                upload_type='sea_cargo',
                warehouse_location=None,
                uploader_user_id=request.user.id,
                container_id=container_id
            )
            
            result = processor.process()
            
            if result['success']:
                # Update container totals after successful upload
                self._update_container_totals(container)
                
                return Response({
                    'message': f'File processed successfully for container {container_id}',
                    'summary': result['summary'],
                    'results': result['results']
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': result['error'],
                    'summary': result['summary'],
                    'results': result['results']
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            import traceback
            print(f"Exception in ContainerExcelUploadView: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            return Response({
                'error': f'Processing failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _update_container_totals(self, container):
        """Update container totals after cargo items are added"""
        cargo_items = container.cargo_items.all()
        total_cbm = sum(item.cbm for item in cargo_items if item.cbm)
        total_weight = sum(item.weight for item in cargo_items if item.weight)
        
        container.cbm = total_cbm
        container.weight = total_weight
        container.save()


@method_decorator(csrf_exempt, name='dispatch')
class ExcelTemplateView(APIView):
    """Generate Excel templates for upload"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Generate and return Excel template"""
        upload_type = request.query_params.get('type', 'goods_received')
        warehouse_location = request.query_params.get('warehouse', 'China')
        
        if upload_type == 'goods_received':
            return self._generate_goods_received_template(warehouse_location)
        elif upload_type == 'sea_cargo':
            return self._generate_sea_cargo_template()
        else:
            return Response(
                {'error': 'Invalid template type'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def _generate_goods_received_template(self, warehouse_location: str):
        """
        Generate Goods Received template with EXACT column specifications:
        Column Order (header text can be anything, mapping is by index):
        col[0] -> shipping_mark (string, required)
        col[1] -> date_of_receipt (date, required)
        col[2] -> date_of_loading (date, optional)
        col[3] -> description (string, optional)
        col[4] -> quantity (number, optional; default 0)
        col[5] -> specifications (SKIP this column entirely - but include in template)
        col[6] -> cbm (decimal, optional; default 0)
        col[7] -> supplier_tracking_number (string, optional)
        """
        # Create sample data with exact column order
        data = {
            'Shipping Mark': ['PMJOHN01', 'PMJANE02', 'PMTEST03'],
            'Date of Receipt': ['2024-12-30', '2024-12-31', '2025-01-01'],
            'Date of Loading': ['2025-01-05', '', '2025-01-03'],
            'Description': ['Electronics components', 'Furniture items', 'Textile goods'],
            'Quantity': [10, 5, 20],
            'Specifications': ['SKIP - This column is ignored', 'SKIP - This column is ignored', 'SKIP - This column is ignored'],
            'CBM': [2.5, 1.8, 4.2],
            'Supplier Tracking Number': ['TRK123456789', 'TRK987654321', '']
        }
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            sheet_name = f'{warehouse_location} Goods Template'
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Add instructions in a separate sheet
            instructions_data = {
                'Column Index': [0, 1, 2, 3, 4, 5, 6, 7],
                'Header Text': ['Shipping Mark', 'Date of Receipt', 'Date of Loading', 'Description', 'Quantity', 'Specifications', 'CBM', 'Supplier Tracking Number'],
                'Maps To': ['shipping_mark', 'date_of_receipt', 'date_of_loading', 'description', 'quantity', '(SKIPPED)', 'cbm', 'supplier_tracking_number'],
                'Required': ['YES', 'YES', 'NO', 'NO', 'NO', 'NO', 'NO', 'NO'],
                'Default Value': ['', '', '', "''", '0', 'N/A', '0', "''"],
                'Notes': [
                    'Customer unique identifier',
                    'Date goods received in warehouse',
                    'Date goods loaded for shipping',
                    'Description of goods',
                    'Number of items/pieces',
                    'This column is completely ignored',
                    'Cubic meters',
                    'Supplier tracking number'
                ]
            }
            
            instructions_df = pd.DataFrame(instructions_data)
            instructions_df.to_excel(writer, sheet_name='COLUMN MAPPING GUIDE', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="goods_received_{warehouse_location.lower()}_template.xlsx"'
        
        return response
    
    def _generate_sea_cargo_template(self):
        """
        Generate Sea Cargo template with EXACT column specifications:
        For general uploads (no specific container):
        col[0] -> container_ref (string, required)
        col[1] -> shipping_mark (string, required)
        col[2] -> date_of_loading (date, optional)
        col[3] -> description (string, optional)
        col[4] -> quantity (number, optional; default 0)
        col[5] -> cbm (decimal, optional; default 0)
        col[6] -> supplier_tracking_number (string, optional)
        """
        # Create sample data for general sea cargo upload
        data = {
            'Container Ref/Number': ['SEA001', 'SEA002', 'SEA003'],
            'Shipping Mark': ['PMJOHN01', 'PMJANE02', 'PMTEST03'],
            'Date of Loading': ['2025-01-05', '', '2025-01-07'],
            'Description': ['Mixed electronics', 'Furniture set', 'Textile goods'],
            'Quantity': [15, 8, 12],
            'CBM': [5.2, 3.8, 4.5],
            'Supplier Tracking Number': ['TRK555666777', 'TRK888999000', '']
        }
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Sea Cargo Template', index=False)
            
            # Add instructions
            instructions_data = {
                'Column Index': [0, 1, 2, 3, 4, 5, 6],
                'Header Text': ['Container Ref/Number', 'Shipping Mark', 'Date of Loading', 'Description', 'Quantity', 'CBM', 'Supplier Tracking Number'],
                'Maps To': ['container_ref', 'shipping_mark', 'date_of_loading', 'description', 'quantity', 'cbm', 'supplier_tracking_number'],
                'Required': ['YES', 'YES', 'NO', 'NO', 'NO', 'NO', 'NO'],
                'Default Value': ['', '', '', "''", '0', '0', "''"],
                'Notes': [
                    'Container identifier (creates if not exists)',
                    'Customer unique identifier',
                    'Date goods loaded into container',
                    'Description of cargo items',
                    'Number of items/pieces',
                    'Cubic meters',
                    'Supplier tracking number'
                ]
            }
            
            instructions_df = pd.DataFrame(instructions_data)
            instructions_df.to_excel(writer, sheet_name='COLUMN MAPPING GUIDE', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="sea_cargo_template.xlsx"'
        
        return response


@method_decorator(csrf_exempt, name='dispatch')
class ContainerExcelTemplateView(APIView):
    """Generate Excel template for container cargo uploads"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, container_id=None):
        """
        Generate and return Excel template for container cargo upload
        For container-specific uploads:
        col[0] -> shipping_mark (string, required)
        col[1] -> date_of_loading (date, optional)
        col[2] -> description (string, optional)
        col[3] -> quantity (number, optional; default 0)
        col[4] -> cbm (decimal, optional; default 0)
        col[5] -> supplier_tracking_number (string, optional)
        """
        # Create sample data for container-specific upload
        data = {
            'Shipping Mark': ['PMJOHN01', 'PMJANE02', 'PMTEST03'],
            'Date of Loading': ['2025-01-05', '', '2025-01-07'],
            'Description': ['Electronics components', 'Furniture items', 'Textile goods'],
            'Quantity': [10, 5, 20],
            'CBM': [2.5, 1.8, 4.2],
            'Supplier Tracking Number': ['TRK123456789', 'TRK987654321', '']
        }
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            container_name = container_id if container_id else 'Container'
            sheet_name = f'{container_name} Cargo Template'
            df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Add instructions
            instructions_data = {
                'Column Index': [0, 1, 2, 3, 4, 5],
                'Header Text': ['Shipping Mark', 'Date of Loading', 'Description', 'Quantity', 'CBM', 'Supplier Tracking Number'],
                'Maps To': ['shipping_mark', 'date_of_loading', 'description', 'quantity', 'cbm', 'supplier_tracking_number'],
                'Required': ['YES', 'NO', 'NO', 'NO', 'NO', 'NO'],
                'Default Value': ['', '', "''", '0', '0', "''"],
                'Notes': [
                    'Customer unique identifier',
                    'Date goods loaded into container',
                    'Description of cargo items',
                    'Number of items/pieces',
                    'Cubic meters',
                    'Supplier tracking number'
                ]
            }
            
            instructions_df = pd.DataFrame(instructions_data)
            instructions_df.to_excel(writer, sheet_name='COLUMN MAPPING GUIDE', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f'container_{container_id}_cargo_template.xlsx' if container_id else 'container_cargo_template.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
