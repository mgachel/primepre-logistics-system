from rest_framework import serializers
from .models import Claim
from users.models import CustomerUser


class ClaimSerializer(serializers.ModelSerializer):
    """Serializer for creating and listing claims"""
    
    customer_name = serializers.CharField(read_only=True)
    days_since_submission = serializers.IntegerField(read_only=True)
    image_1 = serializers.SerializerMethodField()
    image_2 = serializers.SerializerMethodField()
    image_3 = serializers.SerializerMethodField()
    
    class Meta:
        model = Claim
        fields = [
            'id', 'tracking_id', 'item_name', 'item_description',
            'status', 'shipping_mark', 'created_at', 'updated_at',
            'customer_name', 'days_since_submission', 'admin_notes',
            'image_1', 'image_2', 'image_3'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'shipping_mark']
    
    def get_image_1(self, obj):
        if obj.image_1:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_1.url)
        return None
    
    def get_image_2(self, obj):
        if obj.image_2:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_2.url)
        return None
    
    def get_image_3(self, obj):
        if obj.image_3:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_3.url)
        return None
    
    def create(self, validated_data):
        # Get the customer from the request context
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['customer'] = request.user
        return super().create(validated_data)


class ClaimCreateSerializer(serializers.ModelSerializer):
    """Dedicated serializer for creating claims"""
    
    class Meta:
        model = Claim
        fields = ['tracking_id', 'item_name', 'item_description', 'image_1', 'image_2', 'image_3']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['customer'] = request.user
            validated_data['shipping_mark'] = request.user.shipping_mark
        return super().create(validated_data)




class AdminClaimSerializer(serializers.ModelSerializer):
    """Extended serializer for admin view with more details"""
    
    customer_name = serializers.CharField(read_only=True)
    days_since_submission = serializers.IntegerField(read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    customer_email = serializers.CharField(source='customer.email', read_only=True)
    customer_region = serializers.CharField(source='customer.region', read_only=True)
    image_1 = serializers.SerializerMethodField()
    image_2 = serializers.SerializerMethodField()
    image_3 = serializers.SerializerMethodField()
    
    class Meta:
        model = Claim
        fields = [
            'id', 'tracking_id', 'item_name', 'item_description',
            'status', 'shipping_mark', 'created_at', 'updated_at',
            'customer_name', 'customer_phone', 'customer_email', 
            'customer_region', 'days_since_submission', 'admin_notes',
            'image_1', 'image_2', 'image_3'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'shipping_mark']
    
    def get_image_1(self, obj):
        if obj.image_1:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_1.url)
        return None
    
    def get_image_2(self, obj):
        if obj.image_2:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_2.url)
        return None
    
    def get_image_3(self, obj):
        if obj.image_3:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image_3.url)
        return None


class ClaimStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin to update claim status and notes"""
    
    class Meta:
        model = Claim
        fields = ['status', 'admin_notes']


class AdminClaimCreateSerializer(serializers.ModelSerializer):
    """Serializer used by admins to create a claim for a given customer via shipping_mark."""
    shipping_mark = serializers.CharField(write_only=True)

    class Meta:
        model = Claim
        fields = ['tracking_id', 'item_name', 'item_description', 'image_1', 'image_2', 'image_3', 'shipping_mark']

    def validate_shipping_mark(self, value):
        try:
            customer = CustomerUser.objects.get(shipping_mark=value)
        except CustomerUser.DoesNotExist:
            raise serializers.ValidationError("No customer found with that shipping mark.")
        return value

    def create(self, validated_data):
        # Resolve customer by shipping_mark and attach to claim
        shipping_mark = validated_data.pop('shipping_mark', None)
        if shipping_mark:
            customer = CustomerUser.objects.get(shipping_mark=shipping_mark)
            validated_data['customer'] = customer
            validated_data['shipping_mark'] = shipping_mark
        return super().create(validated_data)
