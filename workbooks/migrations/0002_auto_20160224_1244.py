# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('workbooks', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Worksheet_plot_cohort',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('modified_date', models.DateTimeField(auto_now=True)),
                ('cohort', models.ForeignKey(on_delete=models.CASCADE, related_name='worksheet_plot.cohort', blank=True, to='workbooks.Worksheet_cohort', null=True)),
                ('plot', models.ForeignKey(on_delete=models.CASCADE, related_name='worksheet_plot', blank=True, to='workbooks.Worksheet_plot', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.RemoveField(
            model_name='worksheet_plot',
            name='cohort',
        ),
    ]
