# -*- coding: utf-8 -*-
# Generated by Django 1.9.6 on 2017-04-28 23:30
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('genes', '0002_auto_20160614_1131'),
    ]

    operations = [
        migrations.AddField(
            model_name='genesymbol',
            name='type',
            field=models.CharField(max_length=16, null=True),
        ),
    ]
