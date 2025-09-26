from rest_framework import serializers
from .models import CargoContainer, CargoItem, ClientShipmentSummary
from users.models import CustomerUser


# ================================================================
# CUSTOMER SERIALIZERS
# ================================================================

class CustomerUserSerializer(serializers.ModelSerializer):
    """Detailed customer/client information"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomerUser
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'company_name',
            'shipping_mark', 'phone', 'email', 'display_name'
        ]

    def get_display_name(self, obj):
        return obj.shipping_mark or obj.get_full_name()


class CustomerShippingMarkSerializer(serializers.ModelSerializer):
    """Simplified customer info for dropdowns (only shipping mark)"""
    class Meta:
        model = CustomerUser
        fields = ['id', 'shipping_mark']


# ================================================================
# CARGO ITEM SERIALIZERS
# ================================================================

class CargoItemSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    client_shipping_mark = serializers.CharField(source='client.shipping_mark', read_only=True)

    class Meta:
        model = CargoItem
        fields = [
            'id', 'container', 'client', 'client_name', 'client_shipping_mark',
            'tracking_id', 'item_description', 'quantity', 'weight', 'cbm',
            'unit_value', 'total_value', 'status', 'delivered_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CargoItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating cargo items (accepts shipping_mark)"""
    client_shipping_mark = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CargoItem
        fields = [
            'container', 'client', 'client_shipping_mark', 'tracking_id',
            'item_description', 'quantity', 'weight', 'cbm',
            'unit_value', 'total_value', 'status'
        ]

    def validate(self, attrs):
        # Resolve client by shipping_mark if provided
        shipping_mark = attrs.pop('client_shipping_mark', None)
        if shipping_mark:
            try:
                attrs['client'] = CustomerUser.objects.get(shipping_mark=shipping_mark)
            except CustomerUser.DoesNotExist:
                raise serializers.ValidationError({
                    'client_shipping_mark': f"No customer found with shipping mark '{shipping_mark}'"
                })
        return attrs


# ================================================================
# CLIENT SHIPMENT SUMMARY
# ================================================================

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
        read_only_fields = [
            'id', 'assigned_tracking', 'total_cbm', 'total_quantity',
            'total_packages', 'created_at'
        ]


# ================================================================
# CONTAINER SERIALIZERS
# ================================================================

class CargoContainerSerializer(serializers.ModelSerializer):
    """Basic container list serializer"""
    total_clients = serializers.ReadOnlyField()
    total_cbm = serializers.FloatField(source='cbm', read_only=True)
    rate = serializers.DecimalField(source='rates', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CargoContainer
        fields = [
            'container_id', 'cargo_type', 'load_date', 'eta', 'route',
            'rates', 'cbm', 'status', 'total_clients', 'total_cbm', 'rate'
        ]
        read_only_fields = ['total_clients', 'total_cbm','rate']


class CargoContainerDetailSerializer(serializers.ModelSerializer):
    """Detailed container serializer with related items & summaries"""
    total_cargo_items = serializers.ReadOnlyField()
    total_clients = serializers.ReadOnlyField()
    is_demurrage = serializers.ReadOnlyField()
    client_summaries = ClientShipmentSummarySerializer(
        many=True, read_only=True, source='clientshipmentsummary_set'
    )
    cargo_items = CargoItemSerializer(many=True, read_only=True)
    total_cbm = serializers.FloatField(source='cbm', read_only=True)
    rate = serializers.DecimalField(source='rates', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CargoContainer
        fields = [
            'container_id', 'cargo_type', 'weight', 'cbm', 'load_date',
            'eta', 'unloading_date', 'route', 'rates', 'stay_days',
            'delay_days', 'status', 'total_cargo_items', 'total_clients',
            'is_demurrage', 'client_summaries', 'cargo_items',
            'created_at', 'updated_at', 'rate', 'total_cbm'
        ]
        read_only_fields = [
            'total_cargo_items', 'total_clients', 'is_demurrage',
            'created_at', 'updated_at', 'rate', 'total_cbm'
        ]


class CargoContainerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating containers"""
    class Meta:
        model = CargoContainer
        fields = [
            'container_id', 'cargo_type', 'weight', 'cbm',
            'load_date', 'eta', 'route', 'rates',
            'stay_days', 'delay_days', 'status'
        ]


# ================================================================
# DASHBOARD & BULK IMPORT
# ================================================================

class CargoDashboardSerializer(serializers.Serializer):
    """Serializer for admin dashboard statistics"""
    total_containers = serializers.IntegerField()
    containers_in_transit = serializers.IntegerField()
    demurrage_containers = serializers.IntegerField()
    delivered_containers = serializers.IntegerField()
    pending_containers = serializers.IntegerField()
    total_cargo_items = serializers.IntegerField()
    recent_containers = CargoContainerSerializer(many=True)


class BulkCargoItemSerializer(serializers.Serializer):
    """Serializer for validating bulk upload files"""
    excel_file = serializers.FileField()
    container_id = serializers.CharField()

    def validate_excel_file(self, value):
        if not value.name.endswith(('.xlsx', '.xls', '.csv')):
            raise serializers.ValidationError("Only Excel/CSV files allowed.")
        return value
