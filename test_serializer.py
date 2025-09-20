#!/usr/bin/env python

import os
import sys
import django

# Add the project directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from rest_framework import serializers
from GoodsRecieved.models import GoodsReceivedGhana

class TestGhanaSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoodsReceivedGhana
        fields = ["supply_tracking", "cbm", "quantity", "description", "location", "customer", "shipping_mark"]
        extra_kwargs = {
            'customer': {'required': False, 'allow_null': True},
            'shipping_mark': {'required': False, 'allow_null': True, 'allow_blank': True}
        }

# Test the serializer
test_data = {
    "supply_tracking": "TEST123", 
    "cbm": 1.5, 
    "quantity": 10, 
    "description": "Test item", 
    "location": "ACCRA"
}

print("Testing minimal serializer...")
serializer = TestGhanaSerializer(data=test_data)
print(f"Is valid: {serializer.is_valid()}")
if not serializer.is_valid():
    print(f"Errors: {serializer.errors}")
else:
    print("Success! Customer field is optional.")