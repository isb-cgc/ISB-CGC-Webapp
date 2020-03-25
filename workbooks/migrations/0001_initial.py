# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('sharing', '0001_initial'),
        ('cohorts', '0001_initial'),
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
                ('active', models.BooleanField(default=True)),
                ('is_public', models.BooleanField(default=False)),
                ('owner', models.ForeignKey(on_delete=models.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('shared', models.ManyToManyField(to='sharing.Shared_Resource')),
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
                ('user', models.ForeignKey(on_delete=models.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('workbook', models.ForeignKey(on_delete=models.CASCADE, to='workbooks.Workbook')),
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
                ('user', models.ForeignKey(on_delete=models.CASCADE, to=settings.AUTH_USER_MODEL, blank=True)),
                ('workbook', models.ForeignKey(on_delete=models.CASCADE, to='workbooks.Workbook')),
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
                ('workbook', models.ForeignKey(on_delete=models.CASCADE, to='workbooks.Workbook')),
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
                ('cohort', models.ForeignKey(on_delete=models.CASCADE, to='cohorts.Cohort')),
                ('worksheet', models.ForeignKey(on_delete=models.CASCADE, to='workbooks.Worksheet')),
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
                ('user', models.ForeignKey(on_delete=models.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('worksheet', models.ForeignKey(on_delete=models.CASCADE, to='workbooks.Worksheet')),
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
                ('worksheet', models.ForeignKey(on_delete=models.CASCADE, to='workbooks.Worksheet')),
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
                ('type', models.CharField(max_length=1024, null=True)),
                ('active', models.BooleanField(default=True)),
                ('cohort', models.ForeignKey(on_delete=models.CASCADE, related_name='worksheet_plot.cohort', blank=True, to='workbooks.Worksheet_cohort', null=True)),
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
                ('type', models.CharField(max_length=1024, null=True, blank=True)),
                ('url_code', models.CharField(max_length=2024)),
                ('feature', models.ForeignKey(on_delete=models.CASCADE, blank=True, to='projects.User_Feature_Definitions', null=True)),
                ('worksheet', models.ForeignKey(on_delete=models.CASCADE, to='workbooks.Worksheet')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='color_by',
            field=models.ForeignKey(on_delete=models.CASCADE, related_name='worksheet_plot.color_by', blank=True, to='workbooks.Worksheet_variable', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='worksheet',
            field=models.ForeignKey(on_delete=models.CASCADE, to='workbooks.Worksheet', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='x_axis',
            field=models.ForeignKey(on_delete=models.CASCADE, related_name='worksheet_plot.x_axis', blank=True, to='workbooks.Worksheet_variable', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='worksheet_plot',
            name='y_axis',
            field=models.ForeignKey(on_delete=models.CASCADE, related_name='worksheet_plot.y_axis', blank=True, to='workbooks.Worksheet_variable', null=True),
            preserve_default=True,
        ),
    ]
