# Generated by Django 3.2.20 on 2023-10-25 23:38

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('genes', '0004_auto_20230926_1417'),
    ]

    operations = [
        migrations.AddField(
            model_name='genesymbol',
            name='date_created',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
    ]
