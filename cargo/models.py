from django.db import models
from django.utils import timezone
from django.conf import settings
import uuid


class CargoContainer(models.Model):
    CARGO_TYPE_CHOICES = (
        ('sea', 'Sea Cargo'),
        ('air', 'Air Cargo'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('demurrage', 'Demurrage'),
    )

    container_id = models.CharField(max_length=100, unique=True, primary_key=True)
    cargo_type = models.CharField(max_length=10, choices=CARGO_TYPE_CHOICES)
    weight = models.FloatField(null=True, blank=True)
    cbm = models.FloatField(null=True, blank=True)
    load_date = models.DateField()
    eta = models.DateField()
    unloading_date = models.DateField(null=True, blank=True)
    route = models.CharField(max_length=255)
    rates = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stay_days = models.IntegerField(default=0)
    delay_days = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['container_id'], name='unique_container_id')
        ]

    def __str__(self):
        return f"{self.container_id} - {self.get_cargo_type_display()} - {self.get_status_display()}"

    @property
    def is_demurrage(self):
        """Returns True if stay_days > 7 (demurrage)."""
        return self.stay_days > 7

    @property
    def total_cargo_items(self):
        """Returns the total number of cargo items in this container."""
        return self.cargo_items.count()

    @property
    def total_clients(self):
        """Returns the number of unique clients in this container."""
        return self.cargo_items.values('client').distinct().count()

    def calculate_total_cbm(self):
        """Calculate total CBM from all cargo items in this container."""
        if self.cargo_type == 'sea':
            total = self.cargo_items.filter(cbm__isnull=False).aggregate(
                total_cbm=models.Sum('cbm')
            )['total_cbm']
            return total or 0
        return 0
    
    def calculate_total_weight(self):
        """Calculate total weight from all cargo items in this container."""
        if self.cargo_type == 'air':
            total = self.cargo_items.filter(weight__isnull=False).aggregate(
                total_weight=models.Sum('weight')
            )['total_weight']
            return total or 0
        return 0
    
    def update_total_cbm(self):
        """Update the container's CBM field with calculated total from cargo items."""
        if self.cargo_type == 'sea':
            self.cbm = self.calculate_total_cbm()
            self.save(update_fields=['cbm'])


class CargoItem(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('delayed', 'Delayed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    container = models.ForeignKey(CargoContainer, on_delete=models.CASCADE, related_name='cargo_items')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cargo_items')
    tracking_id = models.CharField(max_length=100, unique=True, editable=True)
    item_description = models.TextField()
    quantity = models.IntegerField()
    weight = models.FloatField(null=True, blank=True)
    cbm = models.FloatField(null=True, blank=True)
    unit_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    delivered_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['container', 'client', 'tracking_id'], name='unique_container_client_tracking')
        ]

    def save(self, *args, **kwargs):
        """Custom save logic with atomic transaction for concurrency safety."""
        from django.db import transaction
        with transaction.atomic():
            if not self.tracking_id or not self.tracking_id.strip():
                today = timezone.now().strftime('%Y%m%d')
                client_mark = self.client.shipping_mark if self.client and self.client.shipping_mark else 'NOCLIENT'
                count = CargoItem.objects.filter(
                    client=self.client,
                    created_at__date=timezone.now().date()
                ).count() + 1
                self.tracking_id = f"{self.container.container_id}_{client_mark}_{today}_{count:04d}"
            super().save(*args, **kwargs)
            
            # Update container's total CBM if this is a sea cargo item
            if self.container.cargo_type == 'sea':
                self.container.update_total_cbm()

    def delete(self, *args, **kwargs):
        """Custom delete to update container CBM after deletion."""
        container = self.container
        super().delete(*args, **kwargs)
        # Update container's total CBM after deletion
        if container.cargo_type == 'sea':
            container.update_total_cbm()

    def __str__(self):
        return f"{self.tracking_id} - {self.item_description[:50]}"


class ClientShipmentSummary(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('partially_delivered', 'Partially Delivered'),
        ('delivered', 'Delivered'),
    )

    container = models.ForeignKey(CargoContainer, on_delete=models.CASCADE)
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    client_shipping_mark = models.CharField(max_length=20)  # denormalized for grouping
    assigned_tracking = models.CharField(max_length=100, unique=True, editable=False)
    total_cbm = models.FloatField(default=0)
    total_quantity = models.IntegerField(default=0)
    total_packages = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['container', 'client_shipping_mark'], name='unique_container_client_summary')
        ]

    def save(self, *args, **kwargs):
        """Custom save logic with atomic transaction for concurrency safety."""
        from django.db import transaction
        with transaction.atomic():
            if self.client and self.client.shipping_mark:
                self.client_shipping_mark = self.client.shipping_mark
            if not self.assigned_tracking:
                today = timezone.now().strftime('%Y%m%d')
                self.assigned_tracking = f"CONS_{self.container.container_id}_{self.client_shipping_mark}_{today}"
            super().save(*args, **kwargs)

    def update_totals(self):
        """Update totals and status for this summary. Uses atomic transaction for safety."""
        from django.db import transaction
        with transaction.atomic():
            items = CargoItem.objects.filter(container=self.container, client=self.client)
            self.total_cbm = sum(item.cbm or 0 for item in items)
            self.total_quantity = sum(item.quantity for item in items)
            self.total_packages = sum(item.quantity for item in items)

            if not items.exists():
                self.status = 'pending'
            elif all(item.status == 'delivered' for item in items):
                self.status = 'delivered'
            elif any(item.status == 'delivered' for item in items):
                self.status = 'partially_delivered'
            elif any(item.status == 'in_transit' for item in items):
                self.status = 'in_transit'
            else:
                self.status = 'pending'

            self.save()

    def __str__(self):
        return f"{self.assigned_tracking} - {self.client_shipping_mark}"
