from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid

# Create your models here.
class GoodsReceivedChina(models.Model):
    """
    Model to track goods received in China warehouse before shipping.
    """
    
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("READY_FOR_SHIPPING", "Ready for Shipping"),
        ("FLAGGED", "Flagged"),
        ("SHIPPED", "Shipped"),
        ("CANCELLED", "Cancelled")
    ]
    
    LOCATION_CHOICES = [
        ("GUANGZHOU", "Guangzhou"),
        ("SHENZHEN", "Shenzhen"),
        ("SHANGHAI", "Shanghai"),
        ("YIWU", "Yiwu"),
        ("OTHER", "Other")
    ]
    
    # Unique identifiers
    item_id = models.CharField(max_length=50, unique=True, editable=False)
    shipping_mark = models.CharField(
        max_length=20, 
        unique=True,
        help_text="Customer's shipping mark identifier"
    )
    supply_tracking = models.CharField(
        max_length=50, 
        unique=True,
        help_text="Supplier's tracking number"
    )
    
    # Physical properties - using proper field types
    cbm = models.DecimalField(
        max_digits=10, 
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
        help_text="Cubic meters (CBM)"
    )
    weight = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Weight in kilograms",
        null = True,
        blank = True
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of items/pieces"
    )
    
    # Description and location
    description = models.TextField(
        blank=True, 
        null=True,
        help_text="Detailed description of the goods"
    )
    location = models.CharField(
        max_length=20, 
        choices=LOCATION_CHOICES,
        default="GUANGZHOU",
        help_text="Warehouse location in China"
    )
    
    # Status and tracking
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default="PENDING",
        db_index=True
    )
    
    # Timestamps
    date_received = models.DateTimeField(
        auto_now_add=True,
        help_text="When goods were received in warehouse"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional fields 
    supplier_name = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Name of the supplier"
    )
    estimated_value = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        blank=True, 
        null=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Estimated value in USD"
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        help_text="Internal notes for staff"
    )
    
    class Meta:
        verbose_name = "Goods Received (China)"
        verbose_name_plural = "Goods Received (China)"
        ordering = ['-date_received']
        indexes = [
            models.Index(fields=['status', 'date_received']),
            models.Index(fields=['shipping_mark']),
            models.Index(fields=['supply_tracking']),
        ]
    
    def __str__(self):
        return f"{self.item_id} - {self.shipping_mark} ({self.status})"
    
    def __repr__(self):
        return f"<GoodsReceivedChina: {self.item_id}>"
    
    def save(self, *args, **kwargs):
        if not self.item_id:
            # Generate a more robust unique ID
            timestamp = int(timezone.now().timestamp())
            unique_suffix = str(uuid.uuid4())[:8].upper()
            self.item_id = f"CHN{timestamp}{unique_suffix}"
        super().save(*args, **kwargs)
    
    @property
    def is_ready_for_shipping(self):
        """Check if goods are ready for shipping"""
        return self.status == "READY_FOR_SHIPPING"
    
    @property
    def is_flagged(self):
        """Check if goods are flagged"""
        return self.status == "FLAGGED"
    
    @property
    def days_in_warehouse(self):
        """Calculate days since goods were received"""
        return (timezone.now() - self.date_received).days
    
    def mark_ready_for_shipping(self):
        """Mark goods as ready for shipping"""
        self.status = "READY_FOR_SHIPPING"
        self.save(update_fields=['status', 'updated_at'])
    
    def flag_goods(self, reason=None):
        """Flag goods and optionally add reason to notes"""
        self.status = "FLAGGED"
        if reason:
            current_notes = self.notes or ""
            self.notes = f"{current_notes}\nFlagged: {reason}".strip()
        self.save(update_fields=['status', 'notes', 'updated_at'])
    
    def mark_shipped(self):
        """Mark goods as shipped"""
        self.status = "SHIPPED"
        self.save(update_fields=['status', 'updated_at'])
        
        
        
        
        
class GoodsReceivedGhana(models.Model):
    """
    Model to track goods received in Ghana warehouse before shipping.
    """
    
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("READY_FOR_SHIPPING", "Ready for Shipping"),
        ("FLAGGED", "Flagged"),
        ("SHIPPED", "Shipped"),
        ("CANCELLED", "Cancelled")
    ]
    
    LOCATION_CHOICES = [
        ("ACCRA", "Accra"),
        ("KUMASI", "Kumasi"),
        ("TAKORADI", "Takoradi"),
        ("OTHER", "Other")
    ]
    
    # Unique identifiers
    item_id = models.CharField(max_length=50, unique=True, editable=False)
    shipping_mark = models.CharField(
        max_length=20, 
        unique=True,
        help_text="Customer's shipping mark identifier"
    )
    supply_tracking = models.CharField(
        max_length=50, 
        unique=True,
        help_text="Supplier's tracking number"
    )
    
    # Physical properties - using proper field types
    cbm = models.DecimalField(
        max_digits=10, 
        decimal_places=3,
        validators=[MinValueValidator(Decimal('0.001'))],
        help_text="Cubic meters (CBM)"
    )
    weight = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Weight in kilograms",
        null = True,
        blank = True
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of items/pieces"
    )
    
    # Description and location
    description = models.TextField(
        blank=True, 
        null=True,
        help_text="Detailed description of the goods"
    )
    location = models.CharField(
        max_length=20, 
        choices=LOCATION_CHOICES,
        default="ACCRA",
        help_text="Warehouse location in Ghana"
    )
    
    # Status and tracking
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default="PENDING",
        db_index=True
    )
    
    # Timestamps
    date_received = models.DateTimeField(
        auto_now_add=True,
        help_text="When goods were received in warehouse"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Optional fields 
    supplier_name = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Name of the supplier"
    )
    estimated_value = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        blank=True, 
        null=True,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Estimated value in USD"
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        help_text="Internal notes for staff"
    )
    
    class Meta:
        verbose_name = "Goods Received (Ghana)"
        verbose_name_plural = "Goods Received (Ghana)"
        ordering = ['-date_received']
        indexes = [
            models.Index(fields=['status', 'date_received']),
            models.Index(fields=['shipping_mark']),
            models.Index(fields=['supply_tracking']),
        ]
    
    def __str__(self):
        return f"{self.item_id} - {self.shipping_mark} ({self.status})"
    
    def __repr__(self):
        return f"<GoodsReceivedGhana: {self.item_id}>"
    
    def save(self, *args, **kwargs):
        if not self.item_id:
            # Generate a more robust unique ID for Ghana
            timestamp = int(timezone.now().timestamp())
            unique_suffix = str(uuid.uuid4())[:8].upper()
            self.item_id = f"GHA{timestamp}{unique_suffix}"
        super().save(*args, **kwargs)
    
    @property
    def is_ready_for_shipping(self):
        """Check if goods are ready for shipping"""
        return self.status == "READY_FOR_SHIPPING"
    
    @property
    def is_flagged(self):
        """Check if goods are flagged"""
        return self.status == "FLAGGED"
    
    @property
    def days_in_warehouse(self):
        """Calculate days since goods were received"""
        return (timezone.now() - self.date_received).days
    
    def mark_ready_for_shipping(self):
        """Mark goods as ready for shipping"""
        self.status = "READY_FOR_SHIPPING"
        self.save(update_fields=['status', 'updated_at'])
    
    def flag_goods(self, reason=None):
        """Flag goods and optionally add reason to notes"""
        self.status = "FLAGGED"
        if reason:
            current_notes = self.notes or ""
            self.notes = f"{current_notes}\nFlagged: {reason}".strip()
        self.save(update_fields=['status', 'notes', 'updated_at'])
    
    def mark_shipped(self):
        """Mark goods as shipped"""
        self.status = "SHIPPED"
        self.save(update_fields=['status', 'updated_at'])


