# -*- coding: utf-8 -*-
# Generated by Django 1.9.6 on 2017-05-05 19:19
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('variables', '0003_auto_20160614_1131'),
    ]

    operations = [
        migrations.AddField(
            model_name='variablefavorite',
            name='version',
            field=models.CharField(max_length=5, null=True),
        ),
    ]
