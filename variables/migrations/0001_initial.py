# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Variable',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.TextField()),
                ('code', models.CharField(max_length=2024)),
                ('feature', models.ForeignKey(on_delete=models.CASCADE, blank=True, to='projects.User_Feature_Definitions', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='VariableFavorite',
            fields=[
                ('id', models.AutoField(serialize=False, primary_key=True)),
                ('name', models.TextField(null=True)),
                ('active', models.BooleanField(default=True)),
                ('last_date_saved', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=models.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='VariableFavorite_Last_View',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('last_view', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=models.CASCADE, to=settings.AUTH_USER_MODEL)),
                ('variablefavorite', models.ForeignKey(on_delete=models.CASCADE, to='variables.VariableFavorite')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='variable',
            name='variable_favorite',
            field=models.ForeignKey(on_delete=models.CASCADE, to='variables.VariableFavorite'),
            preserve_default=True,
        ),
    ]
