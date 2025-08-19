# backend/auth/models.py
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import random
import secrets   


class CustomUserManager(BaseUserManager):
    def create_user(self, phone, password=None, **extra_fields):
        if not phone:
            raise ValueError('The Phone number is required')
        user = self.model(phone=phone, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, phone, password, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_role', 'SUPER_ADMIN')
        return self.create_user(phone, password, **extra_fields)
    
    def create_admin_user(self, phone, password, role='ADMIN', **extra_fields):
        """Create admin user with specific role"""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('user_role', role)
        return self.create_user(phone, password, **extra_fields)

class CustomerUser(AbstractBaseUser, PermissionsMixin):
    # User Role Choices
    USER_ROLE_CHOICES = [
        ('CUSTOMER', 'Customer'),
        ('STAFF', 'Staff'),
        ('ADMIN', 'Admin'),
        ('MANAGER', 'Manager'),
        ('SUPER_ADMIN', 'Super Admin'),
    ]
    
    # User Type Choices
    USER_TYPE_CHOICES = [
        ('INDIVIDUAL', 'Individual'),
        ('BUSINESS', 'Business'),
    ]
    
    # Basic Information
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    company_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(unique=True, blank=True, null=True)
    phone = models.CharField(max_length=15, unique=True)
    region = models.CharField(max_length=50)
    shipping_mark = models.CharField(max_length=20, unique=True)
    
    # User Classification
    user_role = models.CharField(
        max_length=20, 
        choices=USER_ROLE_CHOICES, 
        default='CUSTOMER',
        help_text="User's role in the system"
    )
    user_type = models.CharField(
        max_length=20, 
        choices=USER_TYPE_CHOICES, 
        default='INDIVIDUAL',
        help_text="Individual or Business user"
    )
    
    # Admin Permissions
    can_create_users = models.BooleanField(
        default=False,
        help_text="Can create new users"
    )
    can_manage_inventory = models.BooleanField(
        default=False,
        help_text="Can manage warehouse inventory"
    )
    can_manage_rates = models.BooleanField(
        default=False,
        help_text="Can manage shipping rates"
    )
    can_view_analytics = models.BooleanField(
        default=False,
        help_text="Can view system analytics"
    )
    can_manage_admins = models.BooleanField(
        default=False,
        help_text="Can create and manage other admins"
    )
    can_access_admin_panel = models.BooleanField(
        default=False,
        help_text="Can access custom admin panel"
    )
    
    # Warehouse Access
    accessible_warehouses = models.JSONField(
        default=list,
        help_text="List of warehouses this user can access (e.g., ['china', 'ghana'])"
    )
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    created_by = models.ForeignKey(
        'self', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        help_text="Admin who created this user"
    )
    
    
    # Fix reverse accessor conflicts
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
        related_name='customeruser_set',
        related_query_name='customeruser',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='customeruser_set',
        related_query_name='customeruser',
    )

    USERNAME_FIELD = 'phone'
    REQUIRED_FIELDS = []

    objects = CustomUserManager()
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        indexes = [
            models.Index(fields=['user_role']),
            models.Index(fields=['is_active']),
            models.Index(fields=['phone']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.phone})"
    
    def get_full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}".strip()
    
    def get_short_name(self):
        """Return the short name for the user"""
        return self.first_name
    
    @property
    def is_admin_user(self):
        """Check if user has admin privileges"""
        return self.user_role in ['ADMIN', 'MANAGER', 'SUPER_ADMIN']
    
    @property
    def is_super_admin(self):
        """Check if user is super admin"""
        return self.user_role == 'SUPER_ADMIN'
    
    @property
    def is_manager(self):
        """Check if user is manager"""
        return self.user_role == 'MANAGER'
    
    def can_create_admin_user(self):
        """Check if user can create other admin users"""
        return self.is_super_admin or self.can_manage_admins
    
    def can_access_warehouse(self, warehouse):
        """Check if user can access specific warehouse"""
        if self.is_super_admin:
            return True
        return warehouse in self.accessible_warehouses
    
    def get_permissions_summary(self):
        """Get a summary of user permissions"""
        permissions = []
        if self.can_create_users:
            permissions.append("Create Users")
        if self.can_manage_inventory:
            permissions.append("Manage Inventory")
        if self.can_manage_rates:
            permissions.append("Manage Rates")
        if self.can_view_analytics:
            permissions.append("View Analytics")
        if self.can_manage_admins:
            permissions.append("Manage Admins")
        if self.can_access_admin_panel:
            permissions.append("Admin Panel Access")
        return permissions

    def save(self, *args, **kwargs):
        # Auto-generate shipping mark if not provided
        if not self.shipping_mark:
            base = f"PM{self.first_name.upper()}"
            shipping_mark = base
            counter = 1
            while CustomerUser.objects.filter(shipping_mark=shipping_mark).exists():
                shipping_mark = f"{base}{counter:02d}"
                counter += 1
            self.shipping_mark = shipping_mark
        
        # Set staff status based on role
        if self.user_role in ['ADMIN', 'MANAGER', 'SUPER_ADMIN']:
            self.is_staff = True
            self.can_access_admin_panel = True
        
        # Set superuser for SUPER_ADMIN
        if self.user_role == 'SUPER_ADMIN':
            self.is_superuser = True
            self.can_create_users = True
            self.can_manage_inventory = True
            self.can_manage_rates = True
            self.can_view_analytics = True
            self.can_manage_admins = True
            self.accessible_warehouses = ['china', 'ghana']  # Super admin has access to all
        
        # Auto-set permissions based on role
        elif self.user_role == 'MANAGER':
            self.can_create_users = True
            self.can_manage_inventory = True
            self.can_manage_rates = True
            self.can_view_analytics = True
            if not self.accessible_warehouses:
                self.accessible_warehouses = ['china', 'ghana']
        
        elif self.user_role == 'ADMIN':
            self.can_manage_inventory = True
            self.can_manage_rates = True
            self.can_view_analytics = True
            if not self.accessible_warehouses:
                self.accessible_warehouses = ['china']  # Default to china
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate the model"""
        super().clean()
        
        # Validate phone number
        if not self.phone.replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise ValidationError({'phone': 'Phone number must contain only digits, +, -, and spaces'})
        
        # Validate warehouse access
        valid_warehouses = ['china', 'ghana']
        if self.accessible_warehouses:
            invalid_warehouses = [w for w in self.accessible_warehouses if w not in valid_warehouses]
            if invalid_warehouses:
                raise ValidationError({
                    'accessible_warehouses': f'Invalid warehouses: {invalid_warehouses}. Valid options: {valid_warehouses}'
                })


class PasswordResetToken(models.Model):
    """Model to handle secure password reset tokens"""
    user = models.ForeignKey(CustomerUser, on_delete=models.CASCADE)
    token = models.CharField(max_length=6)  # 6-digit code
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = "Password Reset Token"
        verbose_name_plural = "Password Reset Tokens"
        ordering = ['-created_at']
        unique_together = ['user', 'token']  # Prevent duplicate codes for same user
    
    def save(self, *args, **kwargs):
        if not self.token:
            # Generate 6-digit code
            self.token = str(random.randint(100000, 999999))
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=15)  # 15 minutes expiry
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if token is still valid"""
        return not self.is_used and timezone.now() <= self.expires_at
    
    def mark_used(self):
        """Mark token as used"""
        self.is_used = True
        self.save(update_fields=['is_used'])
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired tokens"""
        expired_tokens = cls.objects.filter(expires_at__lt=timezone.now())
        count = expired_tokens.count()
        expired_tokens.delete()
        return count
    
    @classmethod
    def create_for_user(cls, user):
        """Create a new reset token for user (invalidate existing ones)"""
        # Remove existing unused tokens for this user
        cls.objects.filter(user=user, is_used=False).delete()
        
        # Create new token
        return cls.objects.create(user=user)