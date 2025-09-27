from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal


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
        max_length=20,
        help_text="Customer's shipping mark identifier (auto-synced from user)",
        db_index=True,
        blank=True,
        null=True,
    )

    supply_tracking = models.CharField(max_length=50, unique=True, help_text="Supplier's tracking number")

    # Physical properties
    cbm = models.DecimalField(
        max_digits=10, decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
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
        max_digits=10, 
        decimal_places=3, 
        validators=[MinValueValidator(Decimal("0.001"))],
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
            self.cbm = (self.length * self.breadth * self.height * self.quantity) / Decimal('1000000')
        
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
