from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator

class DailyUpdate(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'), 
        ('high', 'High'),
    ]

    title = models.CharField(max_length=200, help_text="Brief title for the daily update")
    content = models.TextField(
        validators=[MaxLengthValidator(20000)],
        help_text="Detailed content of the update (max 20,000 characters)"
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text="Priority level of the update"
    )
    
    # Document attachments
    attachment = models.FileField(
        upload_to='daily_updates/attachments/%Y/%m/',
        null=True,
        blank=True,
        help_text="Attach a document file (PDF, Excel, Word, etc.)"
    )
    attachment_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="Display name for the attachment"
    )
    attachment_size = models.IntegerField(
        null=True,
        blank=True,
        help_text="File size in bytes"
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
    
    def save(self, *args, **kwargs):
        """Override save to handle attachment metadata"""
        if self.attachment:
            # Auto-populate attachment_name if not provided
            if not self.attachment_name:
                self.attachment_name = self.attachment.name.split('/')[-1]
            
            # Auto-populate attachment_size
            if self.attachment.file:
                self.attachment_size = self.attachment.file.size
        
        super().save(*args, **kwargs)
    
    @property
    def attachment_file_extension(self):
        """Get the file extension of the attachment"""
        if self.attachment:
            return self.attachment.name.split('.')[-1].lower()
        return None
    
    @property
    def attachment_size_display(self):
        """Human-readable file size"""
        if not self.attachment_size:
            return None
        
        # Convert bytes to human-readable format
        size = self.attachment_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"
