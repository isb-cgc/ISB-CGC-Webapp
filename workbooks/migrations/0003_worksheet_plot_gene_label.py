# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workbooks', '0002_auto_20160224_1244'),
    ]

    operations = [
        migrations.AddField(
            model_name='worksheet_plot',
            name='gene_label',
            field=models.CharField(max_length=1024, null=True),
            preserve_default=True,
        ),
    ]
