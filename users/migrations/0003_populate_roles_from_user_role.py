"""Populate `roles` field from existing `user_role` for backwards compatibility."""
from django.db import migrations


def populate_roles(apps, schema_editor):
    CustomerUser = apps.get_model('users', 'CustomerUser')
    for user in CustomerUser.objects.all():
        try:
            if not getattr(user, 'roles', None) or len(user.roles) == 0:
                user.roles = [getattr(user, 'user_role', 'CUSTOMER')]
                user.save(update_fields=['roles'])
        except Exception:
            # Best effort: skip users that can't be updated
            continue


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_alter_customeruser_options_and_more'),
    ]

    operations = [
        migrations.RunPython(populate_roles, reverse_code=migrations.RunPython.noop),
    ]
