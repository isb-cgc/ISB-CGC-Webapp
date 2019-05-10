# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notebook',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=2024)),
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
                # ('perm', models.CharField(default=b'READER', max_length=10,
                #                           choices=[(b'READER', b'Reader'), (b'OWNER', b'Owner')])),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL, blank=True)),

            ],
            options={
            },
            bases=(models.Model,),
        ),


        # migrations.CreateModel(
        #     name='Notebook_Last_View',
        #     fields=[
        #         ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
        #         ('notebook', models.ForeignKey(to='notebooks.Notebook')),
        #         ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
        #         ('test', models.DateTimeField(auto_now_add=True, null=True)),
        #         ('last_view', models.DateTimeField(auto_now=True, auto_now_add=True)),
        #     ],
        #     options={
        #     },
        #     bases=(models.Model,),
        # ),
    ]
