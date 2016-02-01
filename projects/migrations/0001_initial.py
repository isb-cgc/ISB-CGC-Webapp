# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('data_upload', '0001_initial'),
        ('accounts', '0001_initial'),
        ('sharing', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=255, null=True)),
                ('description', models.TextField(null=True, blank=True)),
                ('active', models.BooleanField(default=True)),
                ('last_date_saved', models.DateTimeField(auto_now_add=True)),
                ('is_public', models.BooleanField(default=False)),
                ('owner', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
                ('shared', models.ManyToManyField(to='sharing.Shared_Resource')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Project_Last_View',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('last_view', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('project', models.ForeignKey(to='projects.Project')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Study',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(null=True, blank=True)),
                ('active', models.BooleanField(default=True)),
                ('last_date_saved', models.DateTimeField(auto_now_add=True)),
                ('extends', models.ForeignKey(blank=True, to='projects.Study', null=True)),
                ('owner', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
                ('project', models.ForeignKey(to='projects.Project')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Study_Last_View',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('last_view', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('study', models.ForeignKey(to='projects.Study')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='User_Data_Tables',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('metadata_data_table', models.CharField(max_length=200)),
                ('metadata_samples_table', models.CharField(max_length=200)),
                ('feature_definition_table', models.CharField(default='projects_user_feature_definitions', max_length=200)),
                ('data_upload', models.ForeignKey(blank=True, to='data_upload.UserUpload', null=True)),
                ('google_bucket', models.ForeignKey(to='accounts.Bucket')),
                ('google_project', models.ForeignKey(to='accounts.GoogleProject')),
                ('study', models.ForeignKey(to='projects.Study')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='User_Feature_Counts',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('value', models.TextField()),
                ('count', models.IntegerField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='User_Feature_Definitions',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('feature_name', models.CharField(max_length=200)),
                ('bq_map_id', models.CharField(max_length=200)),
                ('is_numeric', models.BooleanField(default=False)),
                ('shared_map_id', models.CharField(max_length=128, null=True, blank=True)),
                ('study', models.ForeignKey(to='projects.Study')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='user_feature_counts',
            name='feature',
            field=models.ForeignKey(to='projects.User_Feature_Definitions'),
            preserve_default=True,
        ),
    ]
