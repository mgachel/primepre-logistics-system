from django.core.management.base import BaseCommand
from users.models import CustomerUser


class Command(BaseCommand):
    help = 'Create a superadmin user'

    def add_arguments(self, parser):
        parser.add_argument('--phone', type=str, help='Phone number for the superadmin')
        parser.add_argument('--email', type=str, help='Email for the superadmin')
        parser.add_argument('--password', type=str, help='Password for the superadmin')
        parser.add_argument('--first_name', type=str, default='Super', help='First name')
        parser.add_argument('--last_name', type=str, default='Admin', help='Last name')

    def handle(self, *args, **options):
        phone = options['phone'] or input('Enter phone number: ')
        email = options['email'] or input('Enter email: ')
        password = options['password'] or input('Enter password: ')
        first_name = options['first_name']
        last_name = options['last_name']

        if CustomerUser.objects.filter(phone=phone).exists():
            self.stdout.write(
                self.style.ERROR(f'User with phone {phone} already exists')
            )
            return

        if CustomerUser.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.ERROR(f'User with email {email} already exists')
            )
            return

        user = CustomerUser.objects.create_superuser(
            phone=phone,
            password=password,
            email=email,
            first_name=first_name,
            last_name=last_name,
            user_type='INDIVIDUAL',
            is_active=True
        )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created superadmin: {phone}')
        )
        self.stdout.write(f'User ID: {user.id}')
        self.stdout.write(f'Email: {user.email}')
        self.stdout.write(f'Role: {user.user_role}')
        self.stdout.write(f'Is Staff: {user.is_staff}')
        self.stdout.write(f'Is Superuser: {user.is_superuser}')
