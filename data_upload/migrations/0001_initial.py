# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import data_upload.models
from django.conf import settings
import google_helpers.cloud_file_storage


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ControlledFileField',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=120)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='FieldDataType',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=120)),
                ('dbString', models.CharField(max_length=64)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='FileDataType',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.CharField(max_length=200)),
                ('fields', models.ManyToManyField(to='data_upload.ControlledFileField')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='UserUpload',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('status', models.CharField(default=b'Pending', max_length=50)),
                ('jobURL', models.CharField(max_length=250, null=True)),
                ('key', models.CharField(default=data_upload.models.generate_upload_key, max_length=64)),
                ('owner', models.ForeignKey(to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='UserUploadedFile',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('bucket', models.CharField(max_length=155, null=True)),
                ('file', models.FileField(storage=google_helpers.cloud_file_storage.CloudFileStorage(), upload_to=data_upload.models.get_user_bucket)),
                ('upload', models.ForeignKey(to='data_upload.UserUpload')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='controlledfilefield',
            name='type',
            field=models.ForeignKey(to='data_upload.FieldDataType'),
            preserve_default=True,
        ),
    ]
