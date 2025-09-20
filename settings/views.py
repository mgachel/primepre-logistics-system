from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import transaction, models
from django.utils import timezone
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import base64
import json
import logging

from .models import (
    AdminGeneralSettings, InvoiceMetaSettings, CompanyOffice, WarehouseAddress,
    ShippingMarkFormattingRule, ShippingMarkFormatSettings, SystemSettings,
    CompanySettings, NotificationSettings, AdminMessage, ClientNotification
)
from .serializers import (
    AdminGeneralSettingsSerializer, InvoiceMetaSettingsSerializer, CompanyOfficeSerializer,
    WarehouseAddressSerializer, ShippingMarkFormattingRuleSerializer, 
    ShippingMarkFormatSettingsSerializer, SystemSettingsSerializer,
    CompanySettingsSerializer, NotificationSettingsSerializer,
    AdminMessageSerializer, CreateAdminMessageSerializer, 
    ClientNotificationSerializer, NotificationStatsSerializer
)

User = get_user_model()
logger = logging.getLogger(__name__)


class AdminGeneralSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Admin General Settings - General Tab
    Displays admin profile information with account status (always active)
    """
    queryset = AdminGeneralSettings.objects.all()
    serializer_class = AdminGeneralSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return settings for the current admin user"""
        if self.request.user.is_staff or self.request.user.user_role in ['ADMIN', 'SUPER_ADMIN']:
            return AdminGeneralSettings.objects.all()
        return AdminGeneralSettings.objects.filter(admin_user=self.request.user)
    
    def perform_create(self, serializer):
        """Create general settings for admin user"""
        serializer.save(admin_user=self.request.user)
    
    @action(detail=False, methods=['get', 'post'], url_path='current-admin')
    def current_admin_settings(self, request):
        """Get or create settings for current admin user"""
        try:
            # Get or create settings for current user
            settings, created = AdminGeneralSettings.objects.get_or_create(
                admin_user=request.user
            )
            
            if request.method == 'GET':
                serializer = self.get_serializer(settings)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Admin settings retrieved successfully'
                })
            
            elif request.method == 'POST':
                serializer = self.get_serializer(settings, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Admin settings updated successfully'
                    })
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in current_admin_settings: {str(e)}")
            return Response({
                'success': False,
                'message': 'An error occurred while processing admin settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='upload-profile-image')
    def upload_profile_image(self, request, pk=None):
        """Upload profile image for admin"""
        settings = self.get_object()
        
        if 'profile_image' not in request.FILES:
            return Response({
                'success': False,
                'message': 'No image file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            settings.profile_image = request.FILES['profile_image']
            settings.save()
            
            serializer = self.get_serializer(settings)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Profile image uploaded successfully'
            })
            
        except Exception as e:
            logger.error(f"Error uploading profile image: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to upload profile image'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InvoiceMetaSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Invoice Meta Settings - Invoice Meta Tab
    Configure invoice generation: logo, theme, notes, number format, template selection
    """
    queryset = InvoiceMetaSettings.objects.all()
    serializer_class = InvoiceMetaSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return invoice settings (singleton)"""
        return InvoiceMetaSettings.objects.all()
    
    def perform_create(self, serializer):
        """Create invoice settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    def perform_update(self, serializer):
        """Update invoice settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get', 'post'], url_path='current')
    def current_settings(self, request):
        """Get or create current invoice settings (singleton)"""
        try:
            # Get or create the single invoice settings instance
            settings, created = InvoiceMetaSettings.objects.get_or_create(
                defaults={'updated_by': request.user}
            )
            
            if request.method == 'GET':
                serializer = self.get_serializer(settings)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Invoice settings retrieved successfully'
                })
            
            elif request.method == 'POST':
                serializer = self.get_serializer(settings, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save(updated_by=request.user)
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Invoice settings updated successfully'
                    })
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in invoice current_settings: {str(e)}")
            return Response({
                'success': False,
                'message': 'An error occurred while processing invoice settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='upload-logo')
    def upload_company_logo(self, request):
        """Upload company logo (drag & drop)"""
        if 'company_logo' not in request.FILES:
            return Response({
                'success': False,
                'message': 'No logo file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get or create settings
            settings, created = InvoiceMetaSettings.objects.get_or_create(
                defaults={'updated_by': request.user}
            )
            
            settings.company_logo = request.FILES['company_logo']
            settings.updated_by = request.user
            settings.save()
            
            serializer = self.get_serializer(settings)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Company logo uploaded successfully'
            })
            
        except Exception as e:
            logger.error(f"Error uploading company logo: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to upload company logo'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='templates')
    def available_templates(self, request):
        """Get available invoice templates"""
        templates = [
            {
                'value': 'CLASSIC',
                'label': 'Classic Template',
                'description': 'Traditional invoice layout with company header',
                'preview_url': '/static/invoice_previews/classic.png'
            },
            {
                'value': 'MODERN',
                'label': 'Modern Template',
                'description': 'Clean modern design with color accents',
                'preview_url': '/static/invoice_previews/modern.png'
            },
            {
                'value': 'MINIMAL',
                'label': 'Minimal Template',
                'description': 'Simple minimal layout focusing on content',
                'preview_url': '/static/invoice_previews/minimal.png'
            },
            {
                'value': 'CORPORATE',
                'label': 'Corporate Template',
                'description': 'Professional corporate style with branding',
                'preview_url': '/static/invoice_previews/corporate.png'
            }
        ]
        
        return Response({
            'success': True,
            'data': templates,
            'message': 'Available templates retrieved successfully'
        })
    
    @action(detail=False, methods=['post'], url_path='preview-template')
    def preview_template(self, request):
        """Preview template with current settings"""
        template_name = request.data.get('template', 'CLASSIC')
        
        # Get current settings
        try:
            settings = InvoiceMetaSettings.objects.first()
            if not settings:
                settings = InvoiceMetaSettings.objects.create(updated_by=request.user)
            
            # Generate preview data
            preview_data = {
                'template': template_name,
                'theme_color': settings.theme_color,
                'secondary_color': settings.secondary_color,
                'company_logo_url': settings.company_logo.url if settings.company_logo else None,
                'invoice_notes': settings.invoice_notes,
                'footer_text': settings.invoice_footer_text,
                'preview_url': f'/api/settings/invoice-meta/generate-preview/?template={template_name}'
            }
            
            return Response({
                'success': True,
                'data': preview_data,
                'message': 'Template preview generated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error generating template preview: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to generate template preview'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='next-invoice-number')
    def get_next_invoice_number(self, request):
        """Get the next invoice number that would be generated"""
        try:
            settings = InvoiceMetaSettings.objects.first()
            if not settings:
                return Response({
                    'success': False,
                    'message': 'Invoice settings not configured'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Generate preview of next invoice number without incrementing
            now = timezone.now()
            next_number = settings.invoice_number_format.format(
                year=now.year,
                month=now.month,
                day=now.day,
                counter=settings.invoice_counter
            )
            
            return Response({
                'success': True,
                'data': {
                    'next_invoice_number': next_number,
                    'current_counter': settings.invoice_counter,
                    'format': settings.invoice_number_format
                },
                'message': 'Next invoice number retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting next invoice number: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get next invoice number'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CompanyOfficeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Company Offices - Company Offices Table
    CRUD operations for offices with image upload, location data, map integration
    """
    queryset = CompanyOffice.objects.all()
    serializer_class = CompanyOfficeSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return all company offices ordered by name"""
        return CompanyOffice.objects.all().order_by('office_name')
    
    def perform_create(self, serializer):
        """Create company office with current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='active')
    def active_offices(self, request):
        """Get only active company offices"""
        offices = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(offices, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': offices.count(),
            'message': 'Active offices retrieved successfully'
        })
    
    @action(detail=False, methods=['get'], url_path='headquarters')
    def headquarters_office(self, request):
        """Get the headquarters office"""
        try:
            headquarters = self.get_queryset().filter(is_headquarters=True).first()
            if not headquarters:
                return Response({
                    'success': False,
                    'message': 'No headquarters office found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            serializer = self.get_serializer(headquarters)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Headquarters office retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting headquarters office: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get headquarters office'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='upload-image')
    def upload_office_image(self, request, pk=None):
        """Upload office image (drag & drop)"""
        office = self.get_object()
        
        if 'office_image' not in request.FILES:
            return Response({
                'success': False,
                'message': 'No image file provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            office.office_image = request.FILES['office_image']
            office.save()
            
            serializer = self.get_serializer(office)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': 'Office image uploaded successfully'
            })
            
        except Exception as e:
            logger.error(f"Error uploading office image: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to upload office image'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='set-headquarters')
    def set_as_headquarters(self, request, pk=None):
        """Set office as headquarters (only one allowed)"""
        office = self.get_object()
        
        try:
            with transaction.atomic():
                # Remove headquarters status from all offices
                CompanyOffice.objects.update(is_headquarters=False)
                
                # Set this office as headquarters
                office.is_headquarters = True
                office.save()
            
            serializer = self.get_serializer(office)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': f'{office.office_name} set as headquarters successfully'
            })
            
        except Exception as e:
            logger.error(f"Error setting headquarters: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to set office as headquarters'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='by-country')
    def offices_by_country(self, request):
        """Get offices grouped by country"""
        try:
            from django.db.models import Count
            
            offices_by_country = {}
            offices = self.get_queryset().filter(is_active=True)
            
            for office in offices:
                country = office.country
                if country not in offices_by_country:
                    offices_by_country[country] = []
                
                offices_by_country[country].append({
                    'id': office.id,
                    'office_name': office.office_name,
                    'phone_number': office.phone_number,
                    'physical_address': office.physical_address,
                    'is_headquarters': office.is_headquarters,
                    'warehouse_count': office.warehouses.count()
                })
            
            return Response({
                'success': True,
                'data': offices_by_country,
                'message': 'Offices by country retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting offices by country: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get offices by country'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class WarehouseAddressViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Warehouse Addresses - Warehouse Address Cards
    Card-based display with simplified fields (name, location, address, description)
    """
    queryset = WarehouseAddress.objects.all()
    serializer_class = WarehouseAddressSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return all warehouse addresses ordered by name"""
        return WarehouseAddress.objects.all().order_by('name')
    
    def perform_create(self, serializer):
        """Create warehouse address with current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='active')
    def active_warehouses(self, request):
        """Get only active warehouses"""
        warehouses = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(warehouses, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': warehouses.count(),
            'message': 'Active warehouses retrieved successfully'
        })
    
    @action(detail=False, methods=['get'], url_path='by-shipment-type')
    def warehouses_by_shipment_type(self, request):
        """Get warehouses grouped by shipment type"""
        try:
            shipment_type = request.query_params.get('type', None)
            
            if shipment_type:
                warehouses = self.get_queryset().filter(
                    is_active=True,
                    shipment_type__in=[shipment_type, 'BOTH']
                )
            else:
                warehouses = self.get_queryset().filter(is_active=True)
            
            # Group by shipment type
            grouped_warehouses = {
                'SEA': [],
                'AIR': [],
                'BOTH': []
            }
            
            for warehouse in warehouses:
                grouped_warehouses[warehouse.shipment_type].append(
                    self.get_serializer(warehouse).data
                )
            
            return Response({
                'success': True,
                'data': grouped_warehouses,
                'message': 'Warehouses by shipment type retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting warehouses by shipment type: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get warehouses by shipment type'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='route')
    def warehouses_by_route(self, request):
        """Get warehouses by from/to country route"""
        from_country = request.query_params.get('from_country')
        to_country = request.query_params.get('to_country')
        
        if not from_country or not to_country:
            return Response({
                'success': False,
                'message': 'Both from_country and to_country parameters are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            warehouses = self.get_queryset().filter(
                is_active=True,
                from_country__icontains=from_country,
                to_country__icontains=to_country
            )
            
            serializer = self.get_serializer(warehouses, many=True)
            
            return Response({
                'success': True,
                'data': serializer.data,
                'count': warehouses.count(),
                'route': f"{from_country} → {to_country}",
                'message': 'Warehouses for route retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting warehouses by route: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get warehouses by route'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='set-primary')
    def set_as_primary(self, request, pk=None):
        """Set warehouse as primary for its route"""
        warehouse = self.get_object()
        
        try:
            with transaction.atomic():
                # Remove primary status from warehouses with same route
                WarehouseAddress.objects.filter(
                    from_country=warehouse.from_country,
                    to_country=warehouse.to_country,
                    shipment_type=warehouse.shipment_type
                ).update(is_primary=False)
                
                # Set this warehouse as primary
                warehouse.is_primary = True
                warehouse.save()
            
            serializer = self.get_serializer(warehouse)
            return Response({
                'success': True,
                'data': serializer.data,
                'message': f'{warehouse.warehouse_title} set as primary warehouse successfully'
            })
            
        except Exception as e:
            logger.error(f"Error setting primary warehouse: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to set warehouse as primary'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='cards-view')
    def cards_view_data(self, request):
        """Get warehouse data formatted for card display"""
        try:
            warehouses = self.get_queryset().filter(is_active=True)
            
            cards_data = []
            for warehouse in warehouses:
                card_data = {
                    'id': warehouse.id,
                    'title': warehouse.warehouse_title,
                    'name': warehouse.warehouse_name,
                    'description': warehouse.warehouse_description,
                    'route': f"{warehouse.from_country} → {warehouse.to_country}",
                    'shipment_type': {
                        'value': warehouse.shipment_type,
                        'label': warehouse.get_shipment_type_display(),
                        'icon': warehouse.get_shipment_type_display_icon()
                    },
                    'contact': {
                        'person': warehouse.contact_person,
                        'phone': warehouse.contact_phone,
                        'email': warehouse.contact_email
                    },
                    'capacity': {
                        'storage_cbm': warehouse.storage_capacity_cbm,
                        'daily_handling': warehouse.handling_capacity_daily
                    },
                    'is_primary': warehouse.is_primary,
                    'linked_office': warehouse.linked_office.office_name if warehouse.linked_office else None
                }
                cards_data.append(card_data)
            
            return Response({
                'success': True,
                'data': cards_data,
                'count': len(cards_data),
                'message': 'Warehouse cards data retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting warehouse cards data: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get warehouse cards data'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShippingMarkFormattingRuleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Shipping Mark Formatting Rules
    Country/Region-based prefix configuration for shipping marks
    """
    queryset = ShippingMarkFormattingRule.objects.all()
    serializer_class = ShippingMarkFormattingRuleSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return all shipping mark rules ordered by priority"""
        return ShippingMarkFormattingRule.objects.all().order_by('priority', 'country', 'region')
    
    def perform_create(self, serializer):
        """Create shipping mark rule with current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'], url_path='active')
    def active_rules(self, request):
        """Get only active shipping mark rules"""
        rules = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(rules, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data,
            'count': rules.count(),
            'message': 'Active shipping mark rules retrieved successfully'
        })
    
    @action(detail=False, methods=['get'], url_path='by-country')
    def rules_by_country(self, request):
        """Get rules grouped by country"""
        try:
            country = request.query_params.get('country')
            
            if country:
                rules = self.get_queryset().filter(
                    country__icontains=country,
                    is_active=True
                )
            else:
                rules = self.get_queryset().filter(is_active=True)
            
            # Group by country
            rules_by_country = {}
            for rule in rules:
                country_name = rule.country
                if country_name not in rules_by_country:
                    rules_by_country[country_name] = []
                
                rules_by_country[country_name].append(
                    self.get_serializer(rule).data
                )
            
            return Response({
                'success': True,
                'data': rules_by_country,
                'message': 'Shipping mark rules by country retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting rules by country: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get rules by country'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='test-rule')
    def test_shipping_mark_rule(self, request):
        """Test shipping mark generation with given rule and client data"""
        rule_id = request.data.get('rule_id')
        client_name = request.data.get('client_name', 'TESTCLIENT')
        counter = request.data.get('counter', 1)
        
        if not rule_id:
            return Response({
                'success': False,
                'message': 'rule_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rule = get_object_or_404(ShippingMarkFormattingRule, id=rule_id)
            generated_mark = rule.generate_shipping_mark(client_name, counter)
            
            return Response({
                'success': True,
                'data': {
                    'rule': self.get_serializer(rule).data,
                    'client_name': client_name,
                    'counter': counter,
                    'generated_mark': generated_mark,
                    'example_format': f"PM{rule.prefix_value}{client_name[:6].upper()}"
                },
                'message': 'Shipping mark generated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error testing shipping mark rule: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to test shipping mark rule'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='find-best-rule')
    def find_best_rule_for_client(self, request):
        """Find best matching rule for client location"""
        country = request.data.get('country', '')
        region = request.data.get('region', '')
        client_name = request.data.get('client_name', 'TESTCLIENT')
        
        try:
            # Use the model method to find best rule
            best_rule = ShippingMarkFormattingRule.get_rule_for_client(country, region)
            
            if best_rule:
                generated_mark = best_rule.generate_shipping_mark(client_name)
                
                return Response({
                    'success': True,
                    'data': {
                        'rule': self.get_serializer(best_rule).data,
                        'generated_mark': generated_mark,
                        'client_data': {
                            'name': client_name,
                            'country': country,
                            'region': region
                        }
                    },
                    'message': 'Best matching rule found successfully'
                })
            else:
                return Response({
                    'success': False,
                    'message': 'No matching rule found for the provided location',
                    'data': {
                        'default_format': f"PM{client_name[:6].upper()}",
                        'client_data': {
                            'name': client_name,
                            'country': country,
                            'region': region
                        }
                    }
                }, status=status.HTTP_404_NOT_FOUND)
                
        except Exception as e:
            logger.error(f"Error finding best rule: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to find best rule for client'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='examples')
    def rule_examples(self, request):
        """Get examples of shipping mark formats for different rules"""
        try:
            rules = self.get_queryset().filter(is_active=True)[:10]  # Limit to first 10
            
            examples = []
            test_names = ['ACHEL', 'KWAME', 'SARAH', 'JOHN']
            
            for rule in rules:
                rule_examples = []
                for name in test_names:
                    generated = rule.generate_shipping_mark(name)
                    rule_examples.append({
                        'client_name': name,
                        'generated_mark': generated
                    })
                
                examples.append({
                    'rule': {
                        'id': rule.id,
                        'name': rule.rule_name,
                        'country': rule.country,
                        'region': rule.region,
                        'prefix_value': rule.prefix_value
                    },
                    'examples': rule_examples
                })
            
            return Response({
                'success': True,
                'data': examples,
                'message': 'Shipping mark rule examples retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting rule examples: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get rule examples'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ShippingMarkFormatSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Shipping Mark Format Settings
    Global configuration for shipping mark generation
    """
    queryset = ShippingMarkFormatSettings.objects.all()
    serializer_class = ShippingMarkFormatSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return shipping mark format settings (singleton)"""
        return ShippingMarkFormatSettings.objects.all()
    
    def perform_create(self, serializer):
        """Create format settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    def perform_update(self, serializer):
        """Update format settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get', 'post'], url_path='current')
    def current_settings(self, request):
        """Get or create current shipping mark format settings (singleton)"""
        try:
            # Get or create the single format settings instance
            settings, created = ShippingMarkFormatSettings.objects.get_or_create(
                defaults={'updated_by': request.user}
            )
            
            if request.method == 'GET':
                serializer = self.get_serializer(settings)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Shipping mark format settings retrieved successfully'
                })
            
            elif request.method == 'POST':
                serializer = self.get_serializer(settings, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save(updated_by=request.user)
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Shipping mark format settings updated successfully'
                    })
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in shipping mark format current_settings: {str(e)}")
            return Response({
                'success': False,
                'message': 'An error occurred while processing shipping mark format settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='generate-for-client')
    def generate_shipping_mark_for_client(self, request):
        """Generate shipping mark for a specific client"""
        try:
            # Get current settings
            settings = ShippingMarkFormatSettings.objects.first()
            if not settings:
                return Response({
                    'success': False,
                    'message': 'Shipping mark format settings not configured'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Extract client data from request
            client_data = {
                'first_name': request.data.get('first_name', ''),
                'last_name': request.data.get('last_name', ''),
                'nickname': request.data.get('nickname', ''),
                'country': request.data.get('country', ''),
                'region': request.data.get('region', '')
            }
            
            if not client_data['first_name']:
                return Response({
                    'success': False,
                    'message': 'Client first_name is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate shipping mark
            generated_mark = settings.generate_shipping_mark(client_data)
            
            return Response({
                'success': True,
                'data': {
                    'generated_mark': generated_mark,
                    'client_data': client_data,
                    'settings_used': {
                        'base_prefix': settings.base_prefix,
                        'max_name_length': settings.max_name_length,
                        'use_nickname_if_available': settings.use_nickname_if_available
                    }
                },
                'message': 'Shipping mark generated successfully'
            })
            
        except Exception as e:
            logger.error(f"Error generating shipping mark for client: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to generate shipping mark'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SystemSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for System Settings
    Global system configuration
    """
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return system settings (singleton)"""
        return SystemSettings.objects.all()
    
    def perform_create(self, serializer):
        """Create system settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    def perform_update(self, serializer):
        """Update system settings with current user"""
        serializer.save(updated_by=self.request.user)


class CompanySettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Company Settings
    Global company configuration
    """
    queryset = CompanySettings.objects.all()
    serializer_class = CompanySettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return company settings (singleton)"""
        return CompanySettings.objects.all()
    
    def perform_create(self, serializer):
        """Create company settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    def perform_update(self, serializer):
        """Update company settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get', 'post'], url_path='current')
    def current_settings(self, request):
        """Get or create current company settings (singleton)"""
        try:
            # Get or create the single company settings instance
            settings, created = CompanySettings.objects.get_or_create(
                defaults={'updated_by': request.user}
            )
            
            if request.method == 'GET':
                serializer = self.get_serializer(settings)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Company settings retrieved successfully'
                })
            
            elif request.method == 'POST':
                serializer = self.get_serializer(settings, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save(updated_by=request.user)
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Company settings updated successfully'
                    })
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in company current_settings: {str(e)}")
            return Response({
                'success': False,
                'message': 'An error occurred while processing company settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class NotificationSettingsViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Notification Settings
    Email, SMS, and alert configuration
    """
    queryset = NotificationSettings.objects.all()
    serializer_class = NotificationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return notification settings (singleton)"""
        return NotificationSettings.objects.all()
    
    def perform_create(self, serializer):
        """Create notification settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    def perform_update(self, serializer):
        """Update notification settings with current user"""
        serializer.save(updated_by=self.request.user)
    
    @action(detail=False, methods=['get', 'post'], url_path='current')
    def current_settings(self, request):
        """Get or create current notification settings (singleton)"""
        try:
            # Get or create the single notification settings instance
            settings, created = NotificationSettings.objects.get_or_create(
                defaults={'updated_by': request.user}
            )
            
            if request.method == 'GET':
                serializer = self.get_serializer(settings)
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Notification settings retrieved successfully'
                })
            
            elif request.method == 'POST':
                serializer = self.get_serializer(settings, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save(updated_by=request.user)
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Notification settings updated successfully'
                    })
                return Response({
                    'success': False,
                    'errors': serializer.errors
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error in notification current_settings: {str(e)}")
            return Response({
                'success': False,
                'message': 'An error occurred while processing notification settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='test-email')
    def test_email_configuration(self, request):
        """Test email configuration by sending a test email"""
        try:
            settings = NotificationSettings.objects.first()
            if not settings:
                return Response({
                    'success': False,
                    'message': 'Notification settings not configured'
                }, status=status.HTTP_404_NOT_FOUND)
            
            test_email = request.data.get('test_email', request.user.email)
            
            # Here you would implement actual email sending logic
            # For now, just return success if settings exist
            return Response({
                'success': True,
                'data': {
                    'test_email': test_email,
                    'email_host': settings.email_host,
                    'email_port': settings.email_port,
                    'from_address': settings.email_from_address
                },
                'message': 'Test email configuration checked successfully'
            })
            
        except Exception as e:
            logger.error(f"Error testing email configuration: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to test email configuration'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='test-sms')
    def test_sms_configuration(self, request):
        """Test SMS configuration by sending a test SMS"""
        try:
            settings = NotificationSettings.objects.first()
            if not settings:
                return Response({
                    'success': False,
                    'message': 'Notification settings not configured'
                }, status=status.HTTP_404_NOT_FOUND)
            
            test_phone = request.data.get('test_phone', '')
            if not test_phone:
                return Response({
                    'success': False,
                    'message': 'test_phone is required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Here you would implement actual SMS sending logic
            # For now, just return success if settings exist
            return Response({
                'success': True,
                'data': {
                    'test_phone': test_phone,
                    'console_mode': settings.sms_console_mode,
                    'from_number': settings.twilio_phone_number
                },
                'message': 'Test SMS configuration checked successfully'
            })
            
        except Exception as e:
            logger.error(f"Error testing SMS configuration: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to test SMS configuration'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# Additional Views for Dashboard and Utilities

class DashboardSettingsView(APIView):
    """
    Dashboard view combining all settings data
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get dashboard overview of all settings"""
        try:
            # Get or create settings instances
            admin_settings, _ = AdminGeneralSettings.objects.get_or_create(
                admin_user=request.user
            )
            invoice_settings, _ = InvoiceMetaSettings.objects.get_or_create(
                defaults={'updated_by': request.user}
            )
            shipping_settings, _ = ShippingMarkFormatSettings.objects.get_or_create(
                defaults={'updated_by': request.user}
            )
            
            # Get counts
            office_count = CompanyOffice.objects.filter(is_active=True).count()
            warehouse_count = WarehouseAddress.objects.filter(is_active=True).count()
            rule_count = ShippingMarkFormattingRule.objects.filter(is_active=True).count()
            
            dashboard_data = {
                'admin_settings': AdminGeneralSettingsSerializer(admin_settings).data,
                'invoice_settings': InvoiceMetaSettingsSerializer(invoice_settings).data,
                'shipping_settings': ShippingMarkFormatSettingsSerializer(shipping_settings).data,
                'counts': {
                    'active_offices': office_count,
                    'active_warehouses': warehouse_count,
                    'active_rules': rule_count
                },
                'quick_stats': {
                    'next_invoice_number': invoice_settings.get_next_invoice_number() if invoice_settings else 'Not configured',
                    'base_shipping_prefix': shipping_settings.base_prefix if shipping_settings else 'PM',
                    'total_settings_configured': sum([
                        1 if admin_settings else 0,
                        1 if invoice_settings else 0,
                        1 if shipping_settings else 0
                    ])
                }
            }
            
            return Response({
                'success': True,
                'data': dashboard_data,
                'message': 'Dashboard settings retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting dashboard settings: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get dashboard settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardSummaryView(APIView):
    """
    Dashboard summary with key metrics
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get dashboard summary statistics"""
        try:
            summary_data = {
                'settings_status': {
                    'admin_configured': AdminGeneralSettings.objects.filter(admin_user=request.user).exists(),
                    'invoice_configured': InvoiceMetaSettings.objects.exists(),
                    'shipping_configured': ShippingMarkFormatSettings.objects.exists(),
                    'offices_added': CompanyOffice.objects.exists(),
                    'warehouses_added': WarehouseAddress.objects.exists(),
                    'rules_configured': ShippingMarkFormattingRule.objects.exists()
                },
                'counts': {
                    'total_offices': CompanyOffice.objects.count(),
                    'active_offices': CompanyOffice.objects.filter(is_active=True).count(),
                    'total_warehouses': WarehouseAddress.objects.count(),
                    'active_warehouses': WarehouseAddress.objects.filter(is_active=True).count(),
                    'total_rules': ShippingMarkFormattingRule.objects.count(),
                    'active_rules': ShippingMarkFormattingRule.objects.filter(is_active=True).count()
                },
                'recent_activity': {
                    'latest_office': CompanyOffice.objects.order_by('-created_at').first(),
                    'latest_warehouse': WarehouseAddress.objects.order_by('-created_at').first(),
                    'latest_rule': ShippingMarkFormattingRule.objects.order_by('-created_at').first()
                }
            }
            
            # Serialize recent activity
            if summary_data['recent_activity']['latest_office']:
                summary_data['recent_activity']['latest_office'] = {
                    'name': summary_data['recent_activity']['latest_office'].office_name,
                    'created_at': summary_data['recent_activity']['latest_office'].created_at
                }
            
            if summary_data['recent_activity']['latest_warehouse']:
                summary_data['recent_activity']['latest_warehouse'] = {
                    'title': summary_data['recent_activity']['latest_warehouse'].warehouse_title,
                    'created_at': summary_data['recent_activity']['latest_warehouse'].created_at
                }
            
            if summary_data['recent_activity']['latest_rule']:
                summary_data['recent_activity']['latest_rule'] = {
                    'name': summary_data['recent_activity']['latest_rule'].rule_name,
                    'created_at': summary_data['recent_activity']['latest_rule'].created_at
                }
            
            return Response({
                'success': True,
                'data': summary_data,
                'message': 'Dashboard summary retrieved successfully'
            })
            
        except Exception as e:
            logger.error(f"Error getting dashboard summary: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to get dashboard summary'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InitializeSettingsView(APIView):
    """
    Initialize default settings for new installations
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Initialize default settings"""
        try:
            with transaction.atomic():
                # Create default admin settings
                admin_settings, created = AdminGeneralSettings.objects.get_or_create(
                    admin_user=request.user
                )
                
                # Create default invoice settings
                invoice_settings, created = InvoiceMetaSettings.objects.get_or_create(
                    defaults={'updated_by': request.user}
                )
                
                # Create default shipping mark settings
                shipping_settings, created = ShippingMarkFormatSettings.objects.get_or_create(
                    defaults={'updated_by': request.user}
                )
                
                # Create default shipping mark rule
                default_rule, created = ShippingMarkFormattingRule.objects.get_or_create(
                    rule_name='Default Rule',
                    defaults={
                        'description': 'Default shipping mark rule for all clients',
                        'country': 'Default',
                        'region': 'Global',
                        'prefix_value': '',
                        'format_template': 'PM{name}',
                        'priority': 999,
                        'is_default': True,
                        'created_by': request.user
                    }
                )
            
            return Response({
                'success': True,
                'data': {
                    'admin_settings_created': admin_settings.id,
                    'invoice_settings_created': invoice_settings.id,
                    'shipping_settings_created': shipping_settings.id,
                    'default_rule_created': default_rule.id
                },
                'message': 'Default settings initialized successfully'
            })
            
        except Exception as e:
            logger.error(f"Error initializing settings: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to initialize default settings'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminMessageViewSet(viewsets.ModelViewSet):
    """API ViewSet for admin messaging system"""
    
    serializer_class = AdminMessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return admin messages based on user role"""
        if self.request.user.user_role in ['ADMIN', 'SUPER_ADMIN']:
            return AdminMessage.objects.all().order_by('-created_at')
        return AdminMessage.objects.none()
    
    def get_serializer_class(self):
        """Use different serializer for create action"""
        if self.action == 'create':
            return CreateAdminMessageSerializer
        return AdminMessageSerializer
    
    def create(self, request, *args, **kwargs):
        """Create new admin message"""
        try:
            if request.user.user_role not in ['ADMIN', 'SUPER_ADMIN']:
                return Response({
                    'success': False,
                    'message': 'Permission denied. Only admins can send messages.'
                }, status=status.HTTP_403_FORBIDDEN)
            
            serializer = self.get_serializer(data=request.data)
            if serializer.is_valid():
                admin_message = serializer.save()
                
                # Return the created message with full details
                response_serializer = AdminMessageSerializer(admin_message)
                return Response({
                    'success': True,
                    'data': response_serializer.data,
                    'message': f'Message sent to {admin_message.total_recipients} recipients'
                }, status=status.HTTP_201_CREATED)
            
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            logger.error(f"Error creating admin message: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to send message'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='recent')
    def recent_messages(self, request):
        """Get recent admin messages with stats"""
        try:
            if request.user.user_role not in ['ADMIN', 'SUPER_ADMIN']:
                return Response({
                    'success': False,
                    'message': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            # Get recent messages (last 10)
            recent_messages = AdminMessage.objects.order_by('-created_at')[:10]
            serializer = AdminMessageSerializer(recent_messages, many=True)
            
            # Calculate stats
            total_messages = AdminMessage.objects.count()
            total_recipients = AdminMessage.objects.aggregate(
                total=models.Sum('total_recipients')
            )['total'] or 0
            total_reads = AdminMessage.objects.aggregate(
                total=models.Sum('read_count')
            )['total'] or 0
            
            return Response({
                'success': True,
                'data': {
                    'messages': serializer.data,
                    'stats': {
                        'total_messages': total_messages,
                        'total_recipients': total_recipients,
                        'total_reads': total_reads,
                        'average_read_rate': (total_reads / total_recipients * 100) if total_recipients > 0 else 0
                    }
                }
            })
            
        except Exception as e:
            logger.error(f"Error fetching recent messages: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to fetch recent messages'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ClientNotificationViewSet(viewsets.ModelViewSet):
    """API ViewSet for client notifications"""
    
    serializer_class = ClientNotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for the current user"""
        if self.request.user.user_role == 'CUSTOMER':
            return ClientNotification.objects.filter(
                recipient=self.request.user
            ).order_by('-created_at')
        elif self.request.user.user_role in ['ADMIN', 'SUPER_ADMIN']:
            # Admins can see all notifications for debugging
            return ClientNotification.objects.all().order_by('-created_at')
        return ClientNotification.objects.none()
    
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        try:
            notification = self.get_object()
            
            # Check permission
            if (request.user.user_role == 'CUSTOMER' and 
                notification.recipient != request.user):
                return Response({
                    'success': False,
                    'message': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            notification.mark_as_read()
            
            return Response({
                'success': True,
                'message': 'Notification marked as read'
            })
            
        except Exception as e:
            logger.error(f"Error marking notification as read: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to mark notification as read'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'], url_path='mark-unread')
    def mark_unread(self, request, pk=None):
        """Mark notification as unread"""
        try:
            notification = self.get_object()
            
            # Check permission
            if (request.user.user_role == 'CUSTOMER' and 
                notification.recipient != request.user):
                return Response({
                    'success': False,
                    'message': 'Permission denied'
                }, status=status.HTTP_403_FORBIDDEN)
            
            notification.mark_as_unread()
            
            return Response({
                'success': True,
                'message': 'Notification marked as unread'
            })
            
        except Exception as e:
            logger.error(f"Error marking notification as unread: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to mark notification as unread'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='stats')
    def notification_stats(self, request):
        """Get notification statistics for current user"""
        try:
            if request.user.user_role != 'CUSTOMER':
                return Response({
                    'success': False,
                    'message': 'This endpoint is for customers only'
                }, status=status.HTTP_403_FORBIDDEN)
            
            notifications = self.get_queryset()
            
            total_notifications = notifications.count()
            unread_notifications = notifications.filter(is_read=False).count()
            high_priority_unread = notifications.filter(
                is_read=False, 
                priority__in=['high', 'critical']
            ).count()
            recent_messages = notifications.filter(
                notification_type='admin_message'
            ).count()
            
            last_notification = notifications.first()
            
            stats = {
                'total_notifications': total_notifications,
                'unread_notifications': unread_notifications,
                'high_priority_unread': high_priority_unread,
                'recent_messages': recent_messages,
                'last_notification': last_notification.created_at if last_notification else None
            }
            
            serializer = NotificationStatsSerializer(stats)
            
            return Response({
                'success': True,
                'data': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Error fetching notification stats: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to fetch notification statistics'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """Mark all notifications as read for current user"""
        try:
            if request.user.user_role != 'CUSTOMER':
                return Response({
                    'success': False,
                    'message': 'This endpoint is for customers only'
                }, status=status.HTTP_403_FORBIDDEN)
            
            updated_count = ClientNotification.objects.filter(
                recipient=request.user,
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
            
            return Response({
                'success': True,
                'message': f'Marked {updated_count} notifications as read'
            })
            
        except Exception as e:
            logger.error(f"Error marking all notifications as read: {str(e)}")
            return Response({
                'success': False,
                'message': 'Failed to mark all notifications as read'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
