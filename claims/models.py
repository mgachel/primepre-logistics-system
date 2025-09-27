from django.db import models
from django.utils import timezone
from users.models import CustomerUser


class Claim(models.Model):
    """
    Model to store customer claims for lost or damaged items
    """
    # Link to the customer who submitted the claim
    customer = models.ForeignKey(
        CustomerUser, 
        on_delete=models.CASCADE, 
        related_name='claims',
        help_text="Customer who submitted this claim"
    )
    
    shipping_mark = models.CharField(
        max_length=50,
        help_text="Customer's shipping mark (copied from customer record)"
    )
    
    # Core claim information
    tracking_id = models.CharField(
        max_length=100, 
        help_text="Tracking ID or Tracking Number for the shipment"
    )
    item_name = models.CharField(
        max_length=200, 
        help_text="Name of the item being claimed"
    )
    item_description = models.TextField(
        help_text="Detailed description of the item and the issue"
    )
    
    # Status tracking
    STATUS_CHOICES = [
        ('PENDING', 'Pending Review'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('RESOLVED', 'Resolved'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text="Current status of the claim"
    )
    
    # Timestamps
    created_at = models.DateTimeField(
        default=timezone.now,
        help_text="When the claim was submitted"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When the claim was last updated"
    )
    
    # Admin notes (optional)
    admin_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Internal notes from admin review"
    )
    
    # Image attachments for claims
    image_1 = models.ImageField(
        upload_to='claims/images/',
        blank=True,
        null=True,
        help_text="First supporting image for the claim"
    )
    image_2 = models.ImageField(
        upload_to='claims/images/',
        blank=True,
        null=True,
        help_text="Second supporting image for the claim"
    )
    image_3 = models.ImageField(
        upload_to='claims/images/',
        blank=True,
        null=True,
        help_text="Third supporting image for the claim"
    )
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Claim"
        verbose_name_plural = "Claims"
        indexes = [
            models.Index(fields=['shipping_mark']),
            models.Index(fields=['tracking_id']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Claim #{self.id} - {self.item_name} by {self.shipping_mark}"
    
    def save(self, *args, **kwargs):
        # Auto-populate shipping_mark from customer
        if self.customer and not self.shipping_mark:
            self.shipping_mark = self.customer.shipping_mark
        super().save(*args, **kwargs)
    
    @property
    def customer_name(self):
        """Get customer's full name"""
        return self.customer.get_full_name() if self.customer else "Unknown"
    
    @property
    def days_since_submission(self):
        """Calculate days since claim was submitted"""
        return (timezone.now() - self.created_at).days
