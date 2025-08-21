from rest_framework import serializers
from .models import CargoContainer, CargoItem, ClientShipmentSummary
from users.models import CustomerUser


class CustomerUserSerializer(serializers.ModelSerializer):
    """Serializer for customer/client information"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomerUser
        fields = ['id', 'first_name', 'last_name', 'full_name', 'company_name', 'shipping_mark', 'phone', 'email', 'display_name']
    
    def get_display_name(self, obj):
        """For cargo item selection, display only shipping mark"""
        return obj.shipping_mark


class CustomerShippingMarkSerializer(serializers.ModelSerializer):
    """Simplified serializer showing only shipping mark for cargo item client selection"""
    
    class Meta:
        model = CustomerUser
        fields = ['id', 'shipping_mark']


class CargoItemSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    client_shipping_mark = serializers.CharField(source='client.shipping_mark', read_only=True)
    
    class Meta:
        model = CargoItem
        fields = [
            'id', 'container', 'client', 'client_name', 'client_shipping_mark', 'tracking_id',
            'item_description', 'quantity', 'weight', 'cbm', 'unit_value', 'total_value',
            'status', 'delivered_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CargoItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cargo items"""
    client_shipping_mark = serializers.CharField(write_only=True, required=False, help_text="Shipping mark of the client")
    
    class Meta:
        model = CargoItem
        fields = [
            'container', 'client', 'client_shipping_mark', 'tracking_id', 'item_description', 'quantity', 
            'weight', 'cbm', 'unit_value', 'total_value', 'status'
        ]
    
    def validate(self, attrs):
        # If client_shipping_mark is provided, find the client by shipping mark
        if 'client_shipping_mark' in attrs and attrs['client_shipping_mark']:
            try:
                client = CustomerUser.objects.get(shipping_mark=attrs['client_shipping_mark'])
                attrs['client'] = client
            except CustomerUser.DoesNotExist:
                raise serializers.ValidationError({
                    'client_shipping_mark': f"No customer found with shipping mark: {attrs['client_shipping_mark']}"
                })
            # Remove the shipping mark from attrs as it's not a model field
            del attrs['client_shipping_mark']
        
        return attrs


class ClientShipmentSummarySerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    client_shipping_mark = serializers.CharField(source='client.shipping_mark', read_only=True)
    
    class Meta:
        model = ClientShipmentSummary
        fields = [
            'id', 'container', 'client', 'client_name', 'client_shipping_mark',
            'assigned_tracking', 'total_cbm', 'total_quantity', 'total_packages', 
            'status', 'created_at'
        ]
        read_only_fields = ['id', 'assigned_tracking', 'total_cbm', 'total_quantity', 'total_packages']


class CargoContainerSerializer(serializers.ModelSerializer):
    total_clients = serializers.ReadOnlyField()
    loading_date = serializers.DateField(source='load_date', read_only=True)
    total_cbm = serializers.FloatField(source='cbm', read_only=True)
    rate = serializers.DecimalField(source='rates', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = CargoContainer
        fields = [
            'container_id', 'loading_date', 'eta', 'rate', 'total_cbm', 'status', 'total_clients', 
            'load_date', 'cbm', 'rates'  # Include original fields for compatibility
        ]
        read_only_fields = ['total_clients', 'loading_date', 'total_cbm', 'rate']


class CargoContainerDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer with all fields and cargo items"""
    total_cargo_items = serializers.ReadOnlyField()
    total_clients = serializers.ReadOnlyField()
    is_demurrage = serializers.ReadOnlyField()
    client_summaries = ClientShipmentSummarySerializer(many=True, read_only=True, source='clientshipmentsummary_set')
    cargo_items = CargoItemSerializer(many=True, read_only=True)
    loading_date = serializers.DateField(source='load_date')
    total_cbm = serializers.FloatField(source='cbm')
    rate = serializers.DecimalField(source='rates', max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = CargoContainer
        fields = [
            'container_id', 'cargo_type', 'weight', 'cbm', 'loading_date', 'eta',
            'unloading_date', 'route', 'rates', 'stay_days', 'delay_days', 'status',
            'total_cargo_items', 'total_clients', 'is_demurrage', 'client_summaries',
            'cargo_items', 'created_at', 'updated_at', 'rate', 'total_cbm'
        ]
        read_only_fields = ['total_cargo_items', 'total_clients', 'is_demurrage', 'created_at', 'updated_at', 'rate']


class CargoContainerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating containers"""
    
    class Meta:
        model = CargoContainer
        fields = [
            'container_id', 'cargo_type', 'weight', 'cbm', 'load_date', 'eta',
            'route', 'rates', 'stay_days', 'delay_days', 'status'
        ]


class CargoDashboardSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    total_containers = serializers.IntegerField()
    containers_in_transit = serializers.IntegerField()
    demurrage_containers = serializers.IntegerField()
    delivered_containers = serializers.IntegerField()
    pending_containers = serializers.IntegerField()
    total_cargo_items = serializers.IntegerField()
    
    # Recent containers
    recent_containers = CargoContainerSerializer(many=True)


class BulkCargoItemSerializer(serializers.Serializer):
    """Serializer for bulk importing cargo items from Excel"""
    excel_file = serializers.FileField()
    container_id = serializers.CharField()
    
    def validate_excel_file(self, value):
        if not value.name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError("Only Excel files (.xlsx, .xls) or CSV files (.csv) are allowed.")
        return value
