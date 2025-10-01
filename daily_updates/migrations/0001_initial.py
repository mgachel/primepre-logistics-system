# Generated manually for daily_updates
# Dependencies: []

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='DailyUpdate',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(help_text='Brief title for the daily update', max_length=200)),
                ('content', models.TextField(help_text='Detailed content of the update')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('priority', models.CharField(choices=[('low', 'Low'), ('medium', 'Medium'), ('high', 'High')], default='medium', help_text='Priority level of the update', max_length=10)),
                ('expires_at', models.DateTimeField(blank=True, help_text='When this update should expire (optional)', null=True)),
            ],
            options={
                'verbose_name': 'Daily Update',
                'verbose_name_plural': 'Daily Updates',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='dailyupdate',
            index=models.Index(fields=['priority', '-created_at'], name='daily_updat_priorit_a7b4e3_idx'),
        ),
        migrations.AddIndex(
            model_name='dailyupdate',
            index=models.Index(fields=['expires_at'], name='daily_updat_expires_e8b4d7_idx'),
        ),
        migrations.AddIndex(
            model_name='dailyupdate',
            index=models.Index(fields=['-created_at'], name='daily_updat_created_f9c5a8_idx'),
        ),
    ]