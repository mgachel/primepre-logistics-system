"""
New Excel upload views for container items with shipping mark matching.
Handles Excel file processing, shipping mark matching, and batch item creation.
"""
import tempfile
import os
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.db import models
from .models import CargoContainer, CargoItem
from .excel_utils import ExcelRowParser
from .shipping_mark_matcher import process_excel_upload
import logging

logger = logging.getLogger(__name__)
CustomerUser = get_user_model()


class ContainerExcelUploadSerializer(serializers.Serializer):
    """Serializer for container Excel file upload"""
    file = serializers.FileField(help_text="Excel file (.xlsx) with container items")
    # container_id comes from URL path, not form data
    
    def validate_file(self, value):
        """Validate that the uploaded file is an Excel file"""
        if not value.name.lower().endswith(('.xlsx', '.xls')):
            raise serializers.ValidationError("File must be an Excel file (.xlsx or .xls)")
        
        # Check file size (limit to 10MB)
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("File size must be less than 10MB")
        
        return value


class ContainerItemMappingSerializer(serializers.Serializer):
    """Serializer for handling unmatched shipping mark resolution"""
    unmatched_item_id = serializers.CharField(help_text="ID of the unmatched item from previous upload")
    action = serializers.ChoiceField(
        choices=['map_existing', 'create_new', 'skip'],
        help_text="Action to take for this unmatched item"
    )
    customer_id = serializers.IntegerField(
        required=False,
        help_text="Customer ID when action is 'map_existing'"
    )
    new_customer_data = serializers.DictField(
        required=False,
        help_text="New customer data when action is 'create_new'"
    )
    
    def validate(self, data):
        """Cross-field validation"""
        action = data.get('action')
        
        if action == 'map_existing' and not data.get('customer_id'):
            raise serializers.ValidationError({
                'customer_id': 'Customer ID is required when mapping to existing customer'
            })
        
        if action == 'create_new' and not data.get('new_customer_data'):
            raise serializers.ValidationError({
                'new_customer_data': 'Customer data is required when creating new customer'
            })
        
        return data


class ContainerExcelUploadView(APIView):
    """
    API endpoint for uploading Excel files with container items.
    Processes Excel files and returns matched/unmatched shipping marks.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, container_id):
        """
        Upload and process Excel file for container items.
        
        Expected columns:
        - A: Shipping Mark (required)
        - D: Description 
        - E: Quantity (required, positive integer)
        - G: CBM (optional, decimal)
        - H: Tracking Number (optional)
        """
        serializer = ContainerExcelUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = serializer.validated_data['file']
        # Use container_id from URL instead of form data
        # container_id = serializer.validated_data['container_id']
        
        # Validate container exists
        try:
            container = CargoContainer.objects.get(container_id=container_id)
        except CargoContainer.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Container {container_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Save uploaded file temporarily
        temp_file_path = None
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
                for chunk in uploaded_file.chunks():
                    temp_file.write(chunk)
                temp_file_path = temp_file.name
            
            # Parse Excel file
            parser = ExcelRowParser()
            parse_results = parser.parse_file(temp_file_path)
            
            if not parse_results['candidates']:
                return Response({
                    'success': False,
                    'error': 'No valid data rows found in Excel file',
                    'invalid_rows': parse_results['invalid_rows']
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Process shipping mark matching
            processing_results = process_excel_upload(
                container_id=container_id,
                candidates=parse_results['candidates']
            )
            
            # Return results for frontend processing
            response_data = {
                'success': True,
                'upload_id': self._generate_upload_id(container_id, len(parse_results['candidates'])),
                'parsing_results': {
                    'total_rows': parse_results['total_rows'],
                    'valid_candidates': len(parse_results['candidates']),
                    'invalid_rows': parse_results['invalid_rows']
                },
                'matching_results': {
                    'matched_items': processing_results['matched_items'],
                    'unmatched_items': processing_results['unmatched_items'],
                    'duplicate_tracking_numbers': processing_results['duplicate_tracking_numbers'],
                    'statistics': processing_results['statistics']
                }
            }
            
            # If there are unmatched items, store them temporarily for resolution
            if processing_results['unmatched_items']:
                self._store_unmatched_items(
                    response_data['upload_id'],
                    processing_results['unmatched_items']
                )
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error processing Excel upload: {e}")
            return Response({
                'success': False,
                'error': f'Failed to process Excel file: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        finally:
            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
    
    def _generate_upload_id(self, container_id: str, num_candidates: int) -> str:
        """Generate unique upload ID for tracking this upload session"""
        import hashlib
        import time
        
        content = f"{container_id}_{num_candidates}_{time.time()}"
        return hashlib.md5(content.encode()).hexdigest()[:12]
    
    def _store_unmatched_items(self, upload_id: str, unmatched_items: list):
        """Store unmatched items temporarily for later resolution"""
        from django.core.cache import cache
        
        # Store for 1 hour
        cache.set(f"unmatched_items_{upload_id}", unmatched_items, 3600)


class ContainerItemsCreateView(APIView):
    """
    API endpoint for creating cargo items after resolving unmatched shipping marks.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Create cargo items from matched items and resolved mappings.
        
        Expected payload:
        {
            "container_id": "CONTAINER123",
            "matched_items": [...],  // Items that were automatically matched
            "resolved_mappings": [...] // Admin resolution for unmatched items
        }
        """
        container_id = request.data.get('container_id')
        matched_items = request.data.get('matched_items', [])
        resolved_mappings = request.data.get('resolved_mappings', [])
        
        if not container_id:
            return Response({
                'success': False,
                'error': 'Container ID is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Validate container exists
            container = CargoContainer.objects.get(container_id=container_id)
        except CargoContainer.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Container {container_id} not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        created_items = []
        errors = []
        
        with transaction.atomic():
            # Process automatically matched items
            if matched_items:
                from .shipping_mark_matcher import ShippingMarkMatcher
                matcher = ShippingMarkMatcher(container_id)
                create_results = matcher.create_cargo_items(matched_items)
                created_items.extend(create_results['created_items'])
                errors.extend(create_results['errors'])
            
            # Process resolved mappings
            for mapping in resolved_mappings:
                try:
                    if mapping['action'] == 'skip':
                        continue
                    
                    # Get the unmatched item data
                    candidate = mapping.get('candidate')
                    if not candidate:
                        errors.append({
                            'error': 'Missing candidate data in resolved mapping',
                            'mapping': mapping
                        })
                        continue
                    
                    if mapping['action'] == 'map_existing':
                        customer = CustomerUser.objects.get(id=mapping['customer_id'])
                    elif mapping['action'] == 'create_new':
                        # Create new customer
                        customer_data = mapping['new_customer_data']
                        customer = CustomerUser.objects.create_user(
                            username=customer_data.get('username'),
                            email=customer_data.get('email', ''),
                            shipping_mark=customer_data.get('shipping_mark'),
                            phone=customer_data.get('phone', ''),
                            first_name=customer_data.get('first_name', ''),
                            last_name=customer_data.get('last_name', '')
                        )
                    else:
                        continue
                    
                    # Create cargo item
                    cargo_item = CargoItem(
                        container=container,
                        client=customer,
                        tracking_id=candidate['tracking_number'] or '',
                        item_description=candidate['description'],
                        quantity=candidate['quantity'],
                        cbm=candidate['cbm']
                    )
                    cargo_item.save()
                    
                    created_items.append({
                        'cargo_item_id': str(cargo_item.id),
                        'tracking_id': cargo_item.tracking_id,
                        'source_row_number': candidate['source_row_number'],
                        'customer_name': customer.get_full_name() or customer.phone,
                        'action_taken': mapping['action']
                    })
                    
                except Exception as e:
                    logger.error(f"Error creating cargo item from resolved mapping: {e}")
                    errors.append({
                        'error': str(e),
                        'mapping': mapping
                    })
        
        return Response({
            'success': True,
            'created_items': created_items,
            'errors': errors,
            'statistics': {
                'total_created': len(created_items),
                'total_errors': len(errors)
            }
        }, status=status.HTTP_201_CREATED)


class CustomerSearchView(APIView):
    """
    API endpoint for searching customers by shipping mark or name.
    Used in the mapping resolution UI.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        Search customers for mapping resolution.
        
        Query parameters:
        - q: Search query (shipping mark or name)
        - limit: Maximum results (default 10)
        """
        query = request.query_params.get('q', '').strip()
        limit = min(int(request.query_params.get('limit', 10)), 50)  # Max 50 results
        
        if not query:
            return Response({
                'customers': []
            })
        
        # Search by shipping mark, name, email, phone
        customers = CustomerUser.objects.filter(
            models.Q(shipping_mark__icontains=query) |
            models.Q(first_name__icontains=query) |
            models.Q(last_name__icontains=query) |
            models.Q(email__icontains=query) |
            models.Q(phone__icontains=query)
        )[:limit]
        
        customer_data = []
        for customer in customers:
            customer_data.append({
                'id': customer.id,
                'shipping_mark': customer.shipping_mark or '',
                'name': customer.get_full_name() or customer.phone,
                'email': customer.email,
                'phone': customer.phone if hasattr(customer, 'phone') else ''
            })
        
        return Response({
            'customers': customer_data
        })