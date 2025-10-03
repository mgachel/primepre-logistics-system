import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'primepre.settings')
django.setup()

from users.models import CustomerUser

customers = CustomerUser.objects.filter(user_role='CUSTOMER')
print(f'Total customers: {customers.count()}')
print('\nSample customers:')
for c in customers[:20]:
    print(f'  ID: {c.id}, Shipping Mark: "{c.shipping_mark}", Name: {c.get_full_name()}, Phone: {c.phone}')

print('\n\nSearching for "BOAZ":')
boaz_customers = customers.filter(shipping_mark__icontains='BOAZ')
print(f'Found {boaz_customers.count()} customers')
for c in boaz_customers:
    print(f'  ID: {c.id}, Shipping Mark: "{c.shipping_mark}", Name: {c.get_full_name()}')
