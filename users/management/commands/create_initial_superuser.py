"""
Management command to create initial superuser.
Can be triggered via environment variables or web endpoint.
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from users.models import CustomerUser
import os


class Command(BaseCommand):
    help = 'Creates an initial superuser for the system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--phone',
            type=str,
            help='Phone number for the superuser',
        )
        parser.add_argument(
            '--password',
            type=str,
            help='Password for the superuser',
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Email for the superuser',
            default='',
        )
        parser.add_argument(
            '--first_name',
            type=str,
            help='First name for the superuser',
            default='Super',
        )
        parser.add_argument(
            '--last_name',
            type=str,
            help='Last name for the superuser',
            default='Admin',
        )

    def handle(self, *args, **options):
        # Get values from arguments or environment variables
        phone = options.get('phone') or os.environ.get('SUPERUSER_PHONE')
        password = options.get('password') or os.environ.get('SUPERUSER_PASSWORD')
        email = options.get('email') or os.environ.get('SUPERUSER_EMAIL', '')
        first_name = options.get('first_name') or os.environ.get('SUPERUSER_FIRST_NAME', 'Super')
        last_name = options.get('last_name') or os.environ.get('SUPERUSER_LAST_NAME', 'Admin')

        if not phone or not password:
            self.stdout.write(
                self.style.ERROR(
                    'Phone and password are required. Provide them as arguments or set '
                    'SUPERUSER_PHONE and SUPERUSER_PASSWORD environment variables.'
                )
            )
            return

        # Check if superuser already exists
        if CustomerUser.objects.filter(phone=phone).exists():
            self.stdout.write(
                self.style.WARNING(f'User with phone {phone} already exists.')
            )
            # Optionally update password
            user = CustomerUser.objects.get(phone=phone)
            if not user.is_superuser:
                user.is_superuser = True
                user.is_staff = True
                user.user_role = 'SUPER_ADMIN'
                user.set_password(password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Updated existing user to superuser: {phone}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'User {phone} is already a superuser.')
                )
            return

        # Create the superuser
        try:
            user = CustomerUser.objects.create_superuser(
                phone=phone,
                password=password,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created superuser: {phone} ({first_name} {last_name})'
                )
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating superuser: {str(e)}')
            )
