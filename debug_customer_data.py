"""
Simple test script to verify customer creation
"""

def test_customer_data():
    """Test the customer data format"""
    sample_customer = {
        'source_row_number': 1,
        'shipping_mark': 'PM4 TEST',
        'shipping_mark_normalized': 'PM4 TEST',
        'first_name': 'John',
        'last_name': 'Doe',
        'email': 'john.doe@example.com',
        'phone': '+233241234567',
        'phone_normalized': '+233241234567'
    }
    
    print("Sample customer data structure:")
    for key, value in sample_customer.items():
        print(f"  {key}: {value} ({type(value).__name__})")
    
    # Check field lengths
    print("\nField lengths:")
    print(f"  shipping_mark: {len(sample_customer['shipping_mark'])} chars")
    print(f"  first_name: {len(sample_customer['first_name'])} chars") 
    print(f"  last_name: {len(sample_customer['last_name'])} chars")
    print(f"  phone: {len(sample_customer['phone_normalized'])} chars")
    
    return sample_customer

if __name__ == "__main__":
    test_customer_data()