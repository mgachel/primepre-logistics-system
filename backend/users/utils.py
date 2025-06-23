def generate_shipping_mark(first_name, last_name, region):
    prefix_map = {
        'accra': 'PM1',
        'kumasi': 'PM2',
        'tamale': 'PM4',
    }
    prefix = prefix_map.get(region.lower(), 'PMX')
    name_part = f"{first_name}{last_name}".upper()
    shipping_mark = f"{prefix} {name_part}"
    
    return shipping_mark

