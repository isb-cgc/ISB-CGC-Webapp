# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('projects', b'__first__'),
        ('workbooks', '0003_auto_20160112_1034'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='worksheet_variable',
            name='project',
        ),
        migrations.RemoveField(
            model_name='worksheet_variable',
            name='study',
        ),
        migrations.AddField(
            model_name='worksheet_variable',
            name='feature',
            field=models.ForeignKey(blank=True, to='projects.User_Feature_Definitions', null=True),
            preserve_default=True,
        ),
    ]
