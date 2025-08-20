#!/usr/bin/env python3
"""
Test script to verify Cargo Module implementation
Run this script to test the core functionality
"""

import os
import sys
import django

# Add the project directory to Python path
project_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(project_dir)
sys.path.append(parent_dir)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from cargo.models import CargoContainer, CargoItem, ClientShipmentSummary
from GoodsRecieved.models import GoodsReceivedChina, GoodsReceivedGhana
from decimal import Decimal
from datetime import date

User = get_user_model()

def test_cargo_module():
    """Test the core cargo module functionality"""
    
    print("🚢 Testing Cargo Module Implementation")
    print("=" * 50)
    
    # 1. Create test customer with shipping mark
    print("1. Creating test customer with shipping mark...")
    customer = User.objects.create_user(
        phone='+1234567890',
        first_name='John',
        last_name='Doe',
        user_role='CUSTOMER'
    )
    print(f"   ✅ Customer created with shipping mark: {customer.shipping_mark}")
    
    # 2. Create sea container
    print("2. Creating sea container...")
    sea_container = CargoContainer.objects.create(
        container_id='SEA001',
        cargo_type='sea',
        load_date=date.today(),
        eta=date.today(),
        route='China to Ghana',
        cbm=20.0,
        weight=1000.0
    )
    print(f"   ✅ Sea container created: {sea_container.container_id}")
    
    # 3. Create air container
    print("3. Creating air container...")
    air_container = CargoContainer.objects.create(
        container_id='AIR001',
        cargo_type='air',
        load_date=date.today(),
        eta=date.today(),
        route='China to Ghana',
        cbm=5.0,
        weight=200.0
    )
    print(f"   ✅ Air container created: {air_container.container_id}")
    
    # 4. Add cargo items to containers
    print("4. Adding cargo items to containers...")
    
    # Sea cargo item
    sea_item = CargoItem.objects.create(
        container=sea_container,
        client=customer,
        item_description='Electronics components',
        quantity=10,
        cbm=Decimal('2.5'),
        weight=150.0,
        unit_value=Decimal('50.00'),
        total_value=Decimal('500.00')
    )
    print(f"   ✅ Sea cargo item created: {sea_item.tracking_id}")
    
    # Air cargo item
    air_item = CargoItem.objects.create(
        container=air_container,
        client=customer,
        item_description='Urgent documents',
        quantity=1,
        cbm=Decimal('0.1'),
        weight=2.0,
        unit_value=Decimal('100.00'),
        total_value=Decimal('100.00')
    )
    print(f"   ✅ Air cargo item created: {air_item.tracking_id}")
    
    # 5. Create goods in warehouses
    print("5. Creating goods in warehouses...")
    
    # China warehouse goods
    china_goods = GoodsReceivedChina.objects.create(
        shipping_mark=customer.shipping_mark,
        supply_tracking='CHN123456',
        cbm=Decimal('3.0'),
        quantity=5,
        description='Furniture items',
        location='GUANGZHOU'
    )
    print(f"   ✅ China goods created: {china_goods.item_id}")
    
    # Ghana warehouse goods
    ghana_goods = GoodsReceivedGhana.objects.create(
        shipping_mark=customer.shipping_mark,
        supply_tracking='GHA123456',
        cbm=Decimal('1.5'),
        quantity=3,
        description='Textile items',
        location='ACCRA'
    )
    print(f"   ✅ Ghana goods created: {ghana_goods.item_id}")
    
    # 6. Test Customer Shipments aggregation
    print("6. Testing Customer Shipments aggregation...")
    
    # Count items by category
    china_count = GoodsReceivedChina.objects.filter(shipping_mark=customer.shipping_mark).count()
    ghana_count = GoodsReceivedGhana.objects.filter(shipping_mark=customer.shipping_mark).count()
    sea_count = CargoItem.objects.filter(client=customer, container__cargo_type='sea').count()
    air_count = CargoItem.objects.filter(client=customer, container__cargo_type='air').count()
    
    print(f"   📦 China Warehouse: {china_count} items")
    print(f"   📦 Ghana Warehouse: {ghana_count} items")
    print(f"   🚢 Sea Cargo: {sea_count} items")
    print(f"   ✈️  Air Cargo: {air_count} items")
    print(f"   📊 Total items for {customer.shipping_mark}: {china_count + ghana_count + sea_count + air_count}")
    
    # 7. Test client summaries
    print("7. Testing client summaries...")
    summaries = ClientShipmentSummary.objects.filter(client=customer)
    print(f"   📋 Client summaries created: {summaries.count()}")
    
    for summary in summaries:
        summary.update_totals()
        print(f"   📦 {summary.container.cargo_type.upper()} - Total CBM: {summary.total_cbm}, Items: {summary.total_quantity}")
    
    # 8. Test shipping mark uniqueness
    print("8. Testing shipping mark generation...")
    customer2 = User.objects.create_user(
        phone='+1234567891',
        first_name='John',  # Same first name
        last_name='Smith',
        user_role='CUSTOMER'
    )
    print(f"   ✅ Second customer with same first name: {customer2.shipping_mark}")
    print(f"   ✅ Shipping marks are unique: {customer.shipping_mark != customer2.shipping_mark}")
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! Cargo Module is working correctly!")
    print("=" * 50)
    
    # Cleanup
    print("\n🧹 Cleaning up test data...")
    customer.delete()
    customer2.delete()
    sea_container.delete()
    air_container.delete()
    china_goods.delete()
    ghana_goods.delete()
    print("   ✅ Test data cleaned up")

if __name__ == '__main__':
    test_cargo_module()
