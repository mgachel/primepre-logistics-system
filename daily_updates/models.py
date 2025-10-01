from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError

class DailyUpdate(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'), 
        ('high', 'High'),
    ]

    title = models.CharField(max_length=200, help_text="Brief title for the daily update")
    content = models.TextField(help_text="Detailed content of the update")
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text="Priority level of the update"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this update should expire (optional)"
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Daily Update"
        verbose_name_plural = "Daily Updates"

    def __str__(self):
        return f"{self.title} ({self.get_priority_display()})"

    def clean(self):
        """Validate model data"""
        super().clean()
        if self.expires_at and self.expires_at <= timezone.now():
            raise ValidationError({
                'expires_at': 'Expiration date must be in the future.'
            })
        
        if self.title and len(self.title.strip()) < 3:
            raise ValidationError({
                'title': 'Title must be at least 3 characters long.'
            })

    @property
    def is_expired(self):
        """Check if the update has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at

    @property
    def days_until_expiry(self):
        """Calculate days until expiry"""
        if not self.expires_at:
            return None
        delta = self.expires_at - timezone.now()
        return delta.days if delta.days > 0 else 0
