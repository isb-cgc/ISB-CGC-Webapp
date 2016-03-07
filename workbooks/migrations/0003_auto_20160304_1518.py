# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workbooks', '0002_auto_20160224_1244'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='worksheet_plot',
            name='color_by',
        ),
        migrations.RemoveField(
            model_name='worksheet_plot',
            name='x_axis',
        ),
        migrations.RemoveField(
            model_name='worksheet_plot',
            name='y_axis',
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='settings_json',
            field=models.TextField(null=True, blank=True),
            preserve_default=True,
        ),
    ]
