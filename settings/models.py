from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
import json
import os

User = get_user_model()


def validate_image_file(value):
    """Validate image file extensions"""
    ext = os.path.splitext(value.name)[1].lower()
    valid_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg']
    if ext not in valid_extensions:
        raise ValidationError(f'Unsupported file extension. Allowed: {", ".join(valid_extensions)}')


class AdminGeneralSettings(models.Model):
    """General Tab - Admin profile and account settings"""
    
    # Admin Profile Information
    admin_user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='general_settings',
        help_text="Admin user this profile belongs to"
    )
    
    # Profile Details (displayed from Add Admin form)
    full_name = models.CharField(max_length=200, blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    role = models.CharField(max_length=50, blank=True)
    department = models.CharField(max_length=100, blank=True)
    
    # Account Status
    account_status = models.CharField(
        max_length=20,
        choices=[('ACTIVE', 'Active'), ('INACTIVE', 'Inactive')],
        default='ACTIVE'
    )
    
    # Additional Profile Settings
    profile_image = models.ImageField(
        upload_to='admin_profiles/',
        blank=True,
        null=True,
        validators=[validate_image_file],
        help_text="Admin profile picture"
    )
    bio = models.TextField(blank=True, help_text="Admin bio/description")
    last_login_display = models.DateTimeField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Admin General Settings"
        verbose_name_plural = "Admin General Settings"
    
    def __str__(self):
        return f"General Settings - {self.admin_user.get_full_name()}"
    
    def save(self, *args, **kwargs):
        # Auto-populate from admin user
        if self.admin_user:
            self.full_name = self.admin_user.get_full_name()
            self.email = self.admin_user.email
            self.phone = self.admin_user.phone
            self.role = self.admin_user.user_role
            self.last_login_display = self.admin_user.last_login
        super().save(*args, **kwargs)


class InvoiceMetaSettings(models.Model):
    """Invoice Meta Tab - Invoice generation configuration"""
    
    # Company Logo
    company_logo = models.ImageField(
        upload_to='invoice_assets/',
        blank=True,
        null=True,
        validators=[validate_image_file],
        help_text="Company logo for invoices (drag & drop)"
    )
    
    # Theme Configuration
    theme_color = models.CharField(
        max_length=7,
        default="#1F2937",
        help_text="Theme color for invoices (hex format: #RRGGBB)"
    )
    secondary_color = models.CharField(
        max_length=7,
        default="#6B7280",
        help_text="Secondary color for invoices"
    )
    
    # Invoice Configuration
    invoice_notes = models.TextField(
        default="Thank you for your business!",
        help_text="Default notes to appear on invoices"
    )
    invoice_number_format = models.CharField(
        max_length=50,
        default="INV-{year}-{month:02d}-{counter:04d}",
        help_text="Format: {year}, {month}, {day}, {counter}"
    )
    invoice_counter = models.IntegerField(
        default=1,
        help_text="Current invoice counter"
    )
    
    # Template Selection
    TEMPLATE_CHOICES = [
        ('CLASSIC', 'Classic Template'),
        ('MODERN', 'Modern Template'),
        ('MINIMAL', 'Minimal Template'),
        ('CORPORATE', 'Corporate Template'),
    ]
    selected_template = models.CharField(
        max_length=20,
        choices=TEMPLATE_CHOICES,
        default='CLASSIC'
    )
    
    # Preview Settings
    show_company_address = models.BooleanField(default=True)
    show_payment_terms = models.BooleanField(default=True)
    show_due_date = models.BooleanField(default=True)
    
    # Footer Configuration
    invoice_footer_text = models.TextField(
        blank=True,
        help_text="Footer text for invoices"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Invoice Meta Settings"
        verbose_name_plural = "Invoice Meta Settings"
    
    def __str__(self):
        return f"Invoice Settings - {self.selected_template}"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and InvoiceMetaSettings.objects.exists():
            raise ValueError("Only one InvoiceMetaSettings instance allowed")
        super().save(*args, **kwargs)
    
    def get_next_invoice_number(self):
        """Generate next invoice number"""
        now = timezone.now()
        invoice_number = self.invoice_number_format.format(
            year=now.year,
            month=now.month,
            day=now.day,
            counter=self.invoice_counter
        )
        
        # Increment counter
        self.invoice_counter += 1
        self.save()
        
        return invoice_number


class CompanyOffice(models.Model):
    """Company Offices - Table of company offices"""
    
    # Office Image
    office_image = models.ImageField(
        upload_to='office_images/',
        blank=True,
        null=True,
        validators=[validate_image_file],
        help_text="Office image (drag & drop)"
    )
    
    # Basic Information
    office_name = models.CharField(max_length=200, unique=True)
    phone_number = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    
    # Address Information
    physical_address = models.TextField(help_text="Physical address of the office")
    digital_address = models.CharField(
        max_length=100,
        blank=True,
        help_text="Digital address (GPS/postal code)"
    )
    
    # Location Coordinates (Optional)
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=8,
        blank=True,
        null=True,
        help_text="Latitude coordinate (optional)"
    )
    longitude = models.DecimalField(
        max_digits=11,
        decimal_places=8,
        blank=True,
        null=True,
        help_text="Longitude coordinate (optional)"
    )
    
    # Map Link (Optional)
    map_link = models.URLField(
        blank=True,
        help_text="Google Maps or other map service link (optional)"
    )
    
    # Office Status
    is_active = models.BooleanField(default=True)
    is_headquarters = models.BooleanField(default=False)
    
    # Operating Information
    operating_hours = models.CharField(
        max_length=100,
        default="8:00 AM - 6:00 PM",
        help_text="Office operating hours"
    )
    timezone = models.CharField(max_length=50, default="UTC")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Company Office"
        verbose_name_plural = "Company Offices"
        ordering = ['office_name']
    
    def __str__(self):
        return f"{self.office_name} ({self.country})"
    
    @property
    def has_coordinates(self):
        """Check if office has location coordinates"""
        return self.latitude is not None and self.longitude is not None


class WarehouseAddress(models.Model):
    """Warehouse Address Cards - Simplified warehouse management"""
    
    # Basic Information
    name = models.CharField(max_length=200, unique=True, help_text="Warehouse name")
    location = models.CharField(max_length=200, help_text="City, state or general location")
    address = models.TextField(help_text="Full warehouse address")
    description = models.TextField(help_text="Description of warehouse services")
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Warehouse Address"
        verbose_name_plural = "Warehouse Addresses"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - {self.location}"


class ShippingMarkFormattingRule(models.Model):
    """Shipping Mark Formatting Rules"""
    
    # Rule Configuration
    rule_name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, help_text="Description of this rule")
    
    # Geographic Criteria
    country = models.CharField(max_length=100, help_text="Country for this rule")
    region = models.CharField(max_length=100, help_text="Region within country")
    
    # Prefix Configuration
    prefix_value = models.CharField(
        max_length=10,
        help_text="Prefix value to add (e.g., '1', '2', 'GA', 'NR')"
    )
    
    # Format Configuration
    format_template = models.CharField(
        max_length=100,
        default="PM{prefix}{name}",
        help_text="Format template: {prefix}, {name}, {counter}"
    )
    
    # Rule Priority
    priority = models.IntegerField(
        default=1,
        help_text="Rule priority (lower number = higher priority)"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Shipping Mark Formatting Rule"
        verbose_name_plural = "Shipping Mark Formatting Rules"
        ordering = ['priority', 'country', 'region']
        unique_together = ['country', 'region', 'prefix_value']
    
    def __str__(self):
        return f"{self.rule_name} ({self.country}, {self.region}) → PM{self.prefix_value}..."
    
    def generate_shipping_mark(self, client_name, counter=None):
        """Generate shipping mark using this rule"""
        # Clean client name (remove spaces, special chars, convert to uppercase)
        clean_name = ''.join(c.upper() for c in client_name if c.isalnum())[:6]
        
        # Apply format template
        shipping_mark = self.format_template.format(
            prefix=self.prefix_value,
            name=clean_name,
            counter=f"{counter:02d}" if counter else ""
        )
        
        return shipping_mark
    
    @classmethod
    def get_rule_for_client(cls, country=None, region=None):
        """Get best matching rule for client location"""
        # Try exact match first
        if country and region:
            rule = cls.objects.filter(
                country__iexact=country,
                region__iexact=region,
                is_active=True
            ).order_by('priority').first()
            
            if rule:
                return rule
        
        # Try country-only match
        if country:
            rule = cls.objects.filter(
                country__iexact=country,
                is_active=True
            ).order_by('priority').first()
            
            if rule:
                return rule
        
        # Fall back to default rule
        return cls.objects.filter(
            is_default=True,
            is_active=True
        ).first()


class ShippingMarkFormatSettings(models.Model):
    """Global Shipping Mark Format Settings"""
    
    # Base Configuration
    base_prefix = models.CharField(
        max_length=10,
        default="PM",
        help_text="Base prefix for all shipping marks"
    )
    
    # Default Format
    default_format_template = models.CharField(
        max_length=100,
        default="PM{name}",
        help_text="Default format when no rules match"
    )
    
    # Auto-generation Settings
    auto_generate_enabled = models.BooleanField(
        default=True,
        help_text="Enable automatic shipping mark generation"
    )
    allow_duplicates = models.BooleanField(
        default=False,
        help_text="Allow duplicate shipping marks"
    )
    append_counter_on_duplicate = models.BooleanField(
        default=True,
        help_text="Append counter if duplicate found"
    )
    
    # Name Processing
    max_name_length = models.IntegerField(
        default=6,
        validators=[MinValueValidator(3), MaxValueValidator(15)],
        help_text="Maximum characters from client name"
    )
    use_nickname_if_available = models.BooleanField(
        default=True,
        help_text="Use nickname instead of first name if available"
    )
    
    # Validation Rules
    min_shipping_mark_length = models.IntegerField(
        default=5,
        validators=[MinValueValidator(3)]
    )
    max_shipping_mark_length = models.IntegerField(
        default=15,
        validators=[MinValueValidator(5)]
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Shipping Mark Format Settings"
        verbose_name_plural = "Shipping Mark Format Settings"
    
    def __str__(self):
        return f"Shipping Mark Settings - {self.base_prefix}"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and ShippingMarkFormatSettings.objects.exists():
            raise ValueError("Only one ShippingMarkFormatSettings instance allowed")
        super().save(*args, **kwargs)
    
    def generate_shipping_mark(self, client_data):
        """Generate shipping mark for client"""
        # Extract client information
        first_name = client_data.get('first_name', '')
        last_name = client_data.get('last_name', '')
        nickname = client_data.get('nickname', '')
        country = client_data.get('country', '')
        region = client_data.get('region', '')
        
        # Choose name to use
        if self.use_nickname_if_available and nickname:
            name_to_use = nickname
        else:
            name_to_use = first_name
        
        # Clean name
        clean_name = ''.join(c.upper() for c in name_to_use if c.isalnum())
        clean_name = clean_name[:self.max_name_length]
        
        # Get applicable rule
        rule = ShippingMarkFormattingRule.get_rule_for_client(country, region)
        
        if rule:
            base_mark = rule.generate_shipping_mark(clean_name)
        else:
            base_mark = self.default_format_template.format(name=clean_name)
        
        # Handle duplicates
        if not self.allow_duplicates:
            from users.models import CustomerUser
            
            final_mark = base_mark
            counter = 1
            
            while CustomerUser.objects.filter(shipping_mark=final_mark).exists():
                if self.append_counter_on_duplicate:
                    final_mark = f"{base_mark}{counter:02d}"
                    counter += 1
                else:
                    # Add random suffix or use timestamp
                    import random
                    suffix = random.randint(10, 99)
                    final_mark = f"{base_mark}{suffix}"
                    break
                
                if counter > 99:  # Prevent infinite loop
                    break
            
            return final_mark
        
        return base_mark


class SystemSettings(models.Model):
    """Global system configuration settings"""
    
    # Application Settings
    app_name = models.CharField(max_length=100, default="Prime Pre Logistics")
    app_version = models.CharField(max_length=20, default="1.0.0")
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True, null=True)
    
    # Authentication Settings
    jwt_expiry_minutes = models.IntegerField(
        default=60,
        validators=[MinValueValidator(5), MaxValueValidator(1440)]
    )
    max_login_attempts = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    password_reset_expiry_hours = models.IntegerField(
        default=24,
        validators=[MinValueValidator(1), MaxValueValidator(168)]
    )
    
    # Rate Limiting
    api_rate_limit_per_minute = models.IntegerField(
        default=100,
        validators=[MinValueValidator(10), MaxValueValidator(1000)]
    )
    sms_rate_limit_per_hour = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(20)]
    )
    
    # File Upload Settings
    max_file_size_mb = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    allowed_file_extensions = models.JSONField(
        default=list,
        help_text="List of allowed file extensions (e.g., ['.xlsx', '.pdf'])"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"
    
    def __str__(self):
        return f"System Settings (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and SystemSettings.objects.exists():
            raise ValueError("Only one SystemSettings instance allowed")
        super().save(*args, **kwargs)


class CompanySettings(models.Model):
    """Company/Organization configuration"""
    
    # Company Information
    company_name = models.CharField(max_length=200, default="Prime Pre Logistics Ltd")
    company_email = models.EmailField(default="info@primepre.com")
    company_phone = models.CharField(max_length=20, default="+233 123 456 789")
    company_address = models.TextField(default="Accra, Ghana")
    company_website = models.URLField(blank=True, null=True)
    
    # Business Settings
    default_currency = models.CharField(max_length=3, default="USD")
    fiscal_year_start_month = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    business_hours_start = models.TimeField(default="08:00")
    business_hours_end = models.TimeField(default="18:00")
    business_days = models.JSONField(
        default=list,
        help_text="List of business days (0=Monday, 6=Sunday)"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Company Settings"
        verbose_name_plural = "Company Settings"
    
    def __str__(self):
        return f"{self.company_name} Settings"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and CompanySettings.objects.exists():
            raise ValueError("Only one CompanySettings instance allowed")
        super().save(*args, **kwargs)


class NotificationSettings(models.Model):
    """Notification and communication settings"""
    
    # Email Settings
    email_notifications_enabled = models.BooleanField(default=True)
    email_host = models.CharField(max_length=100, default="smtp.gmail.com")
    email_port = models.IntegerField(default=587)
    email_use_tls = models.BooleanField(default=True)
    email_from_address = models.EmailField(default="no-reply@primepre.com")
    
    # SMS Settings
    sms_notifications_enabled = models.BooleanField(default=False)
    twilio_account_sid = models.CharField(max_length=100, blank=True)
    twilio_auth_token = models.CharField(max_length=100, blank=True)
    twilio_phone_number = models.CharField(max_length=20, blank=True)
    sms_console_mode = models.BooleanField(
        default=True,
        help_text="Use console output for SMS in development"
    )
    
    # Notification Templates
    welcome_email_template = models.TextField(
        default="Welcome to Prime Pre Logistics! Your account has been created."
    )
    shipment_arrival_template = models.TextField(
        default="Your shipment {tracking_id} has arrived at {location}."
    )
    delivery_ready_template = models.TextField(
        default="Your shipment {tracking_id} is ready for delivery."
    )
    
    # Admin Alerts
    admin_alert_email = models.EmailField(default="admin@primepre.com")
    system_error_notifications = models.BooleanField(default=True)
    low_capacity_threshold = models.IntegerField(
        default=90,
        validators=[MinValueValidator(50), MaxValueValidator(99)],
        help_text="Warehouse capacity percentage to trigger alerts"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Notification Settings"
        verbose_name_plural = "Notification Settings"
    
    def __str__(self):
        return f"Notification Settings (Updated: {self.updated_at.strftime('%Y-%m-%d')})"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and NotificationSettings.objects.exists():
            raise ValueError("Only one NotificationSettings instance allowed")
        super().save(*args, **kwargs)


class CompanySettings(models.Model):
    """Company/Organization configuration settings"""
    
    # Application Settings
    app_name = models.CharField(max_length=100, default="Prime Pre Logistics")
    app_version = models.CharField(max_length=20, default="1.0.0")
    maintenance_mode = models.BooleanField(default=False)
    maintenance_message = models.TextField(blank=True, null=True)
    
    # Authentication Settings
    jwt_expiry_minutes = models.IntegerField(
        default=60,
        validators=[MinValueValidator(5), MaxValueValidator(1440)]
    )
    max_login_attempts = models.IntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    password_reset_expiry_hours = models.IntegerField(
        default=24,
        validators=[MinValueValidator(1), MaxValueValidator(168)]
    )
    
    # Rate Limiting
    api_rate_limit_per_minute = models.IntegerField(
        default=100,
        validators=[MinValueValidator(10), MaxValueValidator(1000)]
    )
    sms_rate_limit_per_hour = models.IntegerField(
        default=3,
        validators=[MinValueValidator(1), MaxValueValidator(20)]
    )
    
    # File Upload Settings
    max_file_size_mb = models.IntegerField(
        default=10,
        validators=[MinValueValidator(1), MaxValueValidator(100)]
    )
    allowed_file_extensions = models.JSONField(
        default=list,
        help_text="List of allowed file extensions (e.g., ['.xlsx', '.pdf'])"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "System Settings"
        verbose_name_plural = "System Settings"
    
    def __str__(self):
        return f"System Settings (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M')})"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists (singleton pattern)
        if not self.pk and SystemSettings.objects.exists():
            raise ValueError("Only one SystemSettings instance allowed")
        super().save(*args, **kwargs)


class CompanySettings(models.Model):
    """Company/Organization configuration"""
    
    # Company Information
    company_name = models.CharField(max_length=200, default="Prime Pre Logistics Ltd")
    company_email = models.EmailField(default="info@primepre.com")
    company_phone = models.CharField(max_length=20, default="+233 123 456 789")
    company_address = models.TextField(default="Accra, Ghana")
    company_website = models.URLField(blank=True, null=True)
    
    # Business Settings
    default_currency = models.CharField(max_length=3, default="USD")
    fiscal_year_start_month = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(12)]
    )
    business_hours_start = models.TimeField(default="08:00")
    business_hours_end = models.TimeField(default="18:00")
    business_days = models.JSONField(
        default=list,
        help_text="List of business days (0=Monday, 6=Sunday)"
    )
    
    # Shipping Mark Settings
    shipping_mark_prefix = models.CharField(max_length=10, default="PM")
    auto_generate_shipping_marks = models.BooleanField(default=True)
    shipping_mark_format = models.CharField(
        max_length=50,
        default="{prefix}{first_name}{counter:02d}",
        help_text="Format: {prefix}, {first_name}, {last_name}, {counter}"
    )
    
    # Default Client Settings
    default_client_assignment = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="default_assignments",
        help_text="Default client for unassigned packages"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Company Settings"
        verbose_name_plural = "Company Settings"
    
    def __str__(self):
        return f"{self.company_name} Settings"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and CompanySettings.objects.exists():
            raise ValueError("Only one CompanySettings instance allowed")
        super().save(*args, **kwargs)


class OfficeSettings(models.Model):
    """Office/Branch configuration"""
    
    # Office Information
    office_name = models.CharField(max_length=100, unique=True)
    office_code = models.CharField(max_length=10, unique=True)
    office_type = models.CharField(
        max_length=20,
        choices=[
            ('HEAD_OFFICE', 'Head Office'),
            ('BRANCH', 'Branch Office'),
            ('WAREHOUSE', 'Warehouse'),
            ('COLLECTION_POINT', 'Collection Point'),
        ],
        default='BRANCH'
    )
    
    # Location Details
    country = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    address = models.TextField()
    postal_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    
    # Operational Settings
    is_active = models.BooleanField(default=True)
    accepts_shipments = models.BooleanField(default=True)
    accepts_collections = models.BooleanField(default=True)
    working_hours_start = models.TimeField(default="08:00")
    working_hours_end = models.TimeField(default="17:00")
    timezone = models.CharField(max_length=50, default="UTC")
    
    # Warehouse Capacity (if applicable)
    max_capacity_cbm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1000.00,
        validators=[MinValueValidator(0)]
    )
    current_capacity_cbm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)]
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Office Settings"
        verbose_name_plural = "Office Settings"
        ordering = ['office_name']
    
    def __str__(self):
        return f"{self.office_name} ({self.office_code})"
    
    @property
    def capacity_percentage(self):
        """Calculate capacity utilization percentage"""
        if self.max_capacity_cbm > 0:
            return (self.current_capacity_cbm / self.max_capacity_cbm) * 100
        return 0


class NotificationSettings(models.Model):
    """Notification and communication settings"""
    
    # Email Settings
    email_notifications_enabled = models.BooleanField(default=True)
    email_host = models.CharField(max_length=100, default="smtp.gmail.com")
    email_port = models.IntegerField(default=587)
    email_use_tls = models.BooleanField(default=True)
    email_from_address = models.EmailField(default="no-reply@primepre.com")
    
    # SMS Settings
    sms_notifications_enabled = models.BooleanField(default=False)
    twilio_account_sid = models.CharField(max_length=100, blank=True)
    twilio_auth_token = models.CharField(max_length=100, blank=True)
    twilio_phone_number = models.CharField(max_length=20, blank=True)
    sms_console_mode = models.BooleanField(
        default=True,
        help_text="Use console output for SMS in development"
    )
    
    # WhatsApp Settings
    whatsapp_notifications_enabled = models.BooleanField(default=False)
    whatsapp_api_key = models.CharField(max_length=200, blank=True)
    whatsapp_business_number = models.CharField(max_length=20, blank=True)
    
    # Notification Templates
    welcome_email_template = models.TextField(
        default="Welcome to Prime Pre Logistics! Your account has been created."
    )
    shipment_arrival_template = models.TextField(
        default="Your shipment {tracking_id} has arrived at {location}."
    )
    delivery_ready_template = models.TextField(
        default="Your shipment {tracking_id} is ready for delivery."
    )
    
    # Admin Alerts
    admin_alert_email = models.EmailField(default="admin@primepre.com")
    system_error_notifications = models.BooleanField(default=True)
    low_capacity_threshold = models.IntegerField(
        default=90,
        validators=[MinValueValidator(50), MaxValueValidator(99)],
        help_text="Warehouse capacity percentage to trigger alerts"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Notification Settings"
        verbose_name_plural = "Notification Settings"
    
    def __str__(self):
        return f"Notification Settings (Updated: {self.updated_at.strftime('%Y-%m-%d')})"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and NotificationSettings.objects.exists():
            raise ValueError("Only one NotificationSettings instance allowed")
        super().save(*args, **kwargs)


class WarehouseSettings(models.Model):
    """Warehouse-specific configuration"""
    
    WAREHOUSE_TYPES = [
        ('CHINA', 'China Warehouse'),
        ('GHANA', 'Ghana Warehouse'),
        ('TRANSIT', 'Transit Warehouse'),
    ]
    
    # Warehouse Information
    warehouse_name = models.CharField(max_length=100, unique=True)
    warehouse_code = models.CharField(max_length=10, unique=True)
    warehouse_type = models.CharField(max_length=20, choices=WAREHOUSE_TYPES)
    location = models.CharField(max_length=100)
    office = models.ForeignKey(
        OfficeSettings,
        on_delete=models.CASCADE,
        related_name='warehouses'
    )
    
    # Operational Settings
    is_active = models.BooleanField(default=True)
    accepts_goods = models.BooleanField(default=True)
    max_daily_intake = models.IntegerField(
        default=200,
        validators=[MinValueValidator(1)]
    )
    processing_sla_days = models.IntegerField(
        default=14,
        validators=[MinValueValidator(1), MaxValueValidator(90)]
    )
    
    # Capacity Management
    max_capacity_cbm = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=10000.00
    )
    high_priority_threshold_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=25000.00,
        help_text="Goods value threshold for high priority processing"
    )
    auto_flag_threshold_days = models.IntegerField(
        default=30,
        validators=[MinValueValidator(1)],
        help_text="Days after which goods are auto-flagged for review"
    )
    
    # Validation Limits
    max_cbm_per_item = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        default=1000.000
    )
    max_weight_per_item = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=50000.00
    )
    max_quantity_per_item = models.IntegerField(default=100000)
    max_estimated_value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=1000000.00
    )
    
    # Available Locations within warehouse
    available_locations = models.JSONField(
        default=list,
        help_text="List of available storage locations"
    )
    
    # Workflow Settings
    auto_workflows_enabled = models.BooleanField(default=True)
    batch_processing_enabled = models.BooleanField(default=True)
    priority_processing_enabled = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Warehouse Settings"
        verbose_name_plural = "Warehouse Settings"
        ordering = ['warehouse_name']
    
    def __str__(self):
        return f"{self.warehouse_name} ({self.warehouse_type})"
    
    def get_current_capacity(self):
        """Calculate current warehouse utilization"""
        # This would integrate with actual goods in warehouse
        # For now, return placeholder
        return 0.00
    
    @property
    def capacity_percentage(self):
        """Calculate capacity utilization percentage"""
        current = self.get_current_capacity()
        if self.max_capacity_cbm > 0:
            return (current / float(self.max_capacity_cbm)) * 100
        return 0


class DefaultSettings(models.Model):
    """Default values and global settings manager"""
    
    # Default Rates
    default_sea_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=50.00
    )
    default_air_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=150.00
    )
    
    # Default Status Values
    default_cargo_status = models.CharField(
        max_length=20,
        default='IN_TRANSIT'
    )
    default_goods_status_china = models.CharField(
        max_length=30,
        default='READY_FOR_SHIPPING'
    )
    default_goods_status_ghana = models.CharField(
        max_length=30,
        default='READY_FOR_DELIVERY'
    )
    
    # System Defaults
    default_pagination_size = models.IntegerField(
        default=20,
        validators=[MinValueValidator(5), MaxValueValidator(100)]
    )
    default_timezone = models.CharField(max_length=50, default="UTC")
    default_language = models.CharField(max_length=10, default="en")
    
    # Cache Settings
    cache_duration_hours = models.IntegerField(
        default=6,
        validators=[MinValueValidator(1), MaxValueValidator(168)]
    )
    enable_caching = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    class Meta:
        verbose_name = "Default Settings"
        verbose_name_plural = "Default Settings"
    
    def __str__(self):
        return f"Default Settings (Updated: {self.updated_at.strftime('%Y-%m-%d')})"
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        if not self.pk and DefaultSettings.objects.exists():
            raise ValueError("Only one DefaultSettings instance allowed")
        super().save(*args, **kwargs)


class AdminMessage(models.Model):
    """Model for storing admin-to-client messages"""
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    sender = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_messages',
        limit_choices_to={'user_role__in': ['ADMIN', 'SUPER_ADMIN']}
    )
    
    # Recipients - can be specific clients or broadcast to all
    is_broadcast = models.BooleanField(default=False, help_text="Send to all clients")
    target_shipping_marks = models.JSONField(
        default=list, 
        blank=True,
        help_text="List of shipping marks to target (if not broadcast)"
    )
    target_clients = models.ManyToManyField(
        User,
        related_name='received_admin_messages',
        blank=True,
        limit_choices_to={'user_role': 'CUSTOMER'}
    )
    
    # Message metadata
    created_at = models.DateTimeField(auto_now_add=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Statistics
    total_recipients = models.IntegerField(default=0)
    read_count = models.IntegerField(default=0)
    
    class Meta:
        verbose_name = "Admin Message"
        verbose_name_plural = "Admin Messages"
        ordering = ['-created_at']
    
    def __str__(self):
        target = "All Clients" if self.is_broadcast else f"{len(self.target_shipping_marks)} clients"
        return f"{self.title} -> {target} ({self.priority})"
    
    def save(self, *args, **kwargs):
        # Set sent_at timestamp if not already set
        if not self.sent_at:
            from django.utils import timezone
            self.sent_at = timezone.now()
        super().save(*args, **kwargs)
        
        # Create individual client notifications after saving
        if self.pk:
            self.create_client_notifications()
    
    def create_client_notifications(self):
        """Create individual ClientNotification records for tracking"""
        from users.models import CustomerUser
        
        if self.is_broadcast:
            # Send to all active customers
            recipients = CustomerUser.objects.filter(
                user_role='CUSTOMER',
                is_active=True
            )
        else:
            # Send to specific shipping marks or target clients
            recipients = CustomerUser.objects.filter(
                user_role='CUSTOMER',
                is_active=True
            )
            
            if self.target_shipping_marks:
                recipients = recipients.filter(
                    shipping_mark__in=self.target_shipping_marks
                )
            elif self.target_clients.exists():
                recipients = recipients.filter(
                    id__in=self.target_clients.values_list('id', flat=True)
                )
        
        # Create notifications for each recipient
        notifications_to_create = []
        for recipient in recipients:
            notifications_to_create.append(
                ClientNotification(
                    admin_message=self,
                    recipient=recipient,
                    title=self.title,
                    message=self.message,
                    priority=self.priority,
                    notification_type='admin_message'
                )
            )
        
        if notifications_to_create:
            ClientNotification.objects.bulk_create(notifications_to_create, ignore_conflicts=True)
            
        # Update total recipients count
        self.total_recipients = len(notifications_to_create)
        self.save(update_fields=['total_recipients'])


class ClientNotification(models.Model):
    """Individual notification records for clients"""
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    TYPE_CHOICES = [
        ('admin_message', 'Admin Message'),
        ('system_alert', 'System Alert'),
        ('shipment_update', 'Shipment Update'),
        ('warehouse_notification', 'Warehouse Notification'),
    ]
    
    # Link to admin message (if applicable)
    admin_message = models.ForeignKey(
        AdminMessage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='client_notifications'
    )
    
    # Recipient
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        limit_choices_to={'user_role': 'CUSTOMER'}
    )
    
    # Notification content
    title = models.CharField(max_length=200)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    notification_type = models.CharField(max_length=25, choices=TYPE_CHOICES, default='system_alert')
    
    # Metadata for warehouse notifications
    warehouse = models.CharField(max_length=50, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    action_required = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Client Notification"
        verbose_name_plural = "Client Notifications"
        ordering = ['-created_at']
        unique_together = ['admin_message', 'recipient']  # Prevent duplicate notifications
    
    def __str__(self):
        return f"{self.title} -> {self.recipient.get_full_name()} ({self.priority})"
    
    def mark_as_read(self):
        """Mark notification as read and update admin message stats"""
        if not self.is_read:
            self.is_read = True
            from django.utils import timezone
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
            
            # Update admin message read count
            if self.admin_message:
                AdminMessage.objects.filter(id=self.admin_message.id).update(
                    read_count=models.F('read_count') + 1
                )
    
    def mark_as_unread(self):
        """Mark notification as unread and update admin message stats"""
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save(update_fields=['is_read', 'read_at'])
            
            # Update admin message read count
            if self.admin_message:
                AdminMessage.objects.filter(id=self.admin_message.id).update(
                    read_count=models.F('read_count') - 1
                )