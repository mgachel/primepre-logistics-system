from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid


class Shipments(models.Model):
    """
    Unified Shipment record for client view.
    Populated automatically from GoodsReceivedChina/Ghana and Cargo.
    """

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("in_transit", "In Transit"),
        ("delivered", "Delivered"),
        ("demurrage", "Demurrage"),
    )

    SHIPPING_METHOD_CHOICES = (
        ("air", "Air"),
        ("sea", "Sea"),
    )

    # Links to backend modules
    goods_received_china = models.OneToOneField(
        "GoodsRecieved.GoodsReceivedChina",
        on_delete=models.SET_NULL,
        related_name="shipment_china",
        null=True,
        blank=True,
    )
    goods_received_ghana = models.OneToOneField(
        "GoodsRecieved.GoodsReceivedGhana",
        on_delete=models.SET_NULL,
        related_name="shipment_ghana",
        null=True,
        blank=True,
    )
    cargo_item = models.OneToOneField(
        "cargo.CargoItem",
        on_delete=models.SET_NULL,
        related_name="shipment",
        null=True,
        blank=True,
    )

    # Identifiers
    item_id = models.CharField(max_length=50, unique=True, editable=False)
    shipping_mark = models.CharField(max_length=50)
    supply_tracking = models.CharField(max_length=100, unique=True)

    # Physical attributes
    cbm = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Cubic meters (CBM)",
        null=True,
        blank=True,
    )
    weight = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Weight in kilograms",
        null=True,
        blank=True,
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text="Number of items/pieces",
    )

    # Status + logistics
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
        db_index=True,
    )
    method_of_shipping = models.CharField(
        max_length=20,
        choices=SHIPPING_METHOD_CHOICES,
        default="sea",
        help_text="Method of shipping",
    )

    # Dates
    date_received = models.DateTimeField(
        help_text="When goods were received in China warehouse"
    )
    date_shipped = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When goods left China",
    )
    date_delivered = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When goods were received in Ghana",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Shipment"
        verbose_name_plural = "Shipments"
        ordering = ["-date_received"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["shipping_mark"]),
            models.Index(fields=["supply_tracking"]),
        ]

    def __str__(self):
        return f"{self.shipping_mark} - {self.supply_tracking} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.item_id:
            timestamp = int(timezone.now().timestamp())
            unique_suffix = str(uuid.uuid4())[:8].upper()
            self.item_id = f"SHP{timestamp}{unique_suffix}"
        super().save(*args, **kwargs)

    # Helpers
    @property
    def days_in_warehouse(self):
        """How long goods stayed in China before shipping."""
        return (timezone.now() - self.date_received).days if self.date_received else None

    def mark_in_transit(self):
        self.status = "in_transit"
        self.date_shipped = timezone.now()
        self.save(update_fields=["status", "date_shipped", "updated_at"])

    def mark_delivered(self):
        self.status = "delivered"
        self.date_delivered = timezone.now()
        self.save(update_fields=["status", "date_delivered", "updated_at"])

    def mark_demurrage(self):
        self.status = "demurrage"
        self.save(update_fields=["status", "updated_at"])
