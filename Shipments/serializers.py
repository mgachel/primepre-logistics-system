from rest_framework import serializers
from .models import Shipments

class ShipmentsSerializer(serializers.ModelSerializer):
    days_in_warehouse = serializers.ReadOnlyField()
    
    class Meta:
        model = Shipments
        fields = '__all__'

class ClientShipmentsSerializer(serializers.ModelSerializer):
    """Detailed serializer for client view with computed fields"""
    days_in_warehouse = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_of_shipping_display', read_only=True)
    
    class Meta:
        model = Shipments
        fields = [
            'id', 'item_id', 'shipping_mark', 'supply_tracking',
            'cbm', 'weight', 'quantity', 'status', 'status_display',
            'method_of_shipping', 'method_display', 'date_received',
            'date_shipped', 'date_delivered', 'created_at', 'updated_at',
            'days_in_warehouse'
        ]
