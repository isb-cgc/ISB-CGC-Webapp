# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workbooks', '0002_auto_20151230_1040'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='worksheet',
            name='plot',
        ),
        migrations.RemoveField(
            model_name='worksheet_plot',
            name='title',
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='active',
            field=models.BooleanField(default=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='cohort',
            field=models.ForeignKey(related_name='worksheet_plot.cohort', blank=True, to='workbooks.Worksheet_cohort', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='worksheet',
            field=models.ForeignKey(to='workbooks.Worksheet', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet_variable',
            name='type',
            field=models.CharField(max_length=1024, null=True, blank=True),
            preserve_default=True,
        ),
    ]
