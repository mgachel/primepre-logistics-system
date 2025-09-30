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
    
    # Region Choices (16 Regions of Ghana)
    REGION_CHOICES = [
        ('GREATER_ACCRA', 'Greater Accra'),
        ('ASHANTI', 'Ashanti'),
        ('WESTERN', 'Western'),
        ('CENTRAL', 'Central'),
        ('VOLTA', 'Volta'),
        ('EASTERN', 'Eastern'),
        ('NORTHERN', 'Northern'),
        ('UPPER_EAST', 'Upper East'),
        ('UPPER_WEST', 'Upper West'),
        ('BRONG_AHAFO', 'Brong Ahafo'),
        ('WESTERN_NORTH', 'Western North'),
        ('AHAFO', 'Ahafo'),
        ('BONO', 'Bono'),
        ('BONO_EAST', 'Bono East'),
        ('OTI', 'Oti'),
        ('NORTH_EAST', 'North East'),
        ('SAVANNAH', 'Savannah'),
    ]
    
    # Basic Information
    first_name = models.CharField(max_length=50)
    last_name = models.CharField(max_length=50)
    nickname = models.CharField(max_length=50, blank=True, help_text="Optional nickname or display name")
    company_name = models.CharField(max_length=100, blank=True, help_text="Company or business name")
    email = models.EmailField(unique=True, blank=True, null=True)
    phone = models.CharField(max_length=15, unique=True)
    region = models.CharField(max_length=20, choices=REGION_CHOICES)
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
        help_text="List of warehouses this user can access (e.g., ['accra', 'kumasi', 'tema'])"
    )
    
    # Status fields
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False, help_text="Phone number verified via SMS")
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

    @classmethod
    def generate_shipping_mark_suggestions(cls, first_name, last_name, company_name=None):
        """
        Generate 5 unique shipping mark suggestions with PM prefix.
        Uses random combinations of first and last names with spaces.
        """
        suggestions = []
        first_name = first_name.strip().upper()
        last_name = last_name.strip().upper()
        
        # Generate random combinations of first and last names
        import random
        import hashlib
        
        # Create deterministic seed from names for consistency
        seed = f"{first_name}{last_name}"
        random.seed(hashlib.md5(seed.encode()).hexdigest())
        
        # Generate different name combinations
        name_combinations = []
        if len(first_name) >= 2 and len(last_name) >= 2:
            name_combinations = [
                f"{first_name[:2]}{last_name[:2]}",      # JODO (John Doe)
                f"{first_name[:3]}{last_name[:1]}",      # JOHD
                f"{first_name[:1]}{last_name[:3]}",      # JDOE
                f"{first_name[:2]}{last_name[:1]}",      # JOD
                f"{first_name[:1]}{last_name[:2]}",      # JDO
            ]
        elif first_name and last_name:
            name_combinations = [
                f"{first_name[:min(3, len(first_name))]}{last_name[:min(3, len(last_name))]}",
                f"{first_name[:1]}{last_name}",
                first_name,
            ]
        else:
            name_combinations = [first_name] if first_name else ['USER']
        
        # Base patterns with spaces between prefix and name
        base_patterns = [f"PM {combo}" for combo in name_combinations]
        
        # Add company-based patterns if provided (with space)
        if company_name and company_name.strip():
            company_clean = ''.join(c.upper() for c in company_name if c.isalnum())
            if len(company_clean) >= 2:
                base_patterns.extend([
                    f"PM {company_clean[:3]}",              # PM ABC (ABC Corp)
                    f"PM {first_name[:1]}{company_clean[:2]}", # PM JAB (John @ ABC)
                    f"PM {company_clean[:2]}{first_name[:1]}", # PM ABJ
                ])
        
        # Additional creative patterns with spaces
        initials = f"{first_name[:1]}{last_name[:1]}"
        base_patterns.extend([
            f"PM {initials}",                           # PM JD
            f"PM {initials}{len(first_name + last_name):02d}", # PM JD07
        ])
        
        # Generate unique suggestions from patterns
        for pattern in base_patterns:
            if len(suggestions) >= 5:
                break
                
            # Try base pattern first
            candidate = pattern
            if not cls.objects.filter(shipping_mark=candidate).exists():
                suggestions.append(candidate)
                continue
            
            # Add sequential numbers if base exists
            for i in range(1, 100):
                candidate = f"{pattern}{i:02d}"
                if not cls.objects.filter(shipping_mark=candidate).exists():
                    suggestions.append(candidate)
                    break
        
        # Ensure we have exactly 5 unique suggestions using random generation
        while len(suggestions) < 5:
            # Generate random but deterministic suggestions
            import hashlib
            seed = f"{first_name}{last_name}{len(suggestions)}"
            hash_obj = hashlib.md5(seed.encode())
            random_suffix = hash_obj.hexdigest()[:3].upper()
            
            candidate = f"PM {random_suffix}"
            if not cls.objects.filter(shipping_mark=candidate).exists() and candidate not in suggestions:
                suggestions.append(candidate)
        
        return suggestions[:5]
    
    @classmethod
    def refresh_shipping_mark_suggestions(cls, first_name, last_name, company_name=None, exclude_taken=None):
        """
        Generate fresh shipping mark suggestions, excluding already taken ones.
        Used when user's selection is no longer available.
        """
        if exclude_taken is None:
            exclude_taken = []
            
        suggestions = []
        attempt = 0
        max_attempts = 20
        
        while len(suggestions) < 5 and attempt < max_attempts:
            new_suggestions = cls.generate_shipping_mark_suggestions(
                first_name, last_name, company_name
            )
            
            for suggestion in new_suggestions:
                if (suggestion not in exclude_taken and 
                    suggestion not in suggestions and 
                    not cls.objects.filter(shipping_mark=suggestion).exists()):
                    suggestions.append(suggestion)
                    
                if len(suggestions) >= 5:
                    break
            
            attempt += 1
            
            # Add more creative patterns if needed
            if len(suggestions) < 5:
                for i in range(attempt * 5, (attempt + 1) * 5):
                    candidate = f"PM {secrets.token_hex(2).upper()}{i:02d}"
                    if (candidate not in exclude_taken and 
                        candidate not in suggestions and 
                        not cls.objects.filter(shipping_mark=candidate).exists()):
                        suggestions.append(candidate)
                        
                    if len(suggestions) >= 5:
                        break
        
        return suggestions[:5]

    @classmethod
    def auto_generate_shipping_mark(cls, first_name, region, country="Ghana"):
        """
        Auto-generate shipping mark based on settings configuration.
        Format: {default_prefix}{regional_rule}{name_based_unique_identifier}
        Example: PM1ACHEL01 (PM + 1 + ACHEL + 01)
        """
        # Safe default values
        default_prefix = "PM"
        regional_prefix = "1"
        
        # Try to get settings, but don't fail if they don't exist
        try:
            from settings.models import CompanySettings, ShippingMarkFormattingRule
            
            # Get default prefix from company settings
            try:
                company_settings = CompanySettings.objects.first()
                if company_settings and hasattr(company_settings, 'shipping_mark_prefix'):
                    default_prefix = company_settings.shipping_mark_prefix
            except Exception:
                pass  # Use default
            
            # Get regional rule for the user's region
            try:
                rule = ShippingMarkFormattingRule.get_rule_for_client(country=country, region=region)
                if rule and hasattr(rule, 'prefix_value'):
                    regional_prefix = rule.prefix_value
            except Exception:
                pass  # Use default
                
        except ImportError:
            # Settings models don't exist, use defaults
            pass
        except Exception:
            # Any other error, use defaults
            pass
        
        # Clean and format name (take first 6 characters, uppercase, alphanumeric only)
        clean_name = ''.join(c.upper() for c in first_name if c.isalnum())[:6]
        if len(clean_name) < 2:
            clean_name = clean_name.ljust(2, 'X')  # Pad with X if name too short
        
        # Generate base shipping mark with space between prefix and regional prefix + name
        base_mark = f"{default_prefix}{regional_prefix} {clean_name}"
        
        # Ensure uniqueness by adding counter if needed
        shipping_mark = base_mark
        counter = 1
        
        while cls.objects.filter(shipping_mark=shipping_mark).exists():
            shipping_mark = f"{base_mark}{counter:02d}"
            counter += 1
            
            # Safety check to prevent infinite loop
            if counter > 999:
                # Fallback to random generation
                import secrets
                random_suffix = secrets.token_hex(2).upper()
                shipping_mark = f"{default_prefix}{regional_prefix}{random_suffix}"
                break
        
        return shipping_mark

    def save(self, *args, **kwargs):
        # Auto-generate shipping mark if not provided
        if not self.shipping_mark:
            if self.first_name and self.region:
                # Use new auto-generation method based on settings
                self.shipping_mark = self.auto_generate_shipping_mark(
                    first_name=self.first_name, 
                    region=self.region
                )
            else:
                # Fallback to old method if data missing
                base = f"PM{self.first_name.upper() if self.first_name else 'USER'}"
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
            self.accessible_warehouses = ['accra', 'kumasi', 'tema', 'takoradi']  # Super admin has access to all
        
        # Auto-set permissions based on role
        elif self.user_role == 'MANAGER':
            self.can_create_users = True
            self.can_manage_inventory = True
            self.can_manage_rates = True
            self.can_view_analytics = True
            if not self.accessible_warehouses:
                self.accessible_warehouses = ['accra', 'kumasi', 'tema']
        
        elif self.user_role == 'ADMIN':
            self.can_manage_inventory = True
            self.can_manage_rates = True
            self.can_view_analytics = True
            if not self.accessible_warehouses:
                self.accessible_warehouses = ['accra']  # Default to main Accra warehouse
        
        super().save(*args, **kwargs)
    
    def clean(self):
        """Validate the model"""
        super().clean()
        
        # Validate phone number
        if not self.phone.replace('+', '').replace('-', '').replace(' ', '').isdigit():
            raise ValidationError({'phone': 'Phone number must contain only digits, +, -, and spaces'})
        
        # Validate warehouse access
        valid_warehouses = ['accra', 'kumasi', 'tema', 'takoradi', 'ho', 'cape_coast']
        if self.accessible_warehouses:
            invalid_warehouses = [w for w in self.accessible_warehouses if w not in valid_warehouses]
            if invalid_warehouses:
                raise ValidationError({
                    'accessible_warehouses': f'Invalid warehouses: {invalid_warehouses}. Valid options: {valid_warehouses}'
                })


class VerificationPin(models.Model):
    """Model to handle phone verification PINs during signup"""
    user = models.ForeignKey(CustomerUser, on_delete=models.CASCADE)
    pin = models.CharField(max_length=6)  # 6-digit code
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)  # Track failed attempts
    
    class Meta:
        verbose_name = "Verification PIN"
        verbose_name_plural = "Verification PINs"
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.pin:
            # Generate 6-digit code
            self.pin = str(random.randint(100000, 999999))
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)  # 10 minutes expiry
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if PIN is still valid"""
        return not self.is_used and timezone.now() <= self.expires_at and self.attempts < 3
    
    def mark_used(self):
        """Mark PIN as used"""
        self.is_used = True
        self.save(update_fields=['is_used'])
    
    def increment_attempts(self):
        """Increment failed attempts"""
        self.attempts += 1
        self.save(update_fields=['attempts'])
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired PINs"""
        expired_pins = cls.objects.filter(expires_at__lt=timezone.now())
        count = expired_pins.count()
        expired_pins.delete()
        return count
    
    @classmethod
    def create_for_user(cls, user):
        """Create a new verification PIN for user (invalidate existing ones)"""
        # Remove existing unused PINs for this user
        cls.objects.filter(user=user, is_used=False).delete()
        
        # Create new PIN
        return cls.objects.create(user=user)


class ResetPin(models.Model):
    """Model to handle secure password reset PINs"""
    user = models.ForeignKey(CustomerUser, on_delete=models.CASCADE)
    pin = models.CharField(max_length=6)  # 6-digit code
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.IntegerField(default=0)  # Track failed attempts
    
    class Meta:
        verbose_name = "Password Reset PIN"
        verbose_name_plural = "Password Reset PINs"
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.pin:
            # Generate 6-digit code
            self.pin = str(random.randint(100000, 999999))
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)  # 10 minutes expiry
        super().save(*args, **kwargs)
    
    def is_valid(self):
        """Check if PIN is still valid"""
        return not self.is_used and timezone.now() <= self.expires_at and self.attempts < 3
    
    def mark_used(self):
        """Mark PIN as used"""
        self.is_used = True
        self.save(update_fields=['is_used'])
    
    def increment_attempts(self):
        """Increment failed attempts"""
        self.attempts += 1
        self.save(update_fields=['attempts'])
    
    @classmethod
    def cleanup_expired(cls):
        """Remove expired PINs"""
        expired_pins = cls.objects.filter(expires_at__lt=timezone.now())
        count = expired_pins.count()
        expired_pins.delete()
        return count
    
    @classmethod
    def create_for_user(cls, user):
        """Create a new reset PIN for user (invalidate existing ones)"""
        # Remove existing unused PINs for this user
        cls.objects.filter(user=user, is_used=False).delete()
        
        # Create new PIN
        return cls.objects.create(user=user)


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