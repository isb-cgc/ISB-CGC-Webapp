# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workbooks', '0004_auto_20160115_1211'),
    ]

    operations = [
        migrations.AddField(
            model_name='worksheet_plot',
            name='color_by',
            field=models.ForeignKey(related_name='worksheet_plot.color_by', blank=True, to='workbooks.Worksheet_variable', null=True),
            preserve_default=True,
        ),
    ]
