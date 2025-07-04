from django.db import models
from django.utils import timezone
from django.conf import settings
import uuid

# Create your models here.

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
    cbm = models.FloatField(null=True, blank=True)  # Cubic meters
    load_date = models.DateField()
    eta = models.DateField()  # Estimated Time of Arrival
    unloading_date = models.DateField(null=True, blank=True)
    route = models.CharField(max_length=255)  # e.g., "China to Ghana"
    rates = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stay_days = models.IntegerField(default=0)  # Days in port
    delay_days = models.IntegerField(default=0)  # Days delayed
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        
        return f"{self.container_id} - {self.get_cargo_type_display()} - {self.get_status_display()}"
    
    @property
    def is_demurrage(self):
        """Check if container is in demurrage based on stay days"""
        return self.stay_days > 7  # Assuming 7 days free time
    
    @property
    def total_cargo_items(self):
        """Total number of cargo items in this container"""
        return self.cargo_items.count()
    
    @property
    def total_clients(self):
        """Total number of unique clients (shipping marks) in this container"""
        return self.cargo_items.values('client').distinct().count()


class CargoItem(models.Model):
    """Individual cargo items within a container"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'), 
        ('delivered', 'Delivered'),
        ('delayed', 'Delayed'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    container = models.ForeignKey(CargoContainer, on_delete=models.CASCADE, related_name='cargo_items')
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cargo_items')
    tracking_id = models.CharField(max_length=100, unique=True, editable=False)  # Auto-generated
    
    # Item details
    item_description = models.TextField()
    quantity = models.IntegerField()
    weight = models.FloatField(null=True, blank=True)  # kg
    cbm = models.FloatField()  # Cubic meters
    unit_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    # Status and dates
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    delivered_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        
    def save(self, *args, **kwargs):
        if not self.tracking_id:
            # Generate tracking ID: CONT_MARK_YYYYMMDD_XXXX
            today = timezone.now().strftime('%Y%m%d')
            count = CargoItem.objects.filter(
                client=self.client,
                created_at__date=timezone.now().date()
            ).count() + 1
            self.tracking_id = f"{self.container_id}_{self.client.shipping_mark}_{today}_{count:04d}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tracking_id} - {self.item_description[:50]}"


class ClientShipmentSummary(models.Model):
    """Summary view for each client's shipment in a container"""
    container = models.ForeignKey(CargoContainer, on_delete=models.CASCADE)
    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    assigned_tracking = models.CharField(max_length=100, unique=True, editable=False)
    total_cbm = models.FloatField(default=0)
    total_quantity = models.IntegerField(default=0)
    total_packages = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['container', 'client']
        ordering = ['-created_at']
    
    def save(self, *args, **kwargs):
        if not self.assigned_tracking:
            # Generate tracking: CONT_MARK_CONSIGNMENT
            today = timezone.now().strftime('%Y%m%d')
            self.assigned_tracking = f"CONS_{self.container_id}_{self.client.shipping_mark}_{today}"
        super().save(*args, **kwargs)
    
    def update_totals(self):
        """Update totals based on related cargo items"""
        items = CargoItem.objects.filter(
            container=self.container,
            client=self.client
        )
        self.total_cbm = sum(item.cbm for item in items)
        self.total_quantity = sum(item.quantity for item in items)
        self.total_packages = sum(item.package_count for item in items)
        
        # Update status based on cargo items
        if all(item.status == 'delivered' for item in items):
            self.status = 'delivered'
        elif any(item.status == 'delivered' for item in items):
            self.status = 'partially_delivered'
        else:
            self.status = items.first().status if items.exists() else 'pending'
        
        self.save()

    def __str__(self):
        return f"{self.assigned_tracking} - {self.client.shipping_mark}"
