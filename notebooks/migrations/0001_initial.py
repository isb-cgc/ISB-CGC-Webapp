# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Notebook',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=2024, null=False)),
                ('file_path', models.CharField(max_length=1024, null=False)),
                ('description', models.CharField(max_length=2024)),
                ('keywords', models.CharField(max_length=2024)),
                ('date_created', models.DateTimeField(auto_now_add=True)),
                ('last_date_saved', models.DateTimeField(auto_now_add=True)),
                ('active', models.BooleanField(default=True)),
                ('is_public', models.BooleanField(default=False)),
                ('owner', models.ForeignKey(to=settings.AUTH_USER_MODEL))
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Notebook_Added',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('notebook', models.ForeignKey(to='notebooks.Notebook')),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL, blank=True)),

            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Instance',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=2024, null=False)),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
                ('vm_username', models.CharField(max_length=20, null=False)),
                ('gcp', models.ForeignKey(to='accounts.GoogleProject')),
                ('zone', models.CharField(max_length=20, null=False)),
                ('active', models.BooleanField(default=True))
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
