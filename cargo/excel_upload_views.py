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
from datetime import datetime
import pandas as pd
import hashlib
import os
from typing import Dict, List, Any, Tuple

from .models import CargoContainer, CargoItem
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from users.models import CustomerUser


class ExcelUploadSerializer(serializers.Serializer):
    """Serializer for Excel file upload"""
    file = serializers.FileField()
    warehouse_location = serializers.ChoiceField(choices=['China', 'Ghana'], required=False)
    upload_type = serializers.ChoiceField(choices=['goods_received', 'sea_cargo'])
    container_id = serializers.CharField(required=False)  # Accept container ID as string
    
    def validate_file(self, value):
        """Validate uploaded file"""
        if not value.name.endswith(('.xlsx', '.xls')):
            raise serializers.ValidationError("Only Excel files (.xlsx, .xls) are allowed.")
        
        # Check file size (10MB limit)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size cannot exceed 10MB.")
        
        return value


class ExcelUploadProcessor:
    """Handles Excel file processing for both Goods Received and Sea Cargo"""
    
    def __init__(self, file, upload_type: str, warehouse_location: str = None, uploader_user_id: int = None, container_id: str = None):
        self.file = file
        self.upload_type = upload_type
        self.warehouse_location = warehouse_location
        self.uploader_user_id = uploader_user_id
        self.container_id = container_id  # Keep as string since CargoContainer uses string primary key
        self.file_name = file.name
        self.results = []
        self.summary = {
            'total_rows': 0,
            'created': 0,
            'updated': 0,
            'skipped': 0,
            'errors': 0
        }
    
    def process(self) -> Dict[str, Any]:
        """Main processing method"""
        try:
            # Read Excel file
            df = pd.read_excel(self.file, engine='openpyxl')
            
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
        """Process Goods Received Excel file"""
        if not self.warehouse_location:
            return {
                'success': False,
                'error': 'Warehouse location is required for Goods Received uploads.',
                'results': [],
                'summary': self.summary
            }
        
        # Column mapping by index (header-agnostic)
        # col[0] -> shipping_mark
        # col[1] -> date_of_receipt  
        # col[2] -> date_of_loading
        # col[3] -> description
        # col[4] -> quantity
        # col[5] -> (SKIP: specifications)
        # col[6] -> cbm
        # col[7] -> supplier_tracking_number
        
        model_class = GoodsReceivedChina if self.warehouse_location == 'China' else GoodsReceivedGhana
        
        with transaction.atomic():
            for index, row in df.iterrows():
                row_number = index + 2  # +2 because pandas is 0-indexed and we skip header
                
                try:
                    # Extract data by column index
                    shipping_mark = self._get_column_value(row, 0, str, required=True)
                    date_of_receipt = self._get_column_value(row, 1, 'date', required=True)
                    date_of_loading = self._get_column_value(row, 2, 'date', required=False)
                    description = self._get_column_value(row, 3, str, required=False, default='')
                    quantity = self._get_column_value(row, 4, int, required=False, default=0)
                    # col[5] is skipped (specifications)
                    cbm = self._get_column_value(row, 6, Decimal, required=False, default=Decimal('0'))
                    supplier_tracking_number = self._get_column_value(row, 7, str, required=False, default='')
                    
                    if not shipping_mark:
                        self._add_error(row_number, "Shipping mark is required")
                        continue
                    
                    if not date_of_receipt:
                        self._add_error(row_number, "Date of receipt is required")
                        continue
                    
                    # Get or create customer
                    customer = self._get_or_create_customer(shipping_mark)
                    
                    # Generate unique key for idempotency
                    unique_key = self._generate_unique_key(
                        shipping_mark, self.warehouse_location, 
                        date_of_receipt.isoformat() if date_of_receipt else '', 
                        description, self.file_name, index
                    )
                    
                    # Check if record exists
                    existing_record = None
                    if self.warehouse_location == 'China':
                        existing_record = model_class.objects.filter(
                            shipping_mark=shipping_mark,
                            supply_tracking=supplier_tracking_number
                        ).first()
                    else:
                        existing_record = model_class.objects.filter(
                            shipping_mark=shipping_mark,
                            supply_tracking=supplier_tracking_number
                        ).first()
                    
                    # Prepare data
                    data = {
                        'customer': customer,
                        'shipping_mark': shipping_mark,
                        'supply_tracking': supplier_tracking_number or f"UPL_{unique_key[:8]}",
                        'cbm': cbm,
                        'quantity': quantity,
                        'description': description,
                        'location': 'GUANGZHOU' if self.warehouse_location == 'China' else 'ACCRA',
                        'status': 'PENDING'
                    }
                    
                    if existing_record:
                        # Update existing record
                        for key, value in data.items():
                            if key != 'customer':  # Don't update customer FK directly
                                setattr(existing_record, key, value)
                        existing_record.save()
                        self._add_success(row_number, "updated", f"Updated existing record for {shipping_mark}")
                    else:
                        # Create new record
                        new_record = model_class.objects.create(**data)
                        self._add_success(row_number, "created", f"Created new record for {shipping_mark}")
                
                except Exception as e:
                    self._add_error(row_number, str(e))
        
        return {
            'success': True,
            'results': self.results,
            'summary': self.summary
        }
    
    def _process_sea_cargo(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Process Sea Cargo Excel file"""
        # Column mapping by index (header-agnostic)
        # For container-specific uploads:
        # col[0] -> shipping_mark (required)
        # col[1] -> description
        # col[2] -> quantity
        # col[3] -> cbm
        # col[4] -> weight (optional)
        # col[5] -> supplier_tracking_number (optional)
        
        # For general uploads with container reference:
        # col[0] -> container_ref
        # col[1] -> shipping_mark
        # col[2] -> description
        # col[3] -> quantity
        # col[4] -> cbm
        # col[5] -> weight (optional)
        # col[6] -> supplier_tracking_number (optional)
        
        with transaction.atomic():
            for index, row in df.iterrows():
                row_number = index + 2  # +2 because pandas is 0-indexed and we skip header
                
                try:
                    if self.container_id:
                        # Container-specific upload format
                        shipping_mark = self._get_column_value(row, 0, str, required=True)
                        description = self._get_column_value(row, 1, str, required=False, default='')
                        quantity = self._get_column_value(row, 2, int, required=False, default=0)
                        cbm = self._get_column_value(row, 3, Decimal, required=False, default=Decimal('0'))
                        weight = self._get_column_value(row, 4, Decimal, required=False, default=None)
                        supplier_tracking_number = self._get_column_value(row, 5, str, required=False, default='')
                        
                        # Get the specified container
                        try:
                            container = CargoContainer.objects.get(container_id=self.container_id)
                        except CargoContainer.DoesNotExist:
                            self._add_error(row_number, f"Container {self.container_id} not found")
                            continue
                    else:
                        # General upload format with container reference
                        container_ref = self._get_column_value(row, 0, str, required=False)
                        shipping_mark = self._get_column_value(row, 1, str, required=True)
                        description = self._get_column_value(row, 2, str, required=False, default='')
                        quantity = self._get_column_value(row, 3, int, required=False, default=0)
                        cbm = self._get_column_value(row, 4, Decimal, required=False, default=Decimal('0'))
                        weight = self._get_column_value(row, 5, Decimal, required=False, default=None)
                        supplier_tracking_number = self._get_column_value(row, 6, str, required=False, default='')
                        
                        if not container_ref:
                            self._add_error(row_number, "Container reference is required when no specific container is provided")
                            continue
                        container = self._get_or_create_container(container_ref)
                    
                    if not shipping_mark:
                        self._add_error(row_number, "Shipping mark is required")
                        continue
                    
                    # Get or create customer
                    customer = self._get_or_create_customer(shipping_mark)
                    
                    # Generate unique key for idempotency
                    container_ref_for_key = container.container_id
                    unique_key = self._generate_unique_key(
                        container_ref_for_key, shipping_mark,
                        description, self.file_name, index
                    )
                    
                    # Check if cargo item exists (more specific check)
                    existing_item = CargoItem.objects.filter(
                        container=container,
                        client=customer,
                        item_description=description
                    ).first()
                    
                    # Prepare data
                    data = {
                        'container': container,
                        'client': customer,
                        'item_description': description,
                        'quantity': quantity,
                        'cbm': cbm,
                        'weight': weight,
                        'status': 'pending'
                    }
                    
                    if existing_item:
                        # Update existing item
                        for key, value in data.items():
                            setattr(existing_item, key, value)
                        existing_item.save()
                        self._add_success(row_number, "updated", f"Updated cargo item for {shipping_mark} in {container.container_id}")
                    else:
                        # Create new item
                        new_item = CargoItem.objects.create(**data)
                        self._add_success(row_number, "created", f"Created cargo item for {shipping_mark} in {container.container_id}")
                
                except Exception as e:
                    self._add_error(row_number, str(e))
        
        return {
            'success': True,
            'results': self.results,
            'summary': self.summary
        }
    
    def _get_column_value(self, row, col_index: int, data_type, required: bool = False, default=None):
        """Get and validate column value by index"""
        try:
            if col_index >= len(row) or pd.isna(row.iloc[col_index]):
                if required:
                    raise ValueError(f"Column {col_index} is required but missing")
                return default
            
            value = row.iloc[col_index]
            
            if data_type == str:
                return str(value).strip() if value else default
            elif data_type == int:
                return int(float(value)) if value else default
            elif data_type == Decimal:
                return Decimal(str(value)) if value else default
            elif data_type == 'date':
                if pd.isna(value):
                    return default
                # Try to parse various date formats
                if isinstance(value, str):
                    for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%d %H:%M:%S']:
                        try:
                            return datetime.strptime(value, fmt).date()
                        except ValueError:
                            continue
                    raise ValueError(f"Unable to parse date: {value}")
                elif hasattr(value, 'date'):
                    return value.date()
                elif hasattr(value, 'to_pydatetime'):
                    return value.to_pydatetime().date()
                else:
                    return default
            
            return value
        
        except (ValueError, InvalidOperation) as e:
            if required:
                raise ValueError(f"Invalid value in column {col_index}: {str(e)}")
            return default
    
    def _get_or_create_customer(self, shipping_mark: str) -> CustomerUser:
        """Get existing customer or create stub"""
        customer, created = CustomerUser.objects.get_or_create(
            shipping_mark=shipping_mark,
            defaults={
                'phone': f'+000{shipping_mark}',  # Placeholder phone
                'first_name': shipping_mark.replace('PM', ''),
                'last_name': 'Imported',
                'user_role': 'CUSTOMER',
                'is_active': True
            }
        )
        return customer
    
    def _get_or_create_container(self, container_ref: str) -> CargoContainer:
        """Get existing container or create placeholder"""
        from datetime import date
        
        container, created = CargoContainer.objects.get_or_create(
            container_id=container_ref,
            defaults={
                'cargo_type': 'sea',  # Default to sea for uploads
                'load_date': date.today(),
                'eta': date.today(),
                'route': 'Imported from Excel',
                'status': 'pending'
            }
        )
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
                return Response(
                    {'error': 'Invalid upload data', 'details': serializer.errors},
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
            
            # Check file size (10MB limit)
            if file.size > 10 * 1024 * 1024:
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
        """Generate Goods Received template"""
        import io
        from django.http import HttpResponse
        
        # Create sample data
        data = {
            'Shipping Mark': ['PMJOHN01', 'PMJANE02'],
            'Date of Receipt': ['2024-12-30', '2024-12-31'],
            'Date of Loading': ['2025-01-05', ''],
            'Description': ['Electronics components', 'Furniture items'],
            'Quantity': [10, 5],
            'Specifications': ['N/A', 'N/A'],  # This column will be skipped
            'CBM': [2.5, 1.8],
            'Supplier Tracking Number': ['TRK123456789', 'TRK987654321']
        }
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name=f'{warehouse_location} Goods Template', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="goods_received_{warehouse_location.lower()}_template.xlsx"'
        
        return response
    
    def _generate_sea_cargo_template(self):
        """Generate Sea Cargo template"""
        import io
        from django.http import HttpResponse
        
        # Create sample data for general sea cargo upload (with container reference)
        data = {
            'Container Ref/Number': ['SEA001', 'SEA002', 'SEA003'],
            'Shipping Mark': ['PMJOHN01', 'PMJANE02', 'PMTEST03'],
            'Description': ['Mixed electronics', 'Furniture set', 'Textile goods'],
            'Quantity': [15, 8, 12],
            'CBM': [5.2, 3.8, 4.5],
            'Weight (kg)': [200.5, 150.0, 180.3],
            'Supplier Tracking Number': ['TRK555666777', 'TRK888999000', 'TRK111222333']
        }
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Sea Cargo Template', index=False)
        
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
        """Generate and return Excel template for container cargo upload"""
        import io
        from django.http import HttpResponse
        
        # Create sample data for container-specific upload
        data = {
            'Shipping Mark': ['PMJOHN01', 'PMJANE02', 'PMTEST03'],
            'Description': ['Electronics components', 'Furniture items', 'Textile goods'],
            'Quantity': [10, 5, 20],
            'CBM': [2.5, 1.8, 4.2],
            'Weight (kg)': [150.5, 200.0, 300.5],
            'Supplier Tracking Number': ['TRK123456789', 'TRK987654321', 'TRK555444333']
        }
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            container_name = container_id if container_id else 'Container'
            df.to_excel(writer, sheet_name=f'{container_name} Cargo Template', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f'container_{container_id}_cargo_template.xlsx' if container_id else 'container_cargo_template.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
