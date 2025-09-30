# Generated migration for updating shipping mark formats

from django.db import migrations


def update_shipping_mark_formats(apps, schema_editor):
    """Update existing shipping mark format settings to use new format with spaces"""
    ShippingMarkFormatSettings = apps.get_model('settings', 'ShippingMarkFormatSettings')
    ShippingMarkFormattingRule = apps.get_model('settings', 'ShippingMarkFormattingRule')
    
    # Update format settings
    format_settings = ShippingMarkFormatSettings.objects.first()
    if format_settings:
        format_settings.default_format_template = "PM {name}"
        format_settings.save()
    
    # Update all formatting rules to use space format
    for rule in ShippingMarkFormattingRule.objects.all():
        if rule.format_template == "PM{prefix}{name}":
            rule.format_template = "PM{prefix} {name}"
            rule.save()


def reverse_shipping_mark_formats(apps, schema_editor):
    """Reverse the changes - remove spaces from format templates"""
    ShippingMarkFormatSettings = apps.get_model('settings', 'ShippingMarkFormatSettings')
    ShippingMarkFormattingRule = apps.get_model('settings', 'ShippingMarkFormattingRule')
    
    # Revert format settings
    format_settings = ShippingMarkFormatSettings.objects.first()
    if format_settings:
        format_settings.default_format_template = "PM{name}"
        format_settings.save()
    
    # Revert all formatting rules to original format
    for rule in ShippingMarkFormattingRule.objects.all():
        if rule.format_template == "PM{prefix} {name}":
            rule.format_template = "PM{prefix}{name}"
            rule.save()


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0004_dollarrate'),
    ]

    operations = [
        migrations.RunPython(
            update_shipping_mark_formats,
            reverse_shipping_mark_formats
        ),
    ]
