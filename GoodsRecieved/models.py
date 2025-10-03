from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal, ROUND_HALF_UP
def quantize_cbm(value: Decimal) -> Decimal:
    if value is None:
        return value
    if not isinstance(value, Decimal):
        value = Decimal(value)
    return value.quantize(Decimal("0.00001"), rounding=ROUND_HALF_UP)

import uuid


class GoodsReceivedChina(models.Model):
    """Goods received in China warehouse before shipping."""

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("READY_FOR_SHIPPING", "Ready for Shipping"),
        ("FLAGGED", "Flagged"),
        ("SHIPPED", "Shipped"),
        ("CANCELLED", "Cancelled"),
    ]

    # Relationships
    customer = models.ForeignKey(
        "users.CustomerUser",
        on_delete=models.CASCADE,
        related_name="china_goods",
        help_text="Customer who owns this shipment",
        null=True,
        blank=True,
    )
    shipping_mark = models.CharField(
        max_length=100,
        help_text="Customer's shipping mark identifier (auto-synced from user)",
        db_index=True,
        blank=True,
        null=True,
    )

    supply_tracking = models.CharField(max_length=50, unique=True, help_text="Supplier's tracking number")

    # Physical properties
    cbm = models.DecimalField(
        max_digits=12, decimal_places=5,
        validators=[MinValueValidator(Decimal("0.00001"))],
        help_text="Cubic meters (CBM)",
        null=True, blank=True,
    )
    weight = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Weight in kilograms",
        null=True, blank=True,
    )
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)], help_text="Number of items/pieces")

    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING", db_index=True)
    method_of_shipping = models.CharField(
        max_length=20,
        choices=[("AIR", "Air"), ("SEA", "Sea")],
        default="SEA",
        help_text="Method of shipping for the goods",
    )

    date_received = models.DateTimeField(auto_now_add=True)
    date_loading = models.DateField(null=True, blank=True, help_text="Date when goods were loaded/processed")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Goods Received (China)"
        verbose_name_plural = "Goods Received (China)"
        ordering = ["-date_received"]
        indexes = [
            models.Index(fields=["status", "date_received"]),
            models.Index(fields=["shipping_mark"]),
            models.Index(fields=["supply_tracking"]),
            models.Index(fields=["shipping_mark", "status"]),
        ]
        constraints = [
            # Supply tracking must be unique regardless of customer
            # Each supply tracking ID should be unique across the system
        ]

    def __str__(self):
        return f"{self.shipping_mark} - {self.supply_tracking} ({self.status})"

    def save(self, *args, **kwargs):
        if self.customer:
            self.shipping_mark = self.customer.shipping_mark
        if self.cbm is not None:
            self.cbm = quantize_cbm(self.cbm)
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.customer and self.shipping_mark != self.customer.shipping_mark:
            from django.core.exceptions import ValidationError
            raise ValidationError({"shipping_mark": f"Must match customer's shipping mark: {self.customer.shipping_mark}"})

    # ---- Business helpers ----
    @property
    def is_ready_for_shipping(self):
        """Returns True if status is READY_FOR_SHIPPING."""
        return self.status == "READY_FOR_SHIPPING"

    @property
    def is_flagged(self):
        """Returns True if status is FLAGGED."""
        return self.status == "FLAGGED"

    @property
    def days_in_warehouse(self):
        """Returns the number of days goods have been in warehouse."""
        return (timezone.now() - self.date_received).days

    def mark_ready_for_shipping(self):
        """Mark goods as ready for shipping. Uses atomic transaction."""
        from django.db import transaction
        with transaction.atomic():
            self.status = "READY_FOR_SHIPPING"
            self.save(update_fields=["status", "updated_at"])

    def mark_shipped(self):
        """Mark goods as shipped. Uses atomic transaction."""
        from django.db import transaction
        with transaction.atomic():
            self.status = "SHIPPED"
            self.save(update_fields=["status", "updated_at"])


class GoodsReceivedGhana(models.Model):
    """Goods received in Ghana warehouse before delivery."""

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("READY_FOR_DELIVERY", "Ready for Delivery"),
        ("FLAGGED", "Flagged"),
        ("DELIVERED", "Delivered"),
        ("CANCELLED", "Cancelled"),
    ]

    LOCATION_CHOICES = [
        ("ACCRA", "Accra"),
        ("KUMASI", "Kumasi"),
        ("TAKORADI", "Takoradi"),
        ("OTHER", "Other"),
    ]

    customer = models.ForeignKey(
        "users.CustomerUser",
        on_delete=models.CASCADE,
        related_name="ghana_goods",
        help_text="Customer who owns this shipment",
        null=True,
        blank=True,
    )
    shipping_mark = models.CharField(
        max_length=20,
        help_text="Customer's shipping mark identifier (auto-synced from user)",
        db_index=True,
        blank=True,
        null=True,
    )

    supply_tracking = models.CharField(max_length=50, unique=True)

    # Dimension fields for sea cargo CBM calculation
    length = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Length in centimeters (for sea cargo CBM calculation)"
    )
    breadth = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Breadth/Width in centimeters (for sea cargo CBM calculation)"
    )
    height = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Height in centimeters (for sea cargo CBM calculation)"
    )
    
    cbm = models.DecimalField(
        max_digits=12, 
        decimal_places=5, 
        validators=[MinValueValidator(Decimal("0.00001"))],
        null=True, 
        blank=True,
        help_text="Cubic meters - auto-calculated for sea cargo, manual for air cargo"
    )
    weight = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        null=True, blank=True,
    )
    quantity = models.PositiveIntegerField(validators=[MinValueValidator(1)])

    description = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=20, choices=LOCATION_CHOICES, default="ACCRA")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="READY_FOR_DELIVERY", db_index=True)
    method_of_shipping = models.CharField(max_length=20, choices=[("AIR", "Air"), ("SEA", "Sea")], default="SEA")

    date_received = models.DateTimeField(auto_now_add=True)
    date_loading = models.DateField(null=True, blank=True, help_text="Date when goods were loaded/processed")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Goods Received (Ghana)"
        verbose_name_plural = "Goods Received (Ghana)"
        ordering = ["-date_received"]
        indexes = [
            models.Index(fields=["status", "date_received"]),
            models.Index(fields=["shipping_mark"]),
            models.Index(fields=["supply_tracking"]),
            models.Index(fields=["shipping_mark", "status"]),
        ]
        constraints = [
            # Supply tracking must be unique regardless of customer
            # Each supply tracking ID should be unique across the system
        ]

    def __str__(self):
        return f"{self.shipping_mark} - {self.supply_tracking} ({self.status})"

    def save(self, *args, **kwargs):
        if self.customer:
            self.shipping_mark = self.customer.shipping_mark
        
        # Auto-calculate CBM for sea cargo if dimensions are provided
        if (self.method_of_shipping == "SEA" and 
            self.length and self.breadth and self.height and self.quantity):
            # CBM = (length * breadth * height * quantity) / 1,000,000
            self.cbm = ((self.length * self.breadth * self.height * self.quantity) / Decimal('1000000'))
        if self.cbm is not None:
            self.cbm = quantize_cbm(self.cbm)
        
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if self.customer and self.shipping_mark != self.customer.shipping_mark:
            from django.core.exceptions import ValidationError
            raise ValidationError({"shipping_mark": f"Must match customer's shipping mark: {self.customer.shipping_mark}"})

    # ---- Business helpers ----
    @property
    def is_ready_for_delivery(self):
        """Returns True if status is READY_FOR_DELIVERY."""
        return self.status == "READY_FOR_DELIVERY"

    @property
    def is_flagged(self):
        """Returns True if status is FLAGGED."""
        return self.status == "FLAGGED"

    @property
    def days_in_warehouse(self):
        """Returns the number of days goods have been in warehouse."""
        return (timezone.now() - self.date_received).days

    def mark_ready_for_delivery(self):
        """Mark goods as ready for delivery. Uses atomic transaction."""
        from django.db import transaction
        with transaction.atomic():
            self.status = "READY_FOR_DELIVERY"
            self.save(update_fields=["status", "updated_at"])

    def mark_delivered(self):
        """Mark goods as delivered. Uses atomic transaction."""
        from django.db import transaction
        with transaction.atomic():
            self.status = "DELIVERED"
            self.save(update_fields=["status", "updated_at"])


class GoodsReceivedContainer(models.Model):
    """Container for organizing goods received items, separate from cargo containers."""
    
    CONTAINER_TYPE_CHOICES = (
        ('air', 'Air Goods'),
        ('sea', 'Sea Goods'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('ready_for_delivery', 'Ready for Delivery'),
        ('delivered', 'Delivered'),
        ('flagged', 'Flagged'),
    )
    
    LOCATION_CHOICES = (
        ('china', 'China Warehouse'),
        ('ghana', 'Ghana Warehouse'),
    )
    
    container_id = models.CharField(max_length=100, unique=True, primary_key=True)
    container_type = models.CharField(max_length=10, choices=CONTAINER_TYPE_CHOICES)
    location = models.CharField(max_length=20, choices=LOCATION_CHOICES)
    
    # Container details
    arrival_date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    actual_delivery_date = models.DateField(null=True, blank=True)
    
    # Physical properties (calculated from items)
    total_weight = models.FloatField(null=True, blank=True, help_text="Total weight calculated from items")
    total_cbm = models.FloatField(null=True, blank=True, help_text="Total CBM calculated from items")
    total_items_count = models.IntegerField(default=0, help_text="Total number of items in container")
    
    # Rate information
    selected_rate_id = models.CharField(max_length=50, null=True, blank=True, help_text="Selected rate ID from rates system")
    rates = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="CBM/Weight rate amount")
    dollar_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Dollar rate amount")
    
    # Status and notes
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.container_id} - {self.get_container_type_display()} - {self.location}"
    
    def save(self, *args, **kwargs):
        # Auto-generate container ID if not provided
        if not self.container_id:
            today = timezone.now().strftime('%Y%m%d')
            location_prefix = 'CHN' if self.location == 'china' else 'GHA'
            type_prefix = 'AIR' if self.container_type == 'air' else 'SEA'
            
            # Find next sequential number
            existing_count = GoodsReceivedContainer.objects.filter(
                container_id__startswith=f"GR{location_prefix}{type_prefix}{today}"
            ).count()
            
            self.container_id = f"GR{location_prefix}{type_prefix}{today}{existing_count + 1:04d}"
            
        super().save(*args, **kwargs)
    
    def update_totals(self):
        """Update total weight, CBM and item count from related items."""
        items = self.goods_items.all()
        
        self.total_weight = sum(item.weight or 0 for item in items)
        self.total_cbm = sum(item.cbm or 0 for item in items)
        self.total_items_count = items.count()
        
        self.save(update_fields=['total_weight', 'total_cbm', 'total_items_count'])


class GoodsReceivedItem(models.Model):
    """Individual items within a goods received container, grouped by shipping mark."""
    
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("READY_FOR_DELIVERY", "Ready for Delivery"),
        ("FLAGGED", "Flagged"),
        ("DELIVERED", "Delivered"),
        ("CANCELLED", "Cancelled"),
    ]
    
    # Core identifiers
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    container = models.ForeignKey(GoodsReceivedContainer, on_delete=models.CASCADE, related_name='goods_items')
    
    # Customer and tracking info
    customer = models.ForeignKey(
        "users.CustomerUser",
        on_delete=models.CASCADE,
        related_name="goods_received_items",
        help_text="Customer who owns this item",
        null=True,
        blank=True,
    )
    shipping_mark = models.CharField(
        max_length=20,
        help_text="Customer's shipping mark identifier",
        db_index=True,
    )
    supply_tracking = models.CharField(max_length=50, help_text="Supplier's tracking number")
    
    # Item details
    description = models.TextField(blank=True, null=True)
    quantity = models.PositiveIntegerField(help_text="Number of items/pieces")
    
    # Physical properties
    weight = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Weight in kilograms",
        null=True, blank=True,
    )
    cbm = models.DecimalField(
        max_digits=10, decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Cubic meters (CBM)",
        null=True, blank=True,
    )
    
    # Dimensions for auto-calculation
    length = models.FloatField(null=True, blank=True, help_text="Length in centimeters")
    breadth = models.FloatField(null=True, blank=True, help_text="Breadth/Width in centimeters")  
    height = models.FloatField(null=True, blank=True, help_text="Height in centimeters")
    
    # Business fields
    estimated_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    supplier_name = models.CharField(max_length=100, blank=True, null=True)
    location = models.CharField(max_length=50, blank=True, null=True, help_text="Storage location within warehouse")
    
    # Status and dates
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default="PENDING")
    date_received = models.DateTimeField(auto_now_add=True)
    delivery_date = models.DateField(null=True, blank=True)
    
    # Notes
    notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['shipping_mark']),
            models.Index(fields=['supply_tracking']),
            models.Index(fields=['container', 'shipping_mark']),
        ]
    
    def __str__(self):
        return f"{self.shipping_mark} - {self.supply_tracking} in {self.container.container_id}"
    
    def save(self, *args, **kwargs):
        # Auto-sync shipping mark from customer
        if self.customer and not self.shipping_mark:
            self.shipping_mark = self.customer.shipping_mark
            
        # Auto-calculate CBM if dimensions are provided
        if (self.container.container_type == 'sea' and 
            self.length and self.breadth and self.height and self.quantity):
            # CBM = (length * breadth * height * quantity) / 1,000,000
            # Convert all values to Decimal to avoid type mixing
            length_decimal = Decimal(str(self.length))
            breadth_decimal = Decimal(str(self.breadth))
            height_decimal = Decimal(str(self.height))
            quantity_decimal = Decimal(str(self.quantity))
            self.cbm = (length_decimal * breadth_decimal * height_decimal * quantity_decimal) / Decimal('1000000')
            
        super().save(*args, **kwargs)
        
        # Update container totals
        self.container.update_totals()
    
    def delete(self, *args, **kwargs):
        container = self.container
        super().delete(*args, **kwargs)
        # Update container totals after deletion
        container.update_totals()
    
    @property
    def is_flagged(self):
        """Returns True if status is FLAGGED."""
        return self.status == "FLAGGED"
    
    @property
    def days_in_warehouse(self):
        """Returns the number of days item has been in warehouse."""
        return (timezone.now() - self.date_received).days
