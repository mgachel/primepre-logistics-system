from django.apps import AppConfig


class SettingsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'settings'
    verbose_name = 'System Settings'
    
    def ready(self):
        """Initialize settings when Django starts"""
        # Import signals if needed
        pass