"""
New Excel upload views for container items with shipping mark matching.
Handles Excel file processing, shipping mark matching, and batch item creation.
"""
import tempfile
import os
import re
from rest_framework import serializers, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.db import models
from django.db.models import F, Value, Case, When, IntegerField
from django.db.models.functions import Upper, Replace
from .models import CargoContainer, CargoItem, ClientShipmentSummary
from .excel_utils import ExcelRowParser
from .shipping_mark_matcher import process_excel_upload
from users.customer_excel_utils import create_customer_from_data
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
                action = (mapping or {}).get('action')
                if action == 'skip':
                    continue

                candidate = (mapping or {}).get('candidate') or {}
                source_row = candidate.get('source_row_number')

                if not candidate:
                    errors.append({
                        'error': 'Missing candidate data in resolved mapping',
                        'mapping': mapping
                    })
                    continue

                try:
                    with transaction.atomic():
                        if action == 'map_existing':
                            customer_id = mapping.get('customer_id')
                            if not customer_id:
                                errors.append({
                                    'error': 'Customer ID is required when mapping to an existing customer',
                                    'mapping': mapping,
                                    'source_row_number': source_row
                                })
                                continue

                            try:
                                customer = CustomerUser.objects.get(id=customer_id)
                            except CustomerUser.DoesNotExist:
                                errors.append({
                                    'error': f"Customer with id {customer_id} not found",
                                    'mapping': mapping,
                                    'source_row_number': source_row
                                })
                                continue
                        elif action == 'create_new':
                            try:
                                customer_payload = dict(mapping.get('new_customer_data', {}))
                                if candidate.get('shipping_mark_normalized') and not customer_payload.get('shipping_mark'):
                                    customer_payload['shipping_mark'] = candidate['shipping_mark_normalized']

                                customer = create_customer_from_data(
                                    customer_payload,
                                    request.user if hasattr(request, 'user') and request.user.is_authenticated else None
                                )
                            except Exception as exc:
                                errors.append({
                                    'error': str(exc),
                                    'mapping': mapping,
                                    'source_row_number': source_row
                                })
                                continue
                        else:
                            errors.append({
                                'error': f'Unknown action "{action}" in resolved mapping',
                                'mapping': mapping,
                                'source_row_number': source_row
                            })
                            continue

                        cbm_value = candidate.get('cbm')
                        if cbm_value is not None:
                            try:
                                cbm_value = float(cbm_value)
                            except (TypeError, ValueError):
                                cbm_value = None

                        cargo_item = CargoItem(
                            container=container,
                            client=customer,
                            tracking_id=candidate.get('tracking_number') or '',
                            item_description=candidate.get('description') or '',
                            quantity=candidate.get('quantity') or 0,
                            cbm=cbm_value
                        )
                        cargo_item.save()

                        summary, _ = ClientShipmentSummary.objects.get_or_create(
                            container=container,
                            client=customer
                        )
                        summary.update_totals()

                    created_items.append({
                        'cargo_item_id': str(cargo_item.id),
                        'tracking_id': cargo_item.tracking_id,
                        'source_row_number': source_row,
                        'customer_name': customer.get_full_name() or customer.phone,
                        'action_taken': action
                    })
                except IntegrityError as exc:
                    logger.warning(
                        "Integrity error while creating cargo item for container %s row %s: %s",
                        container_id,
                        source_row,
                        exc,
                    )
                    errors.append({
                        'error': 'Integrity error while creating cargo item',
                        'details': str(exc),
                        'mapping': mapping,
                        'source_row_number': source_row
                    })
                except Exception as exc:
                    logger.error(
                        "Error creating cargo item from resolved mapping for container %s row %s: %s",
                        container_id,
                        source_row,
                        exc,
                        exc_info=True,
                    )
                    errors.append({
                        'error': str(exc),
                        'mapping': mapping,
                        'source_row_number': source_row
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
        query = (request.query_params.get('q') or '').strip()

        try:
            limit = int(request.query_params.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        limit = max(1, min(limit, 500))

        try:
            page = int(request.query_params.get('page', 1))
        except (TypeError, ValueError):
            page = 1
        page = max(1, page)

        offset = (page - 1) * limit

        base_queryset = CustomerUser.objects.filter(user_role='CUSTOMER')

        shipping_mark_upper_expr = Upper(F('shipping_mark'))
        compact_expr = shipping_mark_upper_expr
        for ch in [' ', '-', '_', '/', '.', ',', '#', '&']:
            compact_expr = Replace(compact_expr, Value(ch), Value(''))

        annotated_queryset = base_queryset.annotate(
            shipping_mark_upper=shipping_mark_upper_expr,
            shipping_mark_compact=compact_expr,
        )

        query_upper = query.upper()
        sanitized_query = re.sub(r'[^A-Z0-9]', '', query_upper)

        filters = models.Q()
        if query:
            filters |= (
                models.Q(shipping_mark__icontains=query) |
                models.Q(first_name__icontains=query) |
                models.Q(last_name__icontains=query) |
                models.Q(email__icontains=query) |
                models.Q(phone__icontains=query)
            )
            if sanitized_query:
                filters |= models.Q(shipping_mark_compact__contains=sanitized_query)

        if filters:
            annotated_queryset = annotated_queryset.filter(filters)

        rank_whens = []
        if query_upper:
            rank_whens.append(When(shipping_mark_upper=query_upper, then=Value(0)))
        if sanitized_query:
            rank_whens.append(When(shipping_mark_compact=sanitized_query, then=Value(1)))
            rank_whens.append(When(shipping_mark_compact__startswith=sanitized_query, then=Value(2)))
        if query_upper:
            rank_whens.append(When(shipping_mark_upper__startswith=query_upper, then=Value(3)))
            rank_whens.append(When(shipping_mark_upper__icontains=query_upper, then=Value(4)))

        if rank_whens:
            match_rank_expr = Case(
                *rank_whens,
                default=Value(9),
                output_field=IntegerField()
            )
        else:
            match_rank_expr = Value(9)

        annotated_queryset = annotated_queryset.annotate(match_rank=match_rank_expr)

        total_matches = annotated_queryset.count()

        customers = annotated_queryset.order_by('match_rank', 'shipping_mark_upper', 'id')[offset:offset + limit]

        customer_data = []
        for customer in customers:
            customer_data.append({
                'id': customer.id,
                'shipping_mark': customer.shipping_mark or '',
                'name': customer.get_full_name() or customer.phone,
                'email': customer.email,
                'phone': getattr(customer, 'phone', '') or ''
            })

        has_more = offset + len(customer_data) < total_matches

        return Response({
            'customers': customer_data,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total_matches,
                'has_more': has_more
            }
        })