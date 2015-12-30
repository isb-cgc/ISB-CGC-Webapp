# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('projects', '0013_project_shared'),
        ('cohorts', '__first__'),
    ]

    operations = [
        migrations.CreateModel(
            name='Workbook',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=2024)),
                ('description', models.CharField(max_length=2024)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('last_date_saved', models.DateTimeField(auto_now_add=True)),
                ('is_public', models.BooleanField(default=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Workbook_Last_View',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('test', models.DateTimeField(auto_now_add=True, null=True)),
                ('last_view', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
                ('workbook', models.ForeignKey(to='workbooks.Workbook')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Workbook_Perms',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('perm', models.CharField(default=b'READER', max_length=10, choices=[(b'READER', b'Reader'), (b'OWNER', b'Owner')])),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL, blank=True)),
                ('workbook', models.ForeignKey(to='workbooks.Workbook')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Worksheet',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=2024)),
                ('description', models.CharField(max_length=2024)),
                ('last_date_saved', models.DateTimeField(auto_now_add=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Worksheet_cohort',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('modified_date', models.DateTimeField(auto_now=True)),
                ('cohort', models.ForeignKey(to='cohorts.Cohort')),
                ('worksheet', models.ForeignKey(to='workbooks.Worksheet')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Worksheet_comment',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('modified_date', models.DateTimeField(auto_now=True)),
                ('content', models.CharField(max_length=2024)),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
                ('worksheet', models.ForeignKey(to='workbooks.Worksheet')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Worksheet_gene',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('modified_date', models.DateTimeField(auto_now=True)),
                ('gene', models.CharField(max_length=2024)),
                ('worksheet', models.ForeignKey(to='workbooks.Worksheet')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Worksheet_plot',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('modified_date', models.DateTimeField(auto_now=True)),
                ('title', models.CharField(max_length=100)),
                ('color_by', models.CharField(max_length=1024, null=True)),
                ('type', models.CharField(max_length=1024, null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Worksheet_variable',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('modified_date', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=2024)),
                ('url_code', models.CharField(max_length=2024)),
                ('project', models.ForeignKey(blank=True, to='projects.Project', null=True)),
                ('study', models.ForeignKey(blank=True, to='projects.Study', null=True)),
                ('worksheet', models.ForeignKey(to='workbooks.Worksheet')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='x_axis',
            field=models.ForeignKey(related_name='worksheet_plot.x_axis', blank=True, to='workbooks.Worksheet_variable', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='y_axis',
            field=models.ForeignKey(related_name='worksheet_plot.y_axis', blank=True, to='workbooks.Worksheet_variable', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet',
            name='plot',
            field=models.ForeignKey(blank=True, to='workbooks.Worksheet_plot', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet',
            name='workbook',
            field=models.ForeignKey(to='workbooks.Workbook'),
            preserve_default=True,
        ),
    ]
