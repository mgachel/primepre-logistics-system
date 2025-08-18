from django.conf import settings
from django.db import models

class Note(models.Model):
    # Owner field binds notes to a specific user for per-user isolation 
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes",
        db_index=True, 
    )
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True)  
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]  # newest first in lists
        indexes = [
            models.Index(fields=["owner", "-updated_at"]),
        ]
        verbose_name = "Note"
        verbose_name_plural = "Notes"

    def __str__(self):
        return f"{self.title[:50]}{'…' if len(self.title) > 50 else ''}"
